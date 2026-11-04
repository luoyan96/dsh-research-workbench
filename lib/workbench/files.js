/** Uploaded Office originals, editable working copies and durable per-file session bindings. */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import { randomUUID, createHash } from 'node:crypto';
import { authorized } from '../papers.js';
import { openOfficeZip, replaceOfficeXml } from './office-import.js';
import { trackOfficeTransaction } from './native-office-activity.js';

export const FILE_API = '/research-workbench/files';
export const FILE_MAX_BYTES = 80 * 1024 * 1024;
const ID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const KINDS = new Set(['proposal', 'slides', 'ip']);
const EXTENSIONS = new Set(['.docx', '.dotx', '.pptx', '.potx']);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const now = () => new Date().toISOString();
export class FileError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const fail = (status, code, message) => { throw new FileError(status, code, message); };
function safeName(name) {
  if (typeof name !== 'string' || !name || name.length > 160 || /[<>:"/\\|?*\x00-\x1f\x7f]/.test(name) || /[. ]$/.test(name) || name.startsWith('.') || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)) fail(400, 'BAD_NAME', '文件名无效，请重命名后上传');
  if (!EXTENSIONS.has(path.extname(name).toLowerCase())) fail(400, 'BAD_TYPE', '请上传 DOCX、DOTX、PPTX 或 POTX 文件；旧版 DOC/PPT 请先在 WPS 中另存为新版格式');
  return name;
}
async function atomic(file, bytes) {
  const temp = file + '.' + randomUUID() + '.tmp';
  try { await fs.writeFile(temp, bytes, { flag: 'wx' }); await fs.rename(temp, file); }
  finally { await fs.rm(temp, { force: true }); }
}
async function body(req, max = 20000, json = true) {
  if (Number(req.headers['content-length']) > max) fail(413, 'TOO_LARGE', '文件不能超过 80 MiB');
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > max) fail(413, 'TOO_LARGE', '文件不能超过 80 MiB'); chunks.push(chunk); }
  const bytes = Buffer.concat(chunks);
  if (!json) return bytes;
  try { const value = JSON.parse(bytes.toString('utf8')); if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(); return value; }
  catch { fail(400, 'BAD_JSON', '请求内容无效'); }
}
function send(res, status, data) {
  const bytes = Buffer.from(JSON.stringify(data));
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'content-length': bytes.length }); res.end(bytes);
}
function validateOffice(bytes, name, kind) {
  if (!bytes.length) fail(400, 'EMPTY_FILE', '文件为空');
  const ext = path.extname(name).toLowerCase(), slides = ext === '.pptx' || ext === '.potx';
  if ((kind === 'slides') !== slides) fail(400, 'WRONG_KIND', kind === 'slides' ? 'PPT 工作台请上传 PPTX 或 POTX' : '此页面请上传 DOCX 或 DOTX');
  let zip;
  try { zip = openOfficeZip(bytes, { maxBytes: FILE_MAX_BYTES }); }
  catch (error) { fail(400, error.code || 'BAD_OFFICE', error.message); }
  const main = slides ? 'ppt/presentation.xml' : 'word/document.xml';
  if (!zip.items.has(main)) fail(400, 'BAD_OFFICE', '文件内容与文件类型不符');
  zip.get(main); // Validate the document's compressed bytes/CRC before Office opens it.
  const types = zip.get('[Content_Types].xml');
  // Convert only the OOXML package type; layouts, drawings and media retain their original parts.
  const template = ext === '.dotx' || ext === '.potx';
  const expected = slides ? `presentationml.${template ? 'template' : 'presentation'}.main+xml` : `wordprocessingml.${template ? 'template' : 'document'}.main+xml`;
  if (!types.includes(expected)) fail(400, 'BAD_OFFICE', 'Office 内容类型与扩展名不符');
  if (!template) return { bytes, outputName: name, app: slides ? 'ppt' : 'word', template };
  const type = slides ? 'presentationml.presentation.main+xml' : 'wordprocessingml.document.main+xml';
  return { bytes: replaceOfficeXml(bytes, new Map([['[Content_Types].xml', types.replace(expected, type)]]), { maxBytes: FILE_MAX_BYTES }), outputName: name.slice(0, -ext.length) + (slides ? '.pptx' : '.docx'), app: slides ? 'ppt' : 'word', template };
}

