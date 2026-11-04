import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { createPaperService } from '../src/papers.js';

// A real child process on Windows as well as Unix, with deterministic TeX-like
// progress/failure. No test touches the user's compiler, cache, or papers.
async function fixture(t, options = {}) {
  const root = await mkdtemp(join(tmpdir(), 'rwb-compile-jobs-'));
  const binary = join(root, 'fake-tectonic.cjs');
  await writeFile(binary, `
const fs = require('node:fs'); const path = require('node:path');
if (process.argv.includes('--version')) { console.log('Tectonic 0.17.0 test'); process.exit(0); }
const source = fs.readFileSync('main.tex', 'utf8');
console.log('reading main.tex');
if (source.includes('WAIT_FOREVER')) { setInterval(() => console.log('still downloading'), 30); }
else setTimeout(() => {
  if (source.includes('BROKEN_TEX')) { console.error('main.tex:17: Undefined control sequence'); process.exit(1); }
  const output = process.argv[process.argv.indexOf('--outdir') + 1];
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'main.pdf'), '%PDF-1.4 compile-job-test');
  console.log('typeset success');
}, 700);
`);
  const settings = { root, tectonic: process.execPath, tectonicArgs: [binary],
    connection: { requestRejection: req => req.headers.cookie === 'test-session=yes' ? undefined : 401 }, ...options };
  const service = createPaperService(settings);
  const server = createServer((req, res) => void service.handle(req, res));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const request = (id, suffix = '', init = {}) => fetch(origin + '/research-workbench/api/papers/' + id + suffix, {
    ...init, headers: { cookie: 'test-session=yes', origin, ...init.headers },
  });
  t.after(async () => { await service.dispose(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(root, { recursive: true, force: true }); });
  return { root, service, settings, request };
}
async function until(read, condition) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    const value = await read();
    if (condition(value)) return value;
    await delay(20);
  }
  assert.fail('expected compiler state did not arrive');
}

test('HTTP starts a background job, exposes live output and restores its log from disk', async t => {
  const { service, settings, request, root } = await fixture(t);
  const project = await service.create('Background compile');
  const response = await request(project.id, '/compile', { method: 'POST' });
  assert.equal(response.status, 202);
  const started = (await response.json()).compile;
  assert.equal(started.status, 'running');
  assert.equal((await request(project.id, '/compile', { method: 'POST' })).status, 409);
  await assert.rejects(service.archive(project.id), error => error.code === 'COMPILE_BUSY');
  const live = await until(() => service.compileStatus(project.id), state => state.log.includes('reading main.tex'));
  assert.equal(live.status, 'running', 'output must be visible before the compiler finishes');
  const finished = await until(() => service.compileStatus(project.id), state => state.status === 'succeeded');
  assert.match(finished.log, /typeset success/);
  await until(() => service.compileHistory(project.id), history => history.length === 1);
  const saved = JSON.parse(await readFile(join(root, 'papers', project.id, 'build', 'compile.json'), 'utf8'));
  assert.equal(saved.status, 'succeeded');
  const reopened = createPaperService(settings);
  assert.equal((await reopened.compileStatus(project.id)).log, finished.log);
  assert.equal((await reopened.details(project.id)).hasPdf, true);
  const historyResponse = await request(project.id, '/compiles/' + started.id);
  assert.equal(historyResponse.status, 200);
  assert.match((await historyResponse.json()).compile.log, /reading main.tex/);
});

test('failure, timeout and cancellation keep logs and the last successful PDF', async t => {
  const { service, request } = await fixture(t);
  const project = await service.create('Keep previous PDF');
  await service.compile(project.id);
  const source = await service.readSource(project.id, 'main.tex');
  await service.saveSource(project.id, 'main.tex', source.content + '\nBROKEN_TEX', source.sha);
  const failed = await service.startCompile(project.id);
  const result = await until(() => service.compileStatus(project.id), state => state.status === 'failed');
  assert.equal(result.code, 'COMPILE_FAILED');
  assert.match(result.log, /Undefined control sequence/);
  assert.match((await service.pdf(project.id)).toString(), /compile-job-test/);
  await until(() => service.compileHistory(project.id), history => history.length === 2);
  assert.match((await service.compileHistory(project.id, failed.id)).log, /Undefined control sequence/);
  const next = await service.readSource(project.id, 'main.tex');
  await service.saveSource(project.id, 'main.tex', 'WAIT_FOREVER', next.sha);
  await service.startCompile(project.id);
  await until(() => service.compileStatus(project.id), state => state.log.includes('reading main.tex'));
  const stopped = await request(project.id, '/compile/cancel', { method: 'POST' });
  assert.equal(stopped.status, 200);
  assert.equal((await stopped.json()).compile.status, 'cancelled');
  assert.equal((await service.details(project.id)).hasPdf, true);
  assert.equal((await service.compileHistory(project.id)).length, 3);
});

