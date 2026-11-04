import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { createUpdateService, compareVersions, PLUGIN_NAME } from '../src/workbench/updates.js';
import { backupPlugin, verifyPluginArchive } from '../src/workbench/update-archive.js';

async function packageAt(profile, version) {
  const root = path.join(profile, 'node_modules', PLUGIN_NAME);
  await mkdir(path.join(root, 'lib'), { recursive: true });
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ name: PLUGIN_NAME, version, main: './lib/index.js', dsh: { bundle: { patch: './cordis.patch.yml' } } }));
  await writeFile(path.join(root, 'lib/index.js'), 'export const version = ' + JSON.stringify(version));
  await writeFile(path.join(root, 'lib/client.js'), '// browser module');
  await writeFile(path.join(root, 'cordis.patch.yml'), '- insert: []');
}
async function fixture(t, mode = 'normal') {
  const directory = await mkdtemp(path.join(tmpdir(), 'research-updates-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const profile = path.join(directory, 'profile');
  await packageAt(profile, '0.3.3');
  await packageAt(path.join(directory, 'target'), '0.3.4');
  const archive = await backupPlugin(path.join(directory, 'target'), '0.3.4', path.join(directory, 'release.tgz'));
  const bytes = await readFile(archive);
  const digest = 'sha256:' + createHash('sha256').update(bytes).digest('hex');
  let clock = Date.now(), current = '0.3.3', broken = false, idle = true;
  const calls = [];
  const manager = {
    async listBundles() { return current ? [{ name: PLUGIN_NAME, version: current, installed: true, enabled: true }] : []; },
    async removeBundle(name) { calls.push(['remove', name]); current = null; return { changed: true, application: 'applied' }; },
    async installBundle(spec, options) {
      calls.push(['install', spec, options]);
      if (mode === 'hmr' && current) return { changed: false, application: 'failed', error: { code: 'already-installed' } };
      const file = await readFile(spec);
      const version = spec.endsWith('previous.tgz') ? '0.3.3' : '0.3.4';
      verifyPluginArchive(file, version);
      current = version;
      if (mode === 'fail-target' && version === '0.3.4') throw Error('native manager threw after writing files');
      if (mode === 'fail-restore') return { changed: true, application: 'failed', error: { code: 'package-manager' } };
      return { changed: true, application: 'restart-required' };
    },
  };
  const release = { id: 123, tag_name: 'v0.3.4', body: '新增后台编译与更新。\n<script>not executable</script>', assets: [{ name: `${PLUGIN_NAME}-0.3.4.tgz`, size: bytes.length, digest, browser_download_url: `https://github.com/luoyan96/${PLUGIN_NAME}/releases/download/v0.3.4/${PLUGIN_NAME}-0.3.4.tgz` }] };
  // This fixture runs an old build while installing a newer one, independently of the repository's current release.
  const options = { version: '0.3.3', directory: profile, manager, now: () => clock, canInstall: () => idle, fetchImpl: async url => {
    if (broken) return new Response('offline', { status: 503 });
    if (String(url).includes('api.github.com')) return Response.json(release);
    return new Response(bytes);
  } };
  const service = createUpdateService(options);
  const client = { id: randomUUID(), dirty: false, busy: false };
  service.heartbeat(client);
  return { service, profile, options, manager, release, bytes, calls, client, setBroken: value => broken = value, setIdle: value => idle = value, advance: value => clock += value, setVersion: value => current = value };
}
const confirmation = state => ({ version: state.release.version, revision: state.revision, confirmation: 'update-research-plugin' });

test('stable version comparison never offers equal, older or custom builds as an upgrade', () => {
  assert.equal(compareVersions('0.10.0', '0.3.9'), 1);
  assert.equal(compareVersions('0.3.3', '0.3.3'), 0);
  assert.equal(compareVersions('0.3.2', '0.3.3'), -1);
  assert.equal(compareVersions('0.3.4-dev', '0.3.3'), null);
});

test('check, remind tomorrow, ignore and automatic-check preference survive service restart', async t => {
  const f = await fixture(t);
  let state = await f.service.check();
  assert.equal(state.available, true); assert.equal(state.reminder, true); assert.match(state.release.notes, /后台编译/);
  state = await f.service.choice({ action: 'later', revision: state.revision });
  assert.equal(state.reminder, false);
  f.advance(86400001);
  state = await f.service.snapshot(); assert.equal(state.reminder, true);
  state = await f.service.choice({ action: 'ignore', version: state.release.version, revision: state.revision });
  assert.equal(state.available, true); assert.equal(state.reminder, false);
  state = await f.service.choice({ action: 'preferences', checkEnabled: false, revision: state.revision });
  const restarted = await createUpdateService(f.options).snapshot();
  assert.equal(restarted.checkEnabled, false); assert.equal(restarted.ignoredVersion, '0.3.4');
  await assert.rejects(f.service.choice({ action: 'later', revision: state.revision - 1 }), /状态已变化/);
});

test('a failed check is visible, never claims latest, and automatic checks back off for a day', async t => {
  const f = await fixture(t);
  f.setBroken(true); await f.service.tick();
  let state = await f.service.snapshot();
  assert.equal(state.checkedAt, null); assert.match(state.lastError, /503/);
  f.setBroken(false); await f.service.tick();
  assert.equal((await f.service.snapshot()).checkedAt, null);
  f.advance(86400001); await f.service.tick();
  assert.equal((await f.service.snapshot()).lastError, null);
});

test('check rejects a release asset outside the fixed repository or without a digest', async t => {
  const f = await fixture(t);
  f.release.assets[0].browser_download_url = 'https://untrusted.invalid/plugin.tgz';
  assert.match((await f.service.check()).lastError, /发行包缺失/);
  assert.equal(f.calls.length, 0);
});

test('updates require fresh explicit confirmation and idle pages and host', async t => {
  const f = await fixture(t);
  let state = await f.service.check();
  await assert.rejects(f.service.start({ ...confirmation(state), confirmation: '' }), /确认更新/);
  f.service.heartbeat({ ...f.client, dirty: true });
  await assert.rejects(f.service.start(confirmation(state)), /保存科研工作台/);
  f.service.heartbeat(f.client); f.setIdle(false);
  await assert.rejects(f.service.start(confirmation(state)), /论文编译/);
  f.setIdle(true); f.advance(31 * 60 * 1000);
  await assert.rejects(f.service.start(confirmation(state)), /重新检查/);
  assert.equal(f.calls.length, 0);
});

test('verified package is installed by the native manager, keeps enabled state and requires restart', async t => {
  const f = await fixture(t);
  const state = await f.service.check();
  await f.service.start(confirmation(state)); await f.service.pending;
  const result = await f.service.snapshot();
  assert.equal(result.operation.status, 'restart-required');
  assert.equal(result.installedVersion, '0.3.4'); assert.equal(result.runningVersion, '0.3.3');
  assert.equal(f.calls[0][0], 'install'); assert.equal(f.calls[0][2].enabled, true); assert.equal(f.calls[0][2].saveExact, true);
  assert.match(result.operation.message, /手动重启/);
  const restarted = await createUpdateService({ ...f.options, version: '0.3.4' }).snapshot();
  assert.equal(restarted.operation.status, 'succeeded');
});

test('HMR already-installed result uses native remove/install and retains the old package backup', async t => {
  const f = await fixture(t, 'hmr');
  await f.service.start(confirmation(await f.service.check())); await f.service.pending;
  assert.equal((await f.service.snapshot()).operation.status, 'restart-required');
  assert.deepEqual(f.calls.map(x => x[0]), ['install', 'remove', 'install']);
});

test('native throw after package writes triggers exact-package recovery', async t => {
  const f = await fixture(t, 'fail-target');
  await f.service.start(confirmation(await f.service.check())); await f.service.pending;
  const result = await f.service.snapshot();
  assert.equal(result.operation.status, 'failed'); assert.equal(result.installedVersion, '0.3.3');
  assert.match(result.operation.message, /已恢复/);
  assert.ok(f.calls.some(x => x[1].endsWith('previous.tgz')));
});

test('failed recovery remains explicit and blocks repeated installation', async t => {
  const f = await fixture(t, 'fail-restore');
  await f.service.start(confirmation(await f.service.check())); await f.service.pending;
  const result = await f.service.snapshot();
  assert.equal(result.operation.status, 'restore-failed'); assert.match(result.operation.message, /恢复未确认/);
  await assert.rejects(f.service.start(confirmation(result)), /核对原生插件管理/);
});

test('digest mismatch stops before package mutation', async t => {
  const f = await fixture(t);
  f.release.assets[0].digest = 'sha256:' + '0'.repeat(64);
  await f.service.start(confirmation(await f.service.check())); await f.service.pending;
  assert.equal(f.calls.length, 0);
  assert.match((await f.service.snapshot()).operation.message, /SHA-256/);
});

test('two simultaneous confirmations launch at most one native installation', async t => {
  const f = await fixture(t);
  const input = confirmation(await f.service.check());
  const outcomes = await Promise.allSettled([f.service.start(input), f.service.start(input)]);
  await f.service.pending;
  assert.equal(outcomes.filter(x => x.status === 'fulfilled').length, 1);
  assert.equal(f.calls.filter(x => x[0] === 'install').length, 1);
});

test('backup excludes separate research materials and tar validation rejects tampering', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.profile, 'private-research.txt'), 'must not travel with plugin');
  const archive = await backupPlugin(f.profile, '0.3.3', path.join(f.profile, 'backup.tgz'));
  const data = await readFile(archive);
  assert.equal(verifyPluginArchive(data, '0.3.3').version, '0.3.3');
  assert.ok(!gunzipSync(data).includes(Buffer.from('private-research')));
  assert.throws(() => verifyPluginArchive(data, '0.3.4'), /名称、版本/);
});

test('exact POST protocol rejects missing browser intent header and absent consent', async t => {
  const f = await fixture(t);
  const request = (input, headers = { 'content-type': 'application/json', 'x-research-workbench-updates': '1' }) => new Request('http://localhost/research-workbench/updates', { method: 'POST', headers, body: JSON.stringify(input) });
  assert.equal((await f.service.handle(request({ action: 'check' }, {}))).status, 403);
  const state = (await (await f.service.handle(request({ action: 'check', client: f.client }))).json()).value;
  assert.equal((await f.service.handle(request({ action: 'install', revision: state.revision, version: '0.3.4', client: f.client }))).status, 400);
  assert.equal(f.calls.length, 0);
});