export function createFileService(options = {}) {
  const root = path.resolve(options.root || process.env.DSH_RWB_DATA_DIR || path.join(homedir(), '.dsh', 'research-workbench'));
  const directory = path.join(root, 'files');
  const cache = new Map(), sessionFiles = new Map(), queues = new Map(), previews = new Map();
  let office = options.office, pending = 0, disposed = false;
  const folder = id => { if (!ID.test(id || '')) fail(400, 'BAD_ID', '文件标识无效'); return path.join(directory, id); };
  const persist = async item => { item.revision++; item.updatedAt = now(); await atomic(path.join(folder(item.id), 'file.json'), JSON.stringify(item, null, 2) + '\n'); };
  const journal = (item, type, message) => { item.events.push({ at: now(), type, message: String(message).slice(0, 1000) }); item.events = item.events.slice(-100); };
  const lock = (id, run) => {
    pending++;
    const next = (queues.get(id) || Promise.resolve()).then(run, run);
    queues.set(id, next.catch(() => {}));
    return next.finally(() => { pending--; });
  };
  const ready = (async () => {
    await fs.mkdir(directory, { recursive: true });
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (!entry.isDirectory() || !ID.test(entry.name)) continue;
      const home = folder(entry.name), stat = await fs.lstat(home);
      if (stat.isSymbolicLink()) continue;
      try {
        const item = JSON.parse(await fs.readFile(path.join(home, 'file.json'), 'utf8'));
        if (item.id !== entry.name || !KINDS.has(item.kind) || item.schema !== 1 || safeName(item.name) !== item.name) continue;
        if (item.path !== path.join(home, 'work', item.name) || item.originalPath !== path.join(home, 'original', safeName(item.originalName))) continue;
        cache.set(item.id, item);
        if (item.sessionId) sessionFiles.set(item.sessionId, item.id);
        if (item.preview.status === 'running') { item.preview.status = 'error'; item.preview.error = '预览被上次退出中断，可重新刷新'; journal(item, 'interrupted', item.preview.error); await persist(item); }
      } catch { /* An incomplete or malformed upload is never made addressable. */ }
    }
  })();
  ready.catch(() => {});
  async function one(id) { await ready; folder(id); const item = cache.get(id); if (!item) fail(404, 'NOT_FOUND', '找不到上传的文件'); return item; }
  const view = item => ({ ...item, events: item.events.map(event => ({ ...event })), preview: { ...item.preview }, officeAvailable: !!office });
  async function upload(kind, name, bytes) {
    await ready;
    if (!KINDS.has(kind)) fail(400, 'BAD_KIND', '内容类型无效');
    safeName(name); if (bytes.length > FILE_MAX_BYTES) fail(413, 'TOO_LARGE', '文件不能超过 80 MiB');
    const checked = validateOffice(bytes, name, kind), id = randomUUID(), home = folder(id);
    pending++;
    try {
      await fs.mkdir(path.join(home, 'original'), { recursive: true }); await fs.mkdir(path.join(home, 'work')); await fs.mkdir(path.join(home, 'preview'));
      const item = { schema: 1, id, kind, name: checked.outputName, originalName: name, app: checked.app, template: checked.template,
        path: path.join(home, 'work', checked.outputName), directory: path.join(home, 'work'), originalPath: path.join(home, 'original', name),
        originalSha: hash(bytes), originalBytes: bytes.length, savedSha: hash(checked.bytes), savedBytes: checked.bytes.length, savedAt: now(), sessionId: null,
        revision: 0, createdAt: now(), updatedAt: now(), preview: { status: 'empty', page: 1, total: null, revision: 0, error: '' }, events: [] };
      await fs.writeFile(item.originalPath, bytes, { flag: 'wx' }); await fs.writeFile(item.path, checked.bytes, { flag: 'wx' });
      journal(item, 'uploaded', checked.template ? '已保留模板原件，并创建可编辑工作副本' : '已保留上传原件，并创建工作副本');
      await persist(item); cache.set(id, item); return view(item);
    } finally { pending--; }
  }
  async function bind(id, sessionId, revision) {
    return lock(id, async () => {
      const item = await one(id);
      if (!/^[\w-]{1,120}$/.test(sessionId || '')) fail(400, 'BAD_SESSION', '会话标识无效');
      if (item.sessionId === sessionId) return view(item);
      if (revision !== item.revision) fail(409, 'CONFLICT', '文件记录已更新，请重新打开');
      if (item.sessionId || sessionFiles.has(sessionId)) fail(409, 'BOUND', '这份文件或会话已经绑定，不能覆盖原来的修改记录');
      item.sessionId = sessionId; sessionFiles.set(sessionId, id); journal(item, 'session', '已绑定独立 DSH 修改会话'); await persist(item); return view(item);
    });
  }
  function native() { if (!office) fail(503, 'NO_OFFICE', 'Office / WPS 组件尚未就绪；请检查插件设置及本机 WPS 安装'); return office; }
  async function open(item, show = false) {
    await fs.access(item.path).catch(() => fail(404, 'MISSING_FILE', '工作副本已被移动或删除'));
    return native().call('open', { app: item.app, path: item.path, show, silent: !show }, 80000);
  }
  async function touchSaved(item) {
    const bytes = await fs.readFile(item.path), sha = hash(bytes);
    if (sha !== item.savedSha) { item.savedSha = sha; item.savedAt = now(); item.savedBytes = bytes.length; }
  }
  async function act(id, action) {
    return lock(id, () => trackOfficeTransaction(async () => {
      const item = await one(id);
      try {
        const opened = await open(item, action === 'open'); item.readOnly = !!opened?.readOnly;
        if (action === 'save' && item.readOnly) fail(409, 'READ_ONLY', '工作副本只读或被其他 Office / WPS 窗口占用，请先关闭占用窗口，或下载已保存的副本重新上传');
        if (action === 'save') { await native().call('save', { app: item.app, doc: item.path }, 110000); await touchSaved(item); journal(item, 'saved', '已保存工作副本，可以下载'); }
        else journal(item, 'opened', '已在 Office / WPS 中打开工作副本');
        await persist(item); return view(item);
      } catch (error) { journal(item, 'error', error.message); await persist(item); throw error; }
    }));
  }
  async function preview(id, page = 1) {
    const item = await one(id);
    if (!Number.isSafeInteger(page) || page < 1 || page > 500) fail(400, 'BAD_PAGE', '页码需要在 1～500 之间');
    if (previews.has(id)) return view(item);
    native();
    const job = lock(id, () => trackOfficeTransaction(async () => {
      item.preview = { ...item.preview, status: 'running', error: '' }; await persist(item);
      try {
        const opened = await open(item); item.readOnly = !!opened?.readOnly;
        const output = path.join(folder(id), 'preview', randomUUID() + '.png');
        try {
          const rendered = await native().call('render', { app: item.app, doc: item.path, ...(item.app === 'word' ? { page } : { slide: page }), out: output, width: 1200 }, 55000);
          const detail = item.app === 'ppt' ? await native().call('read', { app: 'ppt', doc: item.path, slide: page }, 50000) : null;
          const bytes = await fs.readFile(output);
          if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw Error('Office 没有返回有效的页面图片');
          await atomic(path.join(folder(id), 'preview', 'page.png'), bytes);
          const total = / of (\d+)$/.exec(rendered.what || '');
          item.preview = { status: 'ready', page, total: Number.isSafeInteger(detail?.slides) ? detail.slides : total ? Number(total[1]) : item.preview.total, revision: item.preview.revision + 1, error: '', at: now() };
          journal(item, 'preview', `已渲染第 ${page} 页`);
        } finally { await fs.rm(output, { force: true }); }
      } catch (error) { item.preview.status = 'error'; item.preview.error = error.message; journal(item, 'error', '预览失败：' + error.message); }
      await persist(item);
    }));
    previews.set(id, job); job.finally(() => { previews.delete(id); }).catch(() => {});
    // Admission does not await WPS: the job and its outcome survive browser navigation.
    return { ...view(item), preview: { ...item.preview, status: 'running' } };
  }
  async function noteTool(exec, result) {
    const id = sessionFiles.get(exec.agent?.session?.id); if (!id || !exec.name.startsWith('research_office_')) return;
    await lock(id, async () => {
      const item = await one(id), args = exec.arguments || {}, selected = args.doc || args.path;
      if (selected && path.resolve(selected).toLowerCase() !== item.path.toLowerCase()) return;
      if (result.isError) journal(item, 'error', exec.name + ' 执行失败，请查看右侧会话中的错误');
      else if (exec.name === 'research_office_edit') journal(item, 'edited', 'AI 已执行修改；尚需保存到工作副本');
      else if (exec.name === 'research_office_save') {
        if (args.path && path.resolve(args.path).toLowerCase() !== item.path.toLowerCase()) journal(item, 'exported', 'AI 已另存文件，请查看对话中的另存位置；当前工作副本仍保留原路径');
        else { await touchSaved(item); journal(item, 'saved', 'AI 已保存工作副本'); }
      }
      else return;
      await persist(item);
    });
  }
  async function current(sessionId) { await ready; const id = sessionFiles.get(sessionId); return id ? view(await one(id)) : null; }
  function prompt(sessionId) {
    const item = cache.get(sessionFiles.get(sessionId));
    return item ? JSON.stringify({ researchFile: { id: item.id, name: item.name, workingPath: item.path, originalPreserved: true, readOnly: !!item.readOnly, instruction: item.readOnly ? 'This working copy was opened read-only. Do not edit or retry an in-place save; tell the user to close the other Office window or upload a fresh working copy, then refresh to check again.' : 'Edit this working copy with research_office_*; preserve its existing layout. The uploaded original is a backup, never edit it. Read first, use explicit doc paths, and save before reporting completion.' } }).replaceAll('{{', '\\u007b\\u007b') : '';
  }
  async function download(id, original = false) {
    const item = await one(id), file = original ? item.originalPath : item.path;
    const stat = await fs.lstat(file).catch(() => fail(404, 'MISSING_FILE', '文件已被移动或删除'));
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > FILE_MAX_BYTES * 2) fail(400, 'BAD_FILE', '文件不可下载或体积过大');
    return { bytes: await fs.readFile(file), name: original ? item.originalName : item.name };
  }
  async function handle(req, res) {
    if (!authorized(req, req.method !== 'GET', options.connection)) return send(res, 403, { ok: false, code: 'FORBIDDEN', error: '请从本机已登录的 DSH 界面访问文件' });
    try {
      if (disposed) fail(503, 'DISPOSED', '文件服务正在重新加载，请稍后重试');
      const url = new URL(req.url, 'http://localhost'), route = url.pathname.slice(FILE_API.length).split('/').filter(Boolean);
      if (req.method === 'POST' && req.headers['x-research-workbench-files'] !== '1') fail(403, 'FORBIDDEN', '缺少文件操作标识');
      if (req.method === 'GET' && !route.length) {
        await ready; const kind = url.searchParams.get('kind');
        if (!KINDS.has(kind)) fail(400, 'BAD_KIND', '内容类型无效');
        return send(res, 200, { ok: true, items: [...cache.values()].filter(item => item.kind === kind).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)).map(view) });
      }
      if (req.method === 'POST' && route[0] === 'upload' && route.length === 1) return send(res, 201, { ok: true, item: await upload(url.searchParams.get('kind'), url.searchParams.get('name'), await body(req, FILE_MAX_BYTES, false)) });
      const id = route[0], item = await one(id);
      if (req.method === 'GET' && route.length === 1) return send(res, 200, { ok: true, item: view(item) });
      if (req.method === 'POST' && route.length === 2) {
        const input = await body(req);
        if (route[1] === 'session') return send(res, 200, { ok: true, item: await bind(id, input.sessionId, input.revision) });
        if (route[1] === 'preview') return send(res, 202, { ok: true, item: await preview(id, input.page ?? 1) });
        if (route[1] === 'open' || route[1] === 'save') return send(res, 200, { ok: true, item: await act(id, route[1]) });
      }
      if (req.method === 'GET' && route.length === 2 && ['download', 'original'].includes(route[1])) {
        const file = await download(id, route[1] === 'original');
        res.writeHead(200, { 'content-type': 'application/octet-stream', 'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`, 'content-length': file.bytes.length, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); return res.end(file.bytes);
      }
      if (req.method === 'GET' && route.length === 2 && route[1] === 'image') {
        const bytes = await fs.readFile(path.join(folder(id), 'preview', 'page.png')).catch(() => fail(404, 'NO_PREVIEW', '还没有页面预览'));
        res.writeHead(200, { 'content-type': 'image/png', 'content-length': bytes.length, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); return res.end(bytes);
      }
      fail(404, 'NOT_FOUND', '没有这个文件操作');
    } catch (error) { if (!res.headersSent) send(res, error.status || 500, { ok: false, code: error.code || 'FILE_FAILED', error: error.message || '文件操作失败' }); }
  }
  return { ready, upload, one: async id => view(await one(id)), list: async kind => { await ready; return [...cache.values()].filter(item => item.kind === kind).map(view); }, bind, act, preview, current, prompt, download, noteTool, handle,
    setOffice(value) { office = value; return () => { if (office === value) office = undefined; }; }, isBusy: () => pending > 0, async idle() { await Promise.all([...queues.values()]); }, dispose() { disposed = true; } };
}

export function registerFileTools(ctx, files) {
  return ctx.tools.register({ name: 'research_file_current', description: 'Read the Office working file bound to THIS research conversation. Returns its exact editable path and preserved-original status. Use research_office_* to read/edit/render/save it; never change the uploaded backup.',
    parameters: { type: 'object', properties: {}, additionalProperties: false }, output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
    async execute(_args, exec) { const item = await files.current(exec.agent?.session?.id); return JSON.stringify(item ? { id: item.id, name: item.name, path: item.path, app: item.app, originalPreserved: true, readOnly: !!item.readOnly } : { file: null, message: 'This session has no bound research working file.' }); } });
}
