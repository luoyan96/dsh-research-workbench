/** Remembered SSH hosts and durable remote jobs, following Mimir's Servers workflow.
 * Transport and local persistence are adapted for this plugin and Windows; see NOTICE.md.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { createSshClient } from '../ssh-transport.js';
import { authorized } from '../papers.js';
import { createCredentialProtector } from './ssh-credentials.js';
import { atomicJson, jsonBody, reject, sendJson } from './service-utils.js';

export const SERVERS_API = '/research-workbench/servers';
const ID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const ACTIVE = new Set(['queued','connecting','running']);
const processes = globalThis[Symbol.for('research-workbench.ssh.owners')] ??= new Set();
const fingerprint = bytes => 'SHA256:' + createHash('sha256').update(bytes).digest('base64').replace(/=+$/, '');
const stamp = () => new Date().toISOString();
const quote = value => "'" + value.replaceAll("'", "'\\''") + "'";
const alive = pid => { try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'EPERM'; } };
const validId = id => { if (!ID.test(id || '')) reject(400, 'BAD_ID', '服务器或任务标识无效'); return id; };
const cleanText = (value, max, label, required = false) => {
  if (typeof value !== 'string' || value.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value) || required && !value.trim()) reject(400, 'BAD_INPUT', label + '无效');
  return value.trim();
};
export function validateServer(input) {
  const name = cleanText(input.name, 100, '名称', true), host = cleanText(input.host, 253, '主机', true), username = cleanText(input.username, 80, '用户名', true);
  if (!/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?|[a-fA-F0-9:]+)$/.test(host) || !/^[a-zA-Z0-9_][a-zA-Z0-9_.-]*$/.test(username)) reject(400, 'BAD_HOST', '请分别填写主机地址和 SSH 用户名');
  const port = input.port ?? 22;
  if (!Number.isInteger(port) || port < 1 || port > 65535) reject(400, 'BAD_PORT', '端口需在 1～65535 之间');
  if (!['agent','key','password'].includes(input.auth)) reject(400, 'BAD_AUTH', '请选择 SSH Agent、私钥或密码');
  const directory = cleanText(input.directory ?? '', 2000, '远程目录');
  if (directory && (!directory.startsWith('/') || /[\r\n]/.test(directory))) reject(400, 'BAD_DIRECTORY', '远程工作目录请使用 Linux 绝对路径，或留空使用用户主目录');
  const keyFile = cleanText(input.keyFile ?? '', 2000, '私钥路径');
  if (input.auth === 'key' && !path.isAbsolute(keyFile)) reject(400, 'BAD_KEY', '私钥请填写本机绝对路径');
  for (const field of ['password','passphrase']) if (input[field] !== undefined && (typeof input[field] !== 'string' || input[field].length > 4000 || /[\x00-\x1f\x7f]/.test(input[field]))) reject(400, 'BAD_SECRET', '凭据过长或含控制字符');
  return { name, host, port, username, directory, auth: input.auth, keyFile: input.auth === 'key' ? keyFile : '', note: cleanText(input.note ?? '', 500, '备注') };
}
export async function readLogTail(file, limit = 32000) {
  let handle;
  try { handle = await fs.open(file, 'r'); const { size } = await handle.stat(); const length = Math.min(size, limit); const bytes = Buffer.alloc(length); await handle.read(bytes, 0, length, size - length); return { text: bytes.toString('utf8'), truncated: size > limit }; }
  catch (error) { if (error.code === 'ENOENT') return { text: '', truncated: false }; throw error; }
  finally { await handle?.close(); }
}
export function createServerService(options = {}) {
  const root = path.resolve(options.root || process.env.DSH_RWB_DATA_DIR || path.join(homedir(), '.dsh', 'research-workbench'));
  const directory = path.join(root, 'ssh'), db = path.join(directory, 'servers.json'), jobRoot = path.join(directory, 'jobs');
  const protector = options.protector || createCredentialProtector(directory), makeClient = options.createClient || createSshClient;
  const owner = randomUUID(), controllers = new Map(), clients = new Set(), operations = new Set(); processes.add(owner);
  let servers = [], writing = Promise.resolve(), pending = 0, disposed = false;
  const serial = run => { pending++; const result = writing.then(run, run); writing = result.catch(() => {}); return result.finally(() => { pending--; }); };
  const serverView = ({ credential, ...record }) => ({ ...record });
  const jobFile = id => path.join(jobRoot, validId(id), 'job.json');
  const saveDb = () => atomicJson(db, { schema: 1, servers });
  const ready = (async () => {
    await fs.mkdir(jobRoot, { recursive: true, mode: 0o700 });
    try { const data = JSON.parse(await fs.readFile(db, 'utf8')); if (data.schema !== 1 || !Array.isArray(data.servers)) throw Error('服务器记录格式无效'); servers = data.servers; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    for (const entry of await fs.readdir(jobRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || !ID.test(entry.name)) continue;
      try {
        const job = JSON.parse(await fs.readFile(jobFile(entry.name), 'utf8'));
        if (ACTIVE.has(job.status) && !(job.ownerPid === process.pid ? processes.has(job.owner) : Number.isInteger(job.ownerPid) && job.ownerPid > 0 && alive(job.ownerPid))) {
          job.status = 'unknown'; job.finishedAt = stamp(); job.message = '上次宿主已退出，SSH 会话中断；远端进程是否仍在运行需要重新核对'; await atomicJson(jobFile(job.id), job);
        }
      } catch { /* Incomplete records are not offered as valid jobs. */ }
    }
  })(); ready.catch(() => {});
  async function record(id) { await ready; validId(id); const item = servers.find(x => x.id === id); if (!item) reject(404, 'NOT_FOUND', '找不到此服务器'); return item; }
  const assertRunning = () => { if (disposed) reject(503, 'DISPOSED', 'SSH 服务正在重新加载'); };
  async function save(input) {
    await ready; assertRunning();
    return serial(async () => {
      const fields = validateServer(input), previous = input.id ? await record(input.id) : null;
      if (previous && input.revision !== previous.revision) reject(409, 'CONFLICT', '服务器记录已变化，请重新打开后修改');
      if (previous && [...controllers.values()].some(x => x.serverId === previous.id)) reject(409, 'BUSY', '此服务器还有正在跟踪的任务，请结束跟踪后修改连接配置');
      if (!previous && servers.length >= 100) reject(400, 'LIMIT', '最多保存 100 台服务器');
      const secrets = previous ? await protector.unprotect(previous.credential) : {};
      for (const key of ['password','passphrase']) if (input[key] !== undefined) { if (input[key]) secrets[key] = input[key]; else delete secrets[key]; }
      if (fields.auth !== 'password') delete secrets.password;
      if (fields.auth !== 'key') delete secrets.passphrase;
      if (fields.auth === 'password' && !secrets.password) reject(400, 'NO_PASSWORD', '请填写 SSH 密码');
      const sameHost = previous && previous.host === fields.host && previous.port === fields.port;
      const value = { ...fields, id: previous?.id || randomUUID(), revision: (previous?.revision || 0) + 1,
        credential: Object.keys(secrets).length ? await protector.protect(secrets) : '', hasPassword: !!secrets.password, hasPassphrase: !!secrets.passphrase,
        fingerprint: sameHost ? previous.fingerprint : null, observedFingerprint: null, connectionStatus: 'unchecked', checkedAt: null, gpus: [], message: '', updatedAt: stamp() };
      servers = [...servers.filter(x => x.id !== value.id), value]; await saveDb(); return serverView(value);
    });
  }
  async function remove(id, revision) {
    await ready;
    return serial(async () => {
      const item = await record(id);
      if (item.revision !== revision) reject(409, 'CONFLICT', '服务器记录已变化');
      if ([...controllers.values()].some(x => x.serverId === id)) reject(409, 'BUSY', '请先结束此服务器任务的跟踪');
      servers = servers.filter(x => x.id !== id); await saveDb(); return { removed: true };
    });
  }
  async function connect(record, signal) {
    assertRunning(); signal?.throwIfAborted();
    const secrets = record.fingerprint ? await protector.unprotect(record.credential) : {};
    const config = { host: record.host, port: record.port, username: record.username, readyTimeout: options.connectTimeoutMs || 12000, keepaliveInterval: 15000, keepaliveCountMax: 3 };
    if (record.fingerprint) {
      if (record.auth === 'password') config.password = secrets.password;
      else if (record.auth === 'key') { const stat = await fs.stat(record.keyFile); if (!stat.isFile() || stat.size > 1024 * 1024) throw Error('本机私钥文件不可用或过大'); config.privateKey = await fs.readFile(record.keyFile); config.passphrase = secrets.passphrase; }
      else config.agent = process.env.SSH_AUTH_SOCK || (process.platform === 'win32' ? '\\\\.\\pipe\\openssh-ssh-agent' : undefined);
    }
    const redact = message => {
      let value = String(message || 'SSH 连接失败');
      for (const secret of Object.values(secrets)) if (secret) value = value.replaceAll(secret, '[已隐藏]');
      return value.slice(0,1000);
    };
    return new Promise((resolve, fail) => {
      const client = makeClient(); clients.add(client); let observed = null, connected = false;
      const abort = () => { client.destroy(); if (!connected) fail(signal.reason || Error('SSH 操作已停止')); };
      signal?.addEventListener('abort', abort, { once: true });
      client.once('close', () => { clients.delete(client); signal?.removeEventListener('abort', abort); if (!connected) fail(Object.assign(Error('SSH 连接已关闭'), { observed })); });
      client.on('error', error => { if (!connected) { fail(Object.assign(Error(observed && observed !== record.fingerprint ? '请核对并确认主机指纹后连接' : redact(error.message)), { observed, changedKey: !!record.fingerprint && observed !== null && observed !== record.fingerprint })); client.destroy(); } });
      client.once('ready', () => { connected = true; resolve({ client, observed, redact }); });
      config.hostVerifier = bytes => { observed = fingerprint(bytes); return !!record.fingerprint && observed === record.fingerprint; };
      try { client.connect(config); } catch (error) { clients.delete(client); signal?.removeEventListener('abort', abort); client.destroy(); fail(Object.assign(Error(redact(error.message)), { observed })); }
    });
  }
  async function shortCommand(client, command, signal) {
    return new Promise((resolve, fail) => {
      let body = '', stream; const timer = setTimeout(() => { stream?.close(); fail(Error('GPU 探测超时')); }, 8000);
      const abort = () => { clearTimeout(timer); stream?.close(); fail(Error('探测已停止')); }; signal?.addEventListener('abort', abort, { once: true });
      const done = (error, result) => { clearTimeout(timer); signal?.removeEventListener('abort', abort); if (error) fail(error); else resolve(result); };
      client.exec(command, (error, channel) => {
        if (error) return done(error); stream = channel;
        channel.on('data', chunk => { body += chunk.toString(); if (body.length > 64000) { channel.close(); done(Error('GPU 输出过大')); } });
        channel.stderr.resume(); channel.once('error', error => done(error)); channel.once('close', code => done(null, { code, body }));
      });
    });
  }
  function operation(invoke) { assertRunning(); const result = Promise.resolve().then(invoke); operations.add(result); result.finally(() => operations.delete(result)).catch(() => {}); return result; }
  const check = (...args) => operation(() => checkImpl(...args));
  const submit = (...args) => operation(() => submitImpl(...args));
  async function checkImpl(id, signal) {
    const snapshot = { ...await record(id) }; assertRunning(); pending++;
    let status = 'offline', observed = null, message = '', gpus = [], client;
    try {
      const connection = await connect(snapshot, signal); client = connection.client; observed = connection.observed; status = 'online';
      try {
        const output = await shortCommand(client, 'nvidia-smi --query-gpu=name,utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits', signal);
        if (output.code === 0) gpus = output.body.trim().split(/\r?\n/).slice(0,32).map(line => line.split(',').map(x => x.trim())).filter(x => x.length === 4 && x.slice(1).every(x => /^\d+(?:\.\d+)?$/.test(x))).map(([name, utilization, memoryUsed, memoryTotal]) => ({ name, utilization: Number(utilization), memoryUsed: Number(memoryUsed), memoryTotal: Number(memoryTotal) }));
        message = gpus.length ? 'SSH 已连接，GPU 信息已读取' : 'SSH 已连接；此服务器未返回 NVIDIA GPU 信息';
      } catch { message = 'SSH 已连接；GPU 探测未完成'; }
    } catch (error) { observed = error.observed || null; status = observed && observed !== snapshot.fingerprint ? snapshot.fingerprint ? 'changed-key' : 'needs-trust' : observed ? 'auth-failed' : 'offline'; message = error.message; }
    finally { client?.end(); pending--; }
    return serial(async () => {
      const current = await record(id); if (current.revision !== snapshot.revision) reject(409, 'CONFLICT', '探测期间服务器配置已更新，请重新测试');
      Object.assign(current, { observedFingerprint: observed, connectionStatus: status, checkedAt: stamp(), message, gpus, revision: current.revision + 1 }); await saveDb(); return serverView(current);
    });
  }
  async function trust(id, revision, value) {
    return serial(async () => {
      const current = await record(id);
      if (current.revision !== revision || !value || value !== current.observedFingerprint) reject(409, 'CONFLICT', '指纹已变化，请重新测试并核对');
      current.fingerprint = value; current.revision++; current.connectionStatus = 'unchecked'; current.message = '主机指纹已确认，请重新测试连接'; await saveDb(); return serverView(current);
    });
  }
  async function oneJob(id) { await ready; try { const job = JSON.parse(await fs.readFile(jobFile(id), 'utf8')); if (job.id !== id) throw Error(); return job; } catch (error) { if (error.status) throw error; reject(404, 'NOT_FOUND', '找不到此任务'); } }
  const jobView = ({ owner: ignored, ownerPid, ...job }) => ({ ...job, canStopTracking: controllers.has(job.id) });
  async function listJobs(serverId) {
    await ready; const jobs = [];
    for (const item of await fs.readdir(jobRoot, { withFileTypes: true })) if (item.isDirectory() && ID.test(item.name)) {
      try { const job = await oneJob(item.name); if (!serverId || job.serverId === serverId) jobs.push(jobView(job)); } catch { /* Ignore partial records. */ }
    }
    return jobs.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0,100);
  }
  async function logs(id) {
    const job = await oneJob(id), folder = path.dirname(jobFile(id));
    const [stdout, stderr] = await Promise.all([readLogTail(path.join(folder,'stdout.log')),readLogTail(path.join(folder,'stderr.log'))]);
    return { job: jobView(job), stdout: stdout.text, stderr: stderr.text, truncated: stdout.truncated || stderr.truncated };
  }
  async function submitImpl(input, signal) {
    const server = { ...await record(input.serverId) }; assertRunning(); signal?.throwIfAborted();
    if (!server.fingerprint) reject(409, 'UNTRUSTED_HOST', '请先在服务器页面核对主机指纹并测试连接');
    const command = cleanText(input.command, 12000, '命令', true), title = cleanText(input.title || command.split('\n')[0].slice(0,80), 120, '任务名称', true);
    const timeoutMinutes = input.timeoutMinutes ?? 30;
    if (!Number.isInteger(timeoutMinutes) || timeoutMinutes < 1 || timeoutMinutes > 1440) reject(400, 'BAD_TIMEOUT', '跟踪时限需在 1～1440 分钟之间');
    const id = randomUUID(), job = { id, serverId: server.id, serverName: server.name, title, command, directory: server.directory, timeoutMinutes, status: 'queued', createdAt: stamp(), startedAt: null, finishedAt: null, exitCode: null, message: '已排队，等待建立 SSH 连接', bytes: 0, owner, ownerPid: process.pid };
    await atomicJson(jobFile(id), job);
    if (disposed || signal?.aborted) { job.status = 'failed'; job.finishedAt = stamp(); job.message = '任务在执行前被取消，未发送远端命令'; await atomicJson(jobFile(id), job); if (disposed) reject(503, 'DISPOSED', job.message); signal.throwIfAborted(); }
    const controller = new AbortController(); controllers.set(id, { controller, serverId: server.id });
    const task = runJob(job, server, controller).catch(async () => { job.status = 'unknown'; job.message = '本机任务跟踪异常，远端结果未确认'; job.finishedAt = stamp(); await atomicJson(jobFile(id), job); }).finally(() => controllers.delete(id));
    controllers.get(id).task = task;
    return jobView(job);
  }
  async function runJob(job, server, controller) {
    let client, redact = value => String(value), timer;
    try {
      job.status = 'connecting'; await atomicJson(jobFile(job.id), job);
      const connection = await connect(server, controller.signal); client = connection.client; redact = connection.redact;
      job.status = 'running'; job.startedAt = stamp(); job.message = 'SSH 命令运行中'; await atomicJson(jobFile(job.id), job);
      timer = setTimeout(() => controller.abort(Error('本机跟踪达到时限，远端进程是否仍在运行需要核对')), options.jobTimeoutMs || job.timeoutMinutes * 60000);
      const command = (server.directory ? 'cd -- ' + quote(server.directory) : 'cd -- "$HOME"') + ' && exec sh -lc ' + quote(job.command);
      await new Promise((resolve, fail) => {
        let chain = Promise.resolve(), settled = false;
        const finish = (error, code) => {
          if (settled) return; settled = true;
          client.removeListener('error', failed); client.removeListener('close', closed); controller.signal.removeEventListener('abort', aborted);
          chain.then(() => { if (error) fail(error); else { job.exitCode = Number.isInteger(code) ? code : null; resolve(); } }, error => fail(controller.signal.aborted ? controller.signal.reason : error));
        };
        const failed = error => finish(error), closed = () => finish(Error('SSH 连接中断，未观察到远端退出状态')), aborted = () => finish(controller.signal.reason || Error('跟踪已停止'));
        client.once('error', failed); client.once('close', closed); controller.signal.addEventListener('abort', aborted, { once: true });
        if (controller.signal.aborted) return aborted();
        client.exec(command, (error, stream) => {
          if (error) return finish(error);
          const write = (name, bytes) => {
            if (settled) return;
            const maximum = options.maxLogBytes || 4 * 1024 * 1024, remaining = maximum - job.bytes;
            const kept = bytes.subarray(0, Math.max(0, remaining)); job.bytes += kept.length;
            if (kept.length) {
              chain = chain.then(() => (options.appendLog || fs.appendFile)(path.join(path.dirname(jobFile(job.id)),name), kept, { mode: 0o600 }));
              chain.catch(() => controller.abort(Error('本机日志无法写入，跟踪已断开；远端运行结果需要核对')));
            }
            if (bytes.length > remaining) controller.abort(Error('日志达到本机捕获上限，跟踪已断开；远端是否仍在运行需要核对'));
          };
          stream.on('data', bytes => write('stdout.log', bytes)); stream.stderr.on('data', bytes => write('stderr.log', bytes));
          stream.once('error', failed); stream.once('close', code => finish(null, code));
        });
      });
      job.status = job.exitCode === 0 ? 'succeeded' : job.exitCode === null ? 'unknown' : 'failed';
      job.message = job.exitCode === 0 ? '远端命令已完成（退出码 0）' : job.exitCode === null ? '远端退出码未返回，需要核对结果' : '远端命令退出码 ' + job.exitCode;
    } catch (error) { job.status = job.startedAt ? 'unknown' : 'failed'; job.message = (job.startedAt ? '' : '远端命令未启动：') + redact(error.message).slice(0,1000); }
    finally { clearTimeout(timer); client?.destroy(); job.finishedAt = stamp(); await atomicJson(jobFile(job.id), job); }
  }
  async function stopTracking(id) {
    const task = controllers.get(validId(id)); if (!task) reject(409, 'NOT_OWNED', '本宿主没有正在跟踪此任务');
    task.controller.abort(Error('用户停止了本机 SSH 跟踪；这不保证远端进程已停止，请在服务器上核对')); await task.task; return jobView(await oneJob(id));
  }
  async function list() { await ready; return { servers: servers.map(serverView), jobs: await listJobs() }; }
  async function handle(req, res) {
    if (!authorized(req, req.method !== 'GET', options.connection)) return sendJson(res, 403, { ok: false, error: '请从本机已登录的 DSH 页面访问服务器' });
    try {
      assertRunning(); const route = new URL(req.url, 'http://localhost').pathname.slice(SERVERS_API.length).split('/').filter(Boolean);
      if (req.method === 'GET' && !route.length) return sendJson(res, 200, { ok: true, ...await list() });
      if (req.method === 'GET' && route.length === 2 && route[0] === 'jobs') return sendJson(res, 200, { ok: true, ...await logs(route[1]) });
      if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: '操作不支持' });
      if (req.headers['x-research-workbench-ssh'] !== '1') reject(403, 'MISSING_INTENT', '缺少服务器操作标识');
      const input = await jsonBody(req);
      if (route.length !== 1) reject(404, 'NOT_FOUND', '操作不存在');
      if (route[0] === 'save') return sendJson(res, 200, { ok: true, server: await save(input) });
      if (route[0] === 'remove') return sendJson(res, 200, { ok: true, ...await remove(input.id, input.revision) });
      if (route[0] === 'check') return sendJson(res, 200, { ok: true, server: await check(input.id) });
      if (route[0] === 'trust') {
        if (input.confirmation !== 'confirm-host-key') reject(400, 'CONFIRMATION', '请核对主机指纹后确认');
        return sendJson(res, 200, { ok: true, server: await trust(input.id, input.revision, input.fingerprint) });
      }
      if (route[0] === 'jobs') return sendJson(res, 202, { ok: true, job: await submit(input) });
      if (route[0] === 'stop') return sendJson(res, 200, { ok: true, job: await stopTracking(input.id) });
      reject(404, 'NOT_FOUND', '操作不存在');
    } catch (error) { sendJson(res, error.status || 500, { ok: false, code: error.code || 'SSH_ERROR', error: error.message }); }
  }
  return { ready, save, remove, check, trust, submit, list, listJobs, logs, stopTracking, handle, isBusy: () => pending > 0 || controllers.size > 0 || operations.size > 0,
    async idle() { await ready.catch(() => {}); await Promise.allSettled([...operations]); await Promise.all([...controllers.values()].map(x => x.task)); await writing; },
    async dispose() { disposed = true; processes.delete(owner); for (const task of controllers.values()) task.controller.abort(Error('宿主退出或插件重新加载，远端运行结果未确认')); for (const client of clients) client.destroy(); await this.idle(); },
  };
}