test('compiler timeout is a durable failure with the actual output', async t => {
  const { service } = await fixture(t, { compileTimeoutMs: 180 });
  const project = await service.create('Timeout');
  const source = await service.readSource(project.id, 'main.tex');
  await service.saveSource(project.id, 'main.tex', 'WAIT_FOREVER', source.sha);
  await assert.rejects(service.compile(project.id), error => {
    assert.equal(error.code, 'COMPILE_TIMEOUT');
    assert.match(error.log, /reading main.tex/);
    return true;
  });
  assert.equal((await service.compileStatus(project.id)).status, 'failed');
  assert.match((await service.compileHistory(project.id))[0].error, /编译超时/);
});

test('a disconnected start request does not cancel the server-owned compiler', async t => {
  const { service, request } = await fixture(t);
  const project = await service.create('Leave the page');
  const controller = new AbortController();
  const started = await request(project.id, '/compile', { method: 'POST', signal: controller.signal });
  assert.equal(started.status, 202);
  await started.json();
  controller.abort();
  await until(() => service.compileStatus(project.id), state => state.status === 'succeeded');
  assert.equal((await service.details(project.id)).hasPdf, true);
});

test('host restart records interrupted jobs instead of leaving a permanent running state', async t => {
  const { root, service, settings } = await fixture(t);
  const project = await service.create('Interrupted compile');
  await service.compile(project.id);
  const file = join(root, 'papers', project.id, 'build', 'compile.json');
  const record = JSON.parse(await readFile(file, 'utf8'));
  Object.assign(record, { status: 'running', instance: 'old-host-instance', processId: -1, ok: null, finishedAt: null, log: 'previous compiler output\n' });
  await writeFile(file, JSON.stringify(record));
  const restarted = createPaperService(settings);
  const recovered = await restarted.compileStatus(project.id);
  assert.equal(recovered.status, 'interrupted');
  assert.match(recovered.log, /previous compiler output/);
  assert.match(recovered.error, /已中断/);
  assert.equal((await restarted.details(project.id)).hasPdf, true);
});

test('compile progress, history and cancellation retain the existing authentication boundary', async t => {
  const { service, request } = await fixture(t);
  const project = await service.create('Private compile records');
  for (const suffix of ['/compile', '/compiles']) {
    assert.equal((await request(project.id, suffix, { headers: { cookie: '' } })).status, 403);
  }
  assert.equal((await request(project.id, '/compile/cancel', { method: 'POST', headers: { cookie: '' } })).status, 403);
  assert.equal((await request(project.id, '/compiles/not-a-valid-id')).status, 400);
});

test('host unload stops its compiler and persists the cancellation before disposal completes', async t => {
  const { service, settings } = await fixture(t);
  const project = await service.create('Host unload');
  await service.startCompile(project.id);
  await until(() => service.compileStatus(project.id), state => state.log.includes('reading main.tex'));
  await service.dispose();
  const reopened = createPaperService(settings);
  assert.equal((await reopened.compileStatus(project.id)).status, 'cancelled');
  assert.match((await reopened.compileHistory(project.id))[0].error, /已停止/);
});

test('a missing compiler produces a durable error rather than losing the failed request', async t => {
  const { service } = await fixture(t, { tectonic: join(tmpdir(), 'no-such-rwb-compiler') });
  const project = await service.create('Missing engine');
  await service.startCompile(project.id);
  const failed = await until(() => service.compileStatus(project.id), state => state.status === 'failed');
  assert.equal(failed.code, 'ENGINE_MISSING');
  assert.match(failed.log, /没有检测到 Tectonic/);
  assert.equal((await service.compileHistory(project.id)).length, 1);
});

test('another live DSH host is not falsely reported interrupted or silently cancelled', async t => {
  const { root, service, settings } = await fixture(t);
  const project = await service.create('Other host');
  await service.compile(project.id);
  const file = join(root, 'papers', project.id, 'build', 'compile.json');
  const record = JSON.parse(await readFile(file, 'utf8'));
  Object.assign(record, { status: 'running', instance: 'another-live-instance', processId: process.pid, ok: null, finishedAt: null });
  await writeFile(file, JSON.stringify(record));
  const other = createPaperService(settings);
  assert.equal((await other.compileStatus(project.id)).status, 'running');
  await assert.rejects(other.startCompile(project.id), error => error.code === 'COMPILE_BUSY');
  await assert.rejects(other.cancelCompile(project.id), error => error.code === 'COMPILE_OTHER_HOST');
});
