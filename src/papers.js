/**
 * Local-first paper projects served on DSH's loopback WebServer.
 * No shell commands or user-controlled executable paths are accepted over HTTP.
 */
import { randomUUID, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { StringDecoder } from 'node:string_decoder';

const PREFIX = '/research-workbench/api';
const PROJECT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TEXT_TYPES = new Set(['.tex', '.bib', '.cls', '.sty', '.txt']);
const ASSET_TYPES = new Set(['.png', '.jpg', '.jpeg', '.pdf', '.svg', '.eps']);
const MAX_TEXT_BYTES = 2 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const MAX_JSON_BYTES = 3 * 1024 * 1024;
const MAX_FILES = 300;
const MAX_LOG_BYTES = 96_000;
const PDF_LIMIT = 40 * 1024 * 1024;

class PaperError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

const sha256 = data => createHash('sha256').update(data).digest('hex');
const bad = (status, code, message) => { throw new PaperError(status, code, message); };
function processIsAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; }
  catch (error) { return error.code === 'EPERM'; }
}

function isLoopback(host) {
  if (typeof host !== 'string') return false;
  const h = host.startsWith('[') ? host.slice(0, host.indexOf(']') + 1).toLowerCase() : host.split(':')[0]?.toLowerCase();
  return ['localhost', '127.0.0.1', '[::1]'].includes(h);
}
function loopbackPeer(peer) {
  if (typeof peer !== 'string') return false;
  const v = peer.toLowerCase().startsWith('::ffff:') ? peer.slice(7) : peer;
  if (v === '::1') return true;
  const octets = v.split('.');
  return octets.length === 4 && octets[0] === '127' && octets.every(x => /^\d{1,3}$/.test(x) && Number(x) <= 255);
}
/**
 * Require a local peer and the official DSH Connection's authenticated browser
 * session. In Desktop, Electron verifies `dsh-app://app`, then strips Origin
 * and attaches the Host's signed session cookie before proxying the request.
 * Requiring an Origin on every POST therefore breaks all Desktop writes.
 *
 * A missing Origin is accepted ONLY when the official Connection verifies the
 * signed cookie and its Host/Cross-Site gates. An explicit foreign/opaque
 * Origin is always refused, even with valid credentials. Without Connection,
 * fail closed rather than exposing local research files to arbitrary clients.
 */
export function authorized(req, write = false, connection) {
  if (!isLoopback(req.headers.host) || !loopbackPeer(req.socket?.remoteAddress)) return false;
  if (req.headers['sec-fetch-site'] === 'cross-site') return false;
  const origin = req.headers.origin;
  if (origin !== undefined) {
    if (typeof origin !== 'string') return false;
    try {
      const parsed = new URL(origin);
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.host !== req.headers.host) return false;
    } catch { return false; }
  }
  // `write` remains in this public signature for callers; both read and write
  // requests now require the same authenticated DSH browser principal.
  if (typeof connection?.requestRejection !== 'function') return false;
  try { return connection.requestRejection(req) === undefined; }
  catch { return false; }
}

function validateTitle(title) {
  if (typeof title !== 'string') bad(400, 'INVALID_TITLE', '请输入论文项目名称');
  const name = title.trim().replace(/\s+/g, ' ');
  if (!name || name.length > 120 || /[\x00-\x1f\x7f]/.test(name)) bad(400, 'INVALID_TITLE', '项目名称需要为 1–120 个字符');
  return name;
}

