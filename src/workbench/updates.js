import { randomUUID, createHash } from 'node:crypto';
import { promises as fs, readFileSync } from 'node:fs';
import path from 'node:path';
import { backupPlugin, verifyPluginArchive } from './update-archive.js';
import { nativeOfficeBusy } from './native-office-activity.js';

export const UPDATE_ROUTE = '/api/research-workbench/updates';
export const PLUGIN_NAME = 'dsh-research-workbench';
const REPOSITORY = 'luoyan96/dsh-research-workbench';
const API = `https://api.github.com/repos/${REPOSITORY}/releases/latest`;
const DAY = 24 * 60 * 60 * 1000;
const manifest = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const initial = () => ({ schema: 1, revision: 0, checkEnabled: true, ignoredVersion: null, deferredUntil: 0, attemptedAt: null, checkedAt: null, release: null, lastError: null, operation: null });
const stable = value => typeof value === 'string' && value.length <= 64 && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value);
export function compareVersions(a, b) {
  if (!stable(a) || !stable(b)) return null;
  const x = a.split('.').map(BigInt), y = b.split('.').map(BigInt);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i] ? 1 : -1;
  return 0;
}
function validateRelease(value) {
  const version = typeof value?.tag_name === 'string' ? value.tag_name.replace(/^v/, '') : '';
  if (!stable(version) || value.draft || value.prerelease || !Number.isSafeInteger(value.id)) throw Error('未找到可安装的稳定发行版。');
  const expected = `https://github.com/${REPOSITORY}/releases/download/v${version}/${PLUGIN_NAME}-${version}.tgz`;
  const asset = value.assets?.find(item => item.name === `${PLUGIN_NAME}-${version}.tgz`);
  if (!asset || asset.browser_download_url !== expected || !/^sha256:[a-f0-9]{64}$/.test(asset.digest || '') || !Number.isSafeInteger(asset.size) || asset.size <= 0 || asset.size > 16 * 1024 * 1024) throw Error('发行包缺失或未提供合法 SHA-256，当前插件保持不变。');
  return { id: value.id, version, url: expected, digest: asset.digest, bytes: asset.size, notes: String(value.body || '').slice(0, 12000), page: `https://github.com/${REPOSITORY}/releases/tag/v${version}` };
}
async function bounded(response, maximum) {
  if (!response.ok || !response.body) throw Error(`更新服务返回 HTTP ${response.status}，请稍后重试。`);
  const chunks = []; let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length;
    if (length > maximum) throw Error('更新响应超出大小限制。');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
const applied = result => !result?.error && ['applied', 'restart-required'].includes(result?.application);

export function createUpdateService(options) {
  const { directory, manager } = options;
  const fetchImpl = options.fetchImpl || fetch, now = options.now || Date.now;
  const storeFile = path.join(directory, 'research-workbench-updates.json');
  let state, jobPromise, checking, initializing, starting = false, writing = Promise.resolve();
  const clients = new Map();
  async function persist() {
    state.revision++;
    const bytes = JSON.stringify(state, null, 2) + '\n';
    writing = writing.catch(() => {}).then(async () => {
      await fs.mkdir(directory, { recursive: true });
      const temp = storeFile + '.' + randomUUID() + '.tmp';
      try { await fs.writeFile(temp, bytes, { flag: 'wx' }); await fs.rename(temp, storeFile); }
      finally { await fs.rm(temp, { force: true }); }
    });
    return writing;
  }
  async function initialize() {
    if (!initializing) initializing = initializeOnce();
    return initializing;
  }
  async function initializeOnce() {
    try {
      const saved = JSON.parse(await fs.readFile(storeFile, 'utf8'));
      if (saved.schema !== 1 || !Number.isSafeInteger(saved.revision) || typeof saved.checkEnabled !== 'boolean' || !Number.isFinite(saved.deferredUntil)) throw Error('INVALID_STATE');
      state = { ...initial(), ...saved };
      if (state.release) state.release = validateRelease({ id: state.release.id, tag_name: 'v' + state.release.version, assets: [{ name: `${PLUGIN_NAME}-${state.release.version}.tgz`, browser_download_url: state.release.url, digest: state.release.digest, size: state.release.bytes }], body: state.release.notes });
    } catch (error) {
      if (error.code !== 'ENOENT') throw Error('更新记录无法读取；原文件已保留，请先修复该文件。');
      state = initial();
    }
    if (state.operation && ['downloading', 'installing', 'restoring'].includes(state.operation.status)) {
      const bundle = await installed();
      state.operation.status = bundle?.version === state.operation.target ? 'restart-required' : 'unknown';
      state.operation.message = bundle?.version === state.operation.target ? '目标版本已在磁盘上，请手动重启 DSH 后核对。' : '上次更新结果未确认，请在原生插件管理中核对，暂不重复安装。';
      await persist();
    }
    if (state.operation?.status === 'restart-required' && (options.version || manifest.version) === state.operation.target) {
      const bundle = await installed();
      if (bundle?.version === state.operation.target) {
        state.operation.status = 'succeeded'; state.operation.message = '已在新版本中启动。'; await persist();
      }
    }
  }
  async function installed() { return (await manager.listBundles()).find(item => item.name === PLUGIN_NAME && item.installed); }
  async function snapshot() {
    await initialize();
    const bundle = await installed();
    const current = bundle?.version || null;
    const available = bundle && state.release && compareVersions(state.release.version, current) === 1;
    return { ...state, installedVersion: current, runningVersion: options.version || manifest.version, available: !!available, installing: !!jobPromise,
      reminder: !!available && state.checkEnabled && state.ignoredVersion !== state.release.version && state.deferredUntil <= now() };
  }
  async function check() {
    await initialize();
    if (checking) return checking;
    if (jobPromise || starting) throw Error('插件正在更新，请等待完成。');
    checking = (async () => {
      state.attemptedAt = now();
      try {
        const response = await fetchImpl(API, { redirect: 'error', signal: AbortSignal.timeout(15000), headers: { accept: 'application/vnd.github+json', 'user-agent': PLUGIN_NAME } });
        state.release = validateRelease(JSON.parse((await bounded(response, 512 * 1024)).toString('utf8')));
        state.checkedAt = now(); state.lastError = null;
      } catch (error) { state.lastError = error.message || '检查失败，请重试。'; }
      await persist(); return snapshot();
    })().finally(() => { checking = null; });
    return checking;
  }
  function heartbeat(client) {
    if (!client || typeof client.id !== 'string' || !/^[a-f0-9-]{36}$/.test(client.id) || typeof client.dirty !== 'boolean' || typeof client.busy !== 'boolean') throw Error('页面状态无效。');
    clients.set(client.id, { dirty: client.dirty, busy: client.busy, at: now() });
  }
  async function ensureIdle() {
    if (!clients.size || [...clients.values()].some(client => now() - client.at > 30000 || client.dirty || client.busy)) throw Error('请保存科研工作台中的修改、停止任务并关闭多余窗口后重试；失联窗口可在手动重启 DSH 后清除。');
    if (!(await options.canInstall?.())) throw Error('DSH、论文编译或 Office 任务仍在工作，暂时不能更新插件。');
  }
  async function choice(input) {
    await initialize();
    if (jobPromise || starting) throw Error('插件正在更新，请等待完成。');
    if (input.revision !== state.revision) throw Error('更新状态已变化，请刷新后重试。');
    if (input.action === 'preferences' && typeof input.checkEnabled === 'boolean') state.checkEnabled = input.checkEnabled;
    else if (input.action === 'later') state.deferredUntil = now() + DAY;
    else if (input.action === 'ignore' && input.version === state.release?.version) state.ignoredVersion = input.version;
    else throw Error('更新选项无效。');
    await persist(); return snapshot();
  }
  async function start(input) {
    await initialize();
    if (jobPromise || checking || starting) throw Error('更新或检查正在进行，请等待完成。');
    starting = true;
    try {
      if (input.confirmation !== 'update-research-plugin' || input.revision !== state.revision || input.version !== state.release?.version || !state.checkedAt || now() - state.checkedAt > 30 * 60 * 1000) throw Error('请重新检查版本并确认更新。');
      if (['unknown', 'restore-failed', 'restart-required'].includes(state.operation?.status)) throw Error('请先核对原生插件管理中的结果，并手动重启 DSH。');
      const previous = await installed(), release = { ...state.release };
      if (!previous || compareVersions(release.version, previous.version) !== 1) throw Error('实际安装版本已变化，或没有更高的稳定版本。');
      await ensureIdle();
      const id = randomUUID();
      state.operation = { id, status: 'downloading', target: release.version, previous: previous.version, message: '正在下载并校验发行包…', startedAt: now() };
      await persist();
      jobPromise = install(previous, release, id).finally(() => { jobPromise = null; });
      void jobPromise.catch(() => {});
      return snapshot();
    } finally { starting = false; }
  }
  async function install(previous, release, id) {
    const cache = path.join(directory, 'research-workbench-update-cache', id);
    let backup, touched = false;
    try {
      const response = await fetchImpl(release.url, { redirect: 'follow', signal: AbortSignal.timeout(120000) });
      if (response.url && !/^https:\/\/(?:github\.com|(?:[a-z0-9-]+\.)*githubusercontent\.com)\//.test(response.url)) throw Error('发行包跳转到了未知来源，未安装。');
      const bytes = await bounded(response, 16 * 1024 * 1024);
      if (bytes.length !== release.bytes || 'sha256:' + createHash('sha256').update(bytes).digest('hex') !== release.digest) throw Error('发行包 SHA-256 或大小不匹配，当前插件保持不变。');
      verifyPluginArchive(bytes, release.version);
      await fs.mkdir(cache, { recursive: true });
      const target = path.join(cache, `${PLUGIN_NAME}-${release.version}.tgz`);
      await fs.writeFile(target, bytes, { flag: 'wx' });
      backup = await backupPlugin(directory, previous.version, path.join(cache, 'previous.tgz'));
      await ensureIdle();
      state.operation.status = 'installing'; state.operation.message = '正在通过 DSH 安装插件…'; await persist();
      const settings = { enabled: previous.enabled, saveExact: true, requestId: id };
      touched = true; // The native call can throw after writing package files.
      let result = await manager.installBundle(target, settings);
      if (result.error?.code === 'already-installed') {
        // The preflight made no changes; removal is the next mutation boundary.
        touched = true;
        const removed = await manager.removeBundle(PLUGIN_NAME);
        if (removed.changed !== true && !applied(removed)) touched = false;
        if (!applied(removed)) throw Error('宿主暂时不能卸载旧版本，请关闭运行任务后在原生插件管理中重试。');
        result = await manager.installBundle(target, settings); touched = true;
      }
      if (!applied(result)) throw Error('DSH 安装失败：' + (result.packageResult?.kind || result.error?.code || result.application || '未知错误'));
      touched = true;
      const current = await installed();
      if (current?.version !== release.version || current.enabled !== previous.enabled) throw Error('安装后的版本或启用状态不符合预期。');
      state.operation.status = 'restart-required'; state.operation.message = '插件已安装。请手动重启 DSH；重启前仍可能运行旧版代码。';
      state.operation.finishedAt = now(); await persist();
    } catch (error) {
      let message = error.message || '更新失败。';
      if (touched && backup) {
        state.operation.status = 'restoring'; state.operation.message = '更新未完成，正在恢复更新前的插件包…'; await persist();
        try {
          let restored = await manager.installBundle(backup, { enabled: previous.enabled, saveExact: true, requestId: id + '-restore' });
          if (restored.error?.code === 'already-installed') {
            const removed = await manager.removeBundle(PLUGIN_NAME);
            if (!applied(removed)) throw Error('原生管理器拒绝恢复');
            restored = await manager.installBundle(backup, { enabled: previous.enabled, saveExact: true, requestId: id + '-restore' });
          }
          const current = await installed();
          if (!applied(restored) || current?.version !== previous.version || current.enabled !== previous.enabled) throw Error('旧版本恢复未确认');
          message += ' 已恢复更新前的版本；请手动重启 DSH 后核对。';
          state.operation.status = 'failed';
        } catch { state.operation.status = 'restore-failed'; message += ' 自动恢复未确认，请在原生插件管理中处理；备份包已保留。'; }
      } else state.operation.status = 'failed';
      state.operation.message = message; state.operation.finishedAt = now(); await persist();
    }
  }
  async function tick() {
    await initialize();
    if (state.checkEnabled && !jobPromise && !starting && (!state.attemptedAt || now() - state.attemptedAt >= DAY)) await check();
  }
  async function handle(request) {
    try {
      if (request.method !== 'POST' || request.headers.get('x-research-workbench-updates') !== '1' || !/^application\/json(?:;|$)/i.test(request.headers.get('content-type') || '')) return new Response('Forbidden', { status: 403 });
      const body = request.body ? await bounded(new Response(request.body), 16384) : Buffer.from('{}');
      const input = JSON.parse(body.toString('utf8'));
      if (input.client) heartbeat(input.client);
      let value;
      if (input.action === 'client-close') { clients.delete(input.client.id); value = true; }
      else if (input.action === 'state') value = await snapshot();
      else if (input.action === 'check') value = await check();
      else if (['ignore', 'later', 'preferences'].includes(input.action)) value = await choice(input);
      else if (input.action === 'install') value = await start(input);
      else throw Error('更新请求无效。');
      return Response.json({ ok: true, value }, { headers: { 'cache-control': 'no-store' } });
    } catch (error) { return Response.json({ ok: false, error: error.message || '更新操作失败。' }, { status: 400 }); }
  }
  return { initialize, snapshot, check, choice, start, heartbeat, tick, handle, get pending() { return jobPromise; } };
}

const pool = Symbol.for('acceptcat.research-workbench.updates.v1');
const services = globalThis[pool] ??= new WeakMap();
export function registerResearchUpdates(ctx, papers) {
  if (typeof ctx.root?.plugin !== 'function' || typeof ctx.inject !== 'function') return;
  ctx.inject(['profileContext', 'connection', 'pluginManager', 'agents'], host => {
    const profile = host.get('profileContext');
    if (!profile?.dir || !host.get('connection')?.fetch?.register) return;
    let shared = services.get(profile);
    if (!shared) {
      shared = { references: 0, fiber: null, papers }; services.set(profile, shared);
      const sharedService = shared;
      shared.fiber = ctx.root.plugin({ name: 'research-workbench-updates', inject: ['profileContext', 'connection', 'pluginManager', 'agents'], async apply(owner) {
        const service = createUpdateService({ directory: profile.dir, manager: owner.get('pluginManager'), canInstall: async () => {
          try {
            const agents = owner.get('agents').list();
            let jobs;
            try { jobs = owner.get('jobs')?.list?.() || []; } catch { jobs = []; }
            return Array.isArray(agents) && agents.every(agent => agent.status === 'idle') && Array.isArray(jobs) && jobs.every(job => ['completed', 'killed', 'failed'].includes(job.status)) && !sharedService.papers.isCompiling() && !nativeOfficeBusy();
          } catch { return false; }
        } });
        sharedService.service = service;
        await service.initialize();
        owner.effect(() => owner.get('connection').fetch.register({ path: UPDATE_ROUTE, methods: ['POST'], requestBody: 'streaming', fetch: request => service.handle(request) }));
        owner.effect(() => {
          const timer = setInterval(() => { void service.tick().catch(error => owner.logger?.warn?.(error.message)); }, 30 * 60 * 1000);
          const first = setTimeout(() => { void service.tick().catch(error => owner.logger?.warn?.(error.message)); }, 10000);
          timer.unref?.(); first.unref?.(); return () => { clearInterval(timer); clearTimeout(first); };
        });
      } });
      void Promise.resolve(shared.fiber).catch(error => {
        host.logger?.warn?.('科研插件更新入口未启动：' + error.message);
        if (services.get(profile) === shared) services.delete(profile);
      });
    }
    shared.papers = papers;
    clearTimeout(shared.timer); shared.references++;
    host.effect(() => () => {
      shared.references--;
      const stop = () => { shared.timer = setTimeout(() => { if (!shared.references) { void shared.fiber?.dispose?.(); services.delete(profile); } }, 1000); shared.timer.unref?.(); };
      if (shared.service?.pending) void shared.service.pending.finally(stop).catch(() => {}); else stop();
    });
  });
}