function validateFileName(input, asset = false) {
  if (typeof input !== 'string' || input.length > 220 || !input) bad(400, 'INVALID_PATH', '文件名无效');
  const parts = input.replace(/\\/g, '/').split('/');
  if (parts.length > 4 || parts.some(s => !s || s === '.' || s === '..' || s.startsWith('.') || !/^[\p{L}\p{N}_ .()\-]+$/u.test(s) || s.trim() !== s)) {
    bad(400, 'INVALID_PATH', '请使用项目内相对路径（最多四层），不要包含特殊目录');
  }
  const ext = path.extname(parts.at(-1)).toLowerCase();
  if (!(asset ? (TEXT_TYPES.has(ext) || ASSET_TYPES.has(ext)) : TEXT_TYPES.has(ext))) {
    bad(400, 'INVALID_TYPE', asset ? '仅接受 LaTeX 源文件、图片或 PDF' : '只能编辑 tex、bib、cls、sty、txt 源文件');
  }
  if (parts.some(s => /[. ]$/.test(s) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(s))) {
    bad(400, 'INVALID_PATH', 'Windows 保留的文件名不能使用');
  }
  return parts.join('/');
}

function safeId(id) {
  if (!PROJECT_ID.test(id)) bad(400, 'INVALID_ID', '无效的论文项目 ID');
  return id;
}
async function assertNoSymlinks(root, absolute) {
  let rel = path.relative(root, absolute);
  if (rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) bad(400, 'INVALID_PATH', '路径不在项目目录内');
  let cursor = root;
  for (const part of rel.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    const st = await fs.lstat(cursor).catch(e => e.code === 'ENOENT' ? null : Promise.reject(e));
    if (st?.isSymbolicLink()) bad(400, 'INVALID_PATH', '不允许访问符号链接');
  }
}
async function atomicWrite(destination, bytes) {
  const temp = `${destination}.${randomUUID()}.tmp`;
  await fs.mkdir(path.dirname(destination), { recursive: true });
  try { await fs.writeFile(temp, bytes, { flag: 'wx' }); await fs.rename(temp, destination); }
  finally { await fs.rm(temp, { force: true }); }
}
async function receive(req, limit) {
  const len = Number(req.headers['content-length']);
  if (Number.isFinite(len) && len > limit) bad(413, 'TOO_LARGE', '文件或请求内容超出大小限制');
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) bad(413, 'TOO_LARGE', '文件或请求内容超出大小限制');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
async function receiveJson(req) {
  let obj;
  try { obj = JSON.parse((await receive(req, MAX_JSON_BYTES)).toString('utf8')); }
  catch (e) { if (e instanceof PaperError) throw e; bad(400, 'INVALID_JSON', '请求 JSON 无效'); }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) bad(400, 'INVALID_JSON', '请求必须为 JSON 对象');
  return obj;
}
function sendJson(res, status, value) {
  const body = Buffer.from(JSON.stringify(value));
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'content-length': body.length });
  res.end(body);
}
const escapeTex = title => title.replace(/[\\{}%$&#_^~]/g, s => ({'\\':'\\textbackslash{}','{':'\\{','}':'\\}','%':'\\%','$':'\\$','&':'\\&','#':'\\#','_':'\\_','^':'\\textasciicircum{}','~':'\\textasciitilde{}'}[s]));
const template = title => `\\documentclass[11pt]{article}\n\\usepackage[margin=1in]{geometry}\n\\usepackage{amsmath,amssymb,graphicx}\n\\usepackage[hidelinks]{hyperref}\n\n\\title{${escapeTex(title)}}\n\\author{Author Name}\n\\date{}\n\n\\begin{document}\n\\maketitle\n\n\\begin{abstract}\nWrite your abstract here.\n\\end{abstract}\n\n\\section{Introduction}\nStart your research paper here.\n\n\\section{Method}\nDescribe your method.\n\n\\section{Experiments}\nReport verified results.\n\n\\section{Conclusion}\nSummarize your findings.\n\n% When you have BibTeX entries, uncomment the following lines:\n% \\bibliographystyle{plain}\n% \\bibliography{references}\n\\end{document}\n`;

async function walkFiles(root, base = root, depth = 0) {
  const out = [];
  if (depth > 4) return out;
  const entries = await fs.readdir(base, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') || (base === root && ['build', 'manifest.json'].includes(entry.name))) continue;
    const full = path.join(base, entry.name);
    if (entry.isDirectory() && depth < 3) out.push(...await walkFiles(root, full, depth + 1));
    else if (entry.isFile() && (TEXT_TYPES.has(path.extname(entry.name).toLowerCase()) || ASSET_TYPES.has(path.extname(entry.name).toLowerCase()))) {
      const stat = await fs.stat(full);
      out.push({ path: path.relative(root, full).split(path.sep).join('/'), bytes: stat.size, updatedAt: stat.mtime.toISOString(), editable: TEXT_TYPES.has(path.extname(entry.name).toLowerCase()) });
    }
    if (out.length > MAX_FILES) bad(413, 'TOO_MANY_FILES', '项目文件数量超出限制');
  }
  return out.sort((a, b) => a.path === 'main.tex' ? -1 : b.path === 'main.tex' ? 1 : a.path.localeCompare(b.path));
}

function runBinary(command, args, cwd, timeoutMs, logLimit = MAX_LOG_BYTES, options = {}) {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) return resolve({ code: null, log: '', cancelled: true });
    const child = spawn(command, args, { cwd, windowsHide: true, shell: false, env: { ...process.env, max_print_line: '1000' } });
    const decoders = [new StringDecoder('utf8'), new StringDecoder('utf8')];
    let log = '';
    let timer;
    let timedOut = false;
    let settled = false;
    function collect(chunk, decoder) {
      const text = decoder.write(chunk);
      log = (log + text).slice(-logLimit);
      options.onOutput?.(text);
    }
    function finish(err, code, signal) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', cancel);
      const remaining = decoders.map(decoder => decoder.end()).join('');
      log = (log + remaining).slice(-logLimit);
      if (remaining) options.onOutput?.(remaining);
      if (err) reject(err);
      else resolve({ code, signal, log, timedOut, cancelled: options.signal?.aborted === true });
    }
    function cancel() { child.kill('SIGKILL'); }
    options.signal?.addEventListener('abort', cancel, { once: true });
    child.stdout?.on('data', chunk => collect(chunk, decoders[0]));
    child.stderr?.on('data', chunk => collect(chunk, decoders[1]));
    child.once('error', e => finish(e));
    child.once('close', (code, signal) => finish(null, code, signal));
    timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeoutMs);
    timer.unref?.();
  });
}

export function createPaperService(options = {}) {
  const root = path.resolve(options.root || process.env.DSH_RWB_DATA_DIR || path.join(homedir(), '.dsh', 'research-workbench'));
  const projectsRoot = path.join(root, 'papers');
  const archivedRoot = path.join(root, 'archived');
  const activeCompiles = new Map();
  const instance = randomUUID();
  let sequencer = Promise.resolve();
  const locked = fn => {
    const p = sequencer.then(fn, fn);
    sequencer = p.catch(() => undefined);
    return p;
  };
  const projectRoot = id => path.join(projectsRoot, safeId(id));
  async function project(id) {
    const dir = projectRoot(id);
    const stat = await fs.lstat(dir).catch(e => e.code === 'ENOENT' ? null : Promise.reject(e));
    if (!stat || !stat.isDirectory() || stat.isSymbolicLink()) bad(404, 'NOT_FOUND', '论文项目不存在');
    const meta = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
    if (meta.id !== id) bad(500, 'BAD_MANIFEST', '项目文件元数据不一致');
    return { dir, meta };
  }
  async function updateProject(id, meta) {
    meta.updatedAt = new Date().toISOString();
    await atomicWrite(path.join(projectRoot(id), 'manifest.json'), JSON.stringify(meta, null, 2) + '\n');
  }
  async function list() {
    await fs.mkdir(projectsRoot, { recursive: true });
    const dirs = await fs.readdir(projectsRoot, { withFileTypes: true });
    const result = [];
    for (const entry of dirs) {
      if (!entry.isDirectory() || !PROJECT_ID.test(entry.name)) continue;
      try { result.push((await project(entry.name)).meta); } catch { /* A malformed project is not a valid list row. */ }
    }
    return result.sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async function create(title) {
    const name = validateTitle(title), id = randomUUID();
    const dir = projectRoot(id);
    await fs.mkdir(dir, { recursive: true });
    const time = new Date().toISOString();
    const meta = { id, title: name, createdAt: time, updatedAt: time, version: 1, lastCompile: null };
    await atomicWrite(path.join(dir, 'main.tex'), template(name));
    await atomicWrite(path.join(dir, 'references.bib'), '% Add BibTeX entries here.\n');
    await atomicWrite(path.join(dir, 'manifest.json'), JSON.stringify(meta, null, 2) + '\n');
    return meta;
  }
  async function details(id) {
    const { dir, meta } = await project(id);
    const files = await walkFiles(dir);
    const hasPdf = (await fs.stat(path.join(dir,'build','main.pdf')).catch(() => null))?.isFile() || false;
    return { project: meta, files, hasPdf, compile: await compileStatus(id) };
  }
  async function readSource(id, name) {
    const { dir } = await project(id);
    const file = validateFileName(name);
    const location = path.join(dir, ...file.split('/'));
    await assertNoSymlinks(dir, location);
    const buf = await fs.readFile(location).catch(e => e.code === 'ENOENT' ? bad(404, 'FILE_NOT_FOUND', '文件不存在') : Promise.reject(e));
    if (buf.length > MAX_TEXT_BYTES) bad(413, 'TOO_LARGE', '文件太大，无法在编辑器打开');
    return { path: file, content: buf.toString('utf8'), sha: sha256(buf) };
  }
  async function saveSource(id, name, content, expectedSha) {
    if (typeof content !== 'string' || Buffer.byteLength(content) > MAX_TEXT_BYTES) bad(413, 'TOO_LARGE', 'LaTeX 文件不能超过 2 MiB');
    if (expectedSha !== null && !(typeof expectedSha === 'string' && /^[a-f0-9]{64}$/i.test(expectedSha))) bad(400, 'INVALID_SHA', '缺少合法的文件版本');
    const { dir, meta } = await project(id), rel = validateFileName(name);
    const location = path.join(dir, ...rel.split('/'));
    await assertNoSymlinks(dir, location);
    const current = await fs.readFile(location).catch(e => e.code === 'ENOENT' ? null : Promise.reject(e));
    if ((current === null && expectedSha !== null) || (current !== null && sha256(current) !== expectedSha)) {
      bad(409, 'VERSION_CONFLICT', '文件已被其他操作修改，请重新打开后再保存');
    }
    const bytes = Buffer.from(content);
    await atomicWrite(location, bytes);
    await updateProject(id, meta);
    return { path: rel, sha: sha256(bytes), bytes: bytes.length };
  }
  async function upload(id, name, bytes) {
    const { dir, meta } = await project(id), rel = validateFileName(name, true);
    if (bytes.length > MAX_UPLOAD_BYTES) bad(413, 'TOO_LARGE', '单个导入文件不能超过 20 MiB');
    const location = path.join(dir, ...rel.split('/'));
    await assertNoSymlinks(dir, location);
    const exists = await fs.lstat(location).catch(e => e.code === 'ENOENT' ? null : Promise.reject(e));
    if (exists) bad(409, 'FILE_EXISTS', '同名文件已存在，请先重命名文件');
    if (TEXT_TYPES.has(path.extname(rel).toLowerCase()) && bytes.length > MAX_TEXT_BYTES) bad(413, 'TOO_LARGE', 'LaTeX 源文件不能超过 2 MiB');
    await atomicWrite(location, bytes);
    await updateProject(id, meta);
    return { path: rel, bytes: bytes.length };
  }
  async function rename(id, title) {
    const { meta } = await project(id);
    meta.title = validateTitle(title);
    await updateProject(id, meta);
    return meta;
  }
  async function archive(id) {
    if (activeCompiles.has(id)) bad(409, 'COMPILE_BUSY', '请先停止编译，再归档论文');
    const { dir } = await project(id);
    await fs.mkdir(archivedRoot, { recursive: true });
    await fs.rename(dir, path.join(archivedRoot, `${id}-${Date.now()}`));
    return { id, archived: true };
  }
  async function fileBytes(id, name) {
    const { dir } = await project(id), rel = validateFileName(name, true);
    const location = path.join(dir, ...rel.split('/'));
    await assertNoSymlinks(dir, location);
    const stat = await fs.stat(location).catch(e => e.code === 'ENOENT' ? null : Promise.reject(e));
    if (!stat?.isFile() || stat.size > MAX_UPLOAD_BYTES) bad(404, 'FILE_NOT_FOUND', '文件不存在或过大');
    return { data: await fs.readFile(location), filename: path.basename(location) };
  }
  function tectonicCommand() {
    if (options.tectonic) return options.tectonic;
    if (process.env.DSH_RWB_TECTONIC_PATH) return process.env.DSH_RWB_TECTONIC_PATH;
    // `tectonic` on PATH is the primary supported mechanism. Windows users
    // who unzip the official binary into C:\\Tools\\Tectonic can also use it.
    return process.platform === 'win32' ? ['tectonic', 'C:\\Tools\\Tectonic\\tectonic.exe'] : ['tectonic'];
  }
  async function probe() {
    for (const cmd of [].concat(tectonicCommand())) {
      try { const result = await runBinary(cmd, [...(options.tectonicArgs || []), '--version'], root, 2500, 600);
        if (result.code === 0 && /tectonic/i.test(result.log)) return { available: true, version: result.log.trim().slice(0, 140), command: cmd };
      } catch { /* try another trusted location */ }
    }
    return { available: false, version: null, command: null };
  }
  const compileFile = id => path.join(projectRoot(id), 'build', 'compile.json');
  function persistCompile(id, entry) {
    const bytes = JSON.stringify(entry.record, null, 2) + '\n';
    // Do not let a delayed progress write overwrite the final outcome.
    entry.writes = entry.writes.catch(() => {}).then(() => atomicWrite(compileFile(id), bytes));
    return entry.writes;
  }
  function appendLog(id, entry, text) {
    entry.record.log = (entry.record.log + text).slice(-MAX_LOG_BYTES);
    entry.record.updatedAt = new Date().toISOString();
    if (!entry.flushTimer) entry.flushTimer = setTimeout(() => {
      entry.flushTimer = undefined;
      void persistCompile(id, entry).catch(e => { entry.persistenceError = e; });
    }, 200);
  }
  async function compileStatus(id) {
    await project(id);
    const active = activeCompiles.get(id);
    if (active) {
      if (active.record.status !== 'running') await active.completion;
      return { ...active.record };
    }
    let record;
    try { record = JSON.parse(await fs.readFile(compileFile(id), 'utf8')); }
    catch (e) { if (e.code === 'ENOENT') return null; throw e; }
    if (record.status === 'running' && record.instance !== instance && !processIsAlive(record.processId)) {
      record.status = 'interrupted'; record.ok = false; record.code = 'COMPILE_INTERRUPTED';
      record.error = 'DSH 科研插件已重启，上次编译已中断，请重新编译。';
      record.finishedAt = new Date().toISOString();
      record.log = (record.log + '\n' + record.error).slice(-MAX_LOG_BYTES);
      await atomicWrite(compileFile(id), JSON.stringify(record, null, 2) + '\n');
      await atomicWrite(path.join(projectRoot(id), 'build', 'compiles', record.id + '.json'), JSON.stringify(record, null, 2) + '\n');
    }
    return record;
  }
  async function compileHistory(id, runId) {
    await project(id);
    const directory = path.join(projectRoot(id), 'build', 'compiles');
    if (runId) {
      safeId(runId);
      try { return JSON.parse(await fs.readFile(path.join(directory, runId + '.json'), 'utf8')); }
      catch (e) { if (e.code === 'ENOENT') bad(404, 'COMPILE_NOT_FOUND', '编译记录不存在'); throw e; }
    }
    const names = await fs.readdir(directory).catch(e => e.code === 'ENOENT' ? [] : Promise.reject(e));
    const records = await Promise.all(names.filter(name => PROJECT_ID.test(name.replace(/\.json$/, ''))).map(async name => {
      const { log, instance: owner, ...record } = JSON.parse(await fs.readFile(path.join(directory, name), 'utf8'));
      return record;
    }));
    return records.sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 20);
  }
  async function startCompile(id) {
    await project(id);
    if (activeCompiles.has(id)) bad(409, 'COMPILE_BUSY', '此论文正在编译中');
    const previous = await compileStatus(id);
    if (activeCompiles.has(id) || previous?.status === 'running') bad(409, 'COMPILE_BUSY', '此论文已在 DSH 中编译，请等待完成或在发起编译的窗口停止。');
    const time = new Date().toISOString();
    const entry = { controller: new AbortController(), writes: Promise.resolve(), record: {
      id: randomUUID(), instance, processId: process.pid, status: 'running', startedAt: time, updatedAt: time,
      finishedAt: null, engine: 'tectonic', ok: null, log: '正在检测 Tectonic…\n',
    } };
    activeCompiles.set(id, entry);
    const persisted = persistCompile(id, entry);
    entry.completion = persisted.then(() => executeCompile(id, entry));
    // A failed background job is a persisted result, never an unhandled rejection.
    void entry.completion.catch(e => { entry.persistenceError = e; });
    try { await persisted; }
    catch (e) { activeCompiles.delete(id); throw e; }
    return { ...entry.record };
  }
  async function executeCompile(id, entry) {
    let snapshot;
    try {
      if (entry.controller.signal.aborted) bad(409, 'COMPILE_CANCELLED', '编译已停止');
      const engine = await probe();
      if (entry.controller.signal.aborted) bad(409, 'COMPILE_CANCELLED', '编译已停止');
      if (!engine.available) bad(422, 'ENGINE_MISSING', '没有检测到 Tectonic。请安装并添加到 PATH，或将 tectonic.exe 放到 C:\\Tools\\Tectonic。');
      const { dir } = await project(id);
      const buildDir = path.join(dir, 'build');
      const tempDir = path.join(dir, '.compile', randomUUID());
      snapshot = tempDir;
      const input = path.join(tempDir, 'input');
      const output = path.join(tempDir, 'output');
      await fs.mkdir(input, { recursive: true });
      await fs.mkdir(output, { recursive: true });
      await locked(async () => {
        const files = await walkFiles(dir);
        if (!files.some(f => f.path === 'main.tex')) bad(422, 'NO_MAIN', '缺少 main.tex 文件');
        for (const file of files) {
          const source = path.join(dir, ...file.path.split('/'));
          await assertNoSymlinks(dir, source);
          const destination = path.join(input, ...file.path.split('/'));
          await fs.mkdir(path.dirname(destination), { recursive: true });
          await fs.copyFile(source, destination);
        }
      });
      appendLog(id, entry, '已启动 Tectonic；首次编译可能需要联网下载宏包。\n');
      const timeout = options.compileTimeoutMs ?? 600_000;
      const run = await runBinary(engine.command, [...(options.tectonicArgs || []), '--keep-logs', '--outdir', output, 'main.tex'], input, timeout, MAX_LOG_BYTES, {
        signal: entry.controller.signal, onOutput: text => appendLog(id, entry, text),
      });
      const engineLogFile = await fs.open(path.join(output, 'main.log'), 'r').catch(e => e.code === 'ENOENT' ? null : Promise.reject(e));
      if (engineLogFile) {
        try {
          const size = (await engineLogFile.stat()).size;
          const buffer = Buffer.alloc(Math.min(size, MAX_LOG_BYTES));
          const { bytesRead } = await engineLogFile.read(buffer, 0, buffer.length, Math.max(0, size - buffer.length));
          appendLog(id, entry, '\n--- Tectonic main.log ---\n' + buffer.subarray(0, bytesRead).toString('utf8'));
        } finally { await engineLogFile.close(); }
      }
      const produced = path.join(output, 'main.pdf');
      const pdf = await fs.stat(produced).catch(() => null);
      if (run.cancelled) bad(409, 'COMPILE_CANCELLED', '编译已停止');
      if (run.timedOut) bad(504, 'COMPILE_TIMEOUT', `编译超时（${Math.ceil(timeout / 1000)}秒）。首次宏包下载可能较慢，请检查日志与网络后重试。`);
      if (run.code !== 0 || !pdf?.isFile() || pdf.size > PDF_LIMIT) {
        const error = new PaperError(422, 'COMPILE_FAILED', 'LaTeX 编译失败，请检查日志与源文件');
        error.log = run.log;
        throw error;
      }
      await fs.mkdir(buildDir, { recursive: true });
      await atomicWrite(path.join(buildDir, 'main.pdf'), await fs.readFile(produced));
      const { meta } = await project(id);
      meta.lastCompile = { at: new Date().toISOString(), engine: 'tectonic', ok: true };
      await updateProject(id, meta);
      Object.assign(entry.record, { status: 'succeeded', ok: true, compiledAt: meta.lastCompile.at });
    } catch (error) {
      Object.assign(entry.record, {
        status: error.code === 'COMPILE_CANCELLED' ? 'cancelled' : 'failed', ok: false,
        code: error instanceof PaperError ? error.code : 'COMPILE_ERROR',
        error: error instanceof PaperError ? error.message : '无法运行编译器，请查看日志后重试。',
      });
      appendLog(id, entry, '\n' + (error.message || String(error)) + '\n');
    } finally {
      clearTimeout(entry.flushTimer);
      entry.flushTimer = undefined;
      entry.record.finishedAt = new Date().toISOString();
      entry.record.updatedAt = entry.record.finishedAt;
      try {
        await persistCompile(id, entry);
        await atomicWrite(path.join(projectRoot(id), 'build', 'compiles', entry.record.id + '.json'), JSON.stringify(entry.record, null, 2) + '\n');
      } finally {
        try { if (snapshot) await fs.rm(snapshot, { recursive: true, force: true }); }
        finally { activeCompiles.delete(id); }
      }
    }
    return { ...entry.record };
  }
  async function cancelCompile(id) {
    await project(id);
    const entry = activeCompiles.get(id);
    if (!entry) {
      const record = await compileStatus(id);
      if (record?.status === 'running') bad(409, 'COMPILE_OTHER_HOST', '请在发起这次编译的 DSH 窗口停止编译。');
      return record;
    }
    appendLog(id, entry, '\n正在停止编译…\n');
    entry.controller.abort();
    return entry.completion;
  }
  async function compile(id) {
    await startCompile(id);
    const entry = activeCompiles.get(id);
    const result = entry ? await entry.completion : await compileStatus(id);
    if (!result.ok) {
      const error = new PaperError(422, result.code, result.error);
      error.log = result.log;
      throw error;
    }
    return { ...result, hasPdf: true };
  }
  async function dispose() {
    const entries = [...activeCompiles.values()];
    for (const entry of entries) entry.controller.abort();
    await Promise.allSettled(entries.map(entry => entry.completion));
  }
  async function pdf(id) {
    const { dir } = await project(id);
    const target = path.join(dir, 'build', 'main.pdf');
    await assertNoSymlinks(dir, target);
    const stat = await fs.stat(target).catch(() => null);
    if (!stat?.isFile() || stat.size > PDF_LIMIT) bad(404, 'PDF_NOT_FOUND', '尚未编译生成 PDF');
    return await fs.readFile(target);
  }

  async function handle(req, res) {
    const start = req.url?.split('?')[0] || '';
    if (!start.startsWith(PREFIX)) return sendJson(res, 404, { ok: false, error: 'NOT_FOUND' });
    const write = !['GET', 'HEAD'].includes(req.method);
    if (!authorized(req, write, options.connection)) return sendJson(res, 403, { ok: false, code: 'FORBIDDEN', error: '只允许在本机 DSH 界面中访问科研资料' });
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      const rest = url.pathname.slice(PREFIX.length);
      if (rest === '/health' && req.method === 'GET') {
        await fs.mkdir(root, { recursive: true });
        return sendJson(res, 200, { ok: true, version: '0.3.1', tectonic: await probe(), dataDir: root });
      }
      if (rest === '/papers') {
        if (req.method === 'GET') return sendJson(res, 200, { ok: true, projects: await list() });
        if (req.method === 'POST') return sendJson(res, 201, { ok: true, project: await locked(async () => create((await receiveJson(req)).title)) });
      }
      const match = rest.match(/^\/papers\/([^/]+)(?:\/(.*))?$/);
      if (match) {
        const id = safeId(match[1]), operation = match[2] || '';
        if (!operation) {
          if (req.method === 'GET') return sendJson(res, 200, { ok: true, ...await details(id) });
          if (req.method === 'PATCH') return sendJson(res, 200, { ok: true, project: await locked(async () => rename(id, (await receiveJson(req)).title)) });
        }
        if (operation === 'archive' && req.method === 'POST') return sendJson(res, 200, { ok: true, ...await locked(() => archive(id)) });
        if (operation === 'file') {
          if (req.method === 'GET') return sendJson(res, 200, { ok: true, ...(await readSource(id, url.searchParams.get('path'))) });
          if (req.method === 'PUT') {
            const body = await receiveJson(req);
            return sendJson(res, 200, { ok: true, ...(await locked(() => saveSource(id, url.searchParams.get('path'), body.content, body.expectedSha))) });
          }
        }
        if (operation === 'upload' && req.method === 'POST') {
          const bytes = await receive(req, MAX_UPLOAD_BYTES);
          return sendJson(res, 201, { ok: true, ...(await locked(() => upload(id, url.searchParams.get('path'), bytes))) });
        }
        if (operation === 'download' && req.method === 'GET') {
          const { data, filename } = await fileBytes(id, url.searchParams.get('path'));
          res.writeHead(200, { 'content-type':'application/octet-stream', 'content-disposition':`attachment; filename*=UTF-8''${encodeURIComponent(filename)}`, 'x-content-type-options':'nosniff', 'cache-control':'no-store' });
          return res.end(data);
        }
        if (operation === 'pdf' && req.method === 'GET') {
          const data = await pdf(id);
          res.writeHead(200, { 'content-type':'application/pdf', 'content-disposition':'inline; filename="main.pdf"', 'cache-control':'no-store','x-content-type-options':'nosniff',});
          return res.end(data);
        }
        if (operation === 'compile' && req.method === 'POST') return sendJson(res, 202, { ok: true, compile: await startCompile(id) });
        if (operation === 'compile' && req.method === 'GET') {
          const compile = await compileStatus(id);
          const hasPdf = (await fs.stat(path.join(projectRoot(id), 'build', 'main.pdf')).catch(() => null))?.isFile() || false;
          return sendJson(res, 200, { ok: true, compile, hasPdf });
        }
        if (operation === 'compile/cancel' && req.method === 'POST') return sendJson(res, 200, { ok: true, compile: await cancelCompile(id) });
        if (operation === 'compiles' && req.method === 'GET') return sendJson(res, 200, { ok: true, history: await compileHistory(id) });
        if (operation.startsWith('compiles/') && req.method === 'GET') return sendJson(res, 200, { ok: true, compile: await compileHistory(id, operation.slice(9)) });
      }
      return sendJson(res, 404, { ok: false, code: 'NOT_FOUND', error: '接口不存在' });
    } catch (e) {
      const status = e instanceof PaperError ? e.status : 500;
      return sendJson(res, status, { ok: false, code: e instanceof PaperError ? e.code : 'INTERNAL_ERROR', error: e instanceof PaperError ? e.message : '服务内部错误', ...(e.log ? {log:e.log} : {}) });
    }
  }
  return { root, handle, list, create, details, readSource, saveSource, upload, rename, archive, compile, startCompile, compileStatus, compileHistory, cancelCompile, dispose, probe, pdf, isCompiling: () => activeCompiles.size > 0 };
}
