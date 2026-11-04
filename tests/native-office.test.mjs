import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as office from '../lib/native-office.js';
import { verifyOfficeSource, adaptOfficeHelper, OFFICE_STATUS } from '../scripts/build-native-office.mjs';
import { nativeOfficeBusy, trackOfficeCall } from '../src/workbench/native-office-activity.js';

const read = name => readFile(new URL('../' + name, import.meta.url), 'utf8');
const names = ['open', 'status', 'read', 'edit', 'help', 'render', 'save', 'close'].map(name => 'research_office_' + name);

function fakeOffice() {
  const calls = [];
  const helper = { async call(cmd, args) {
    calls.push({ cmd, args });
    if (cmd === 'open') return { app: 'ppt', suite: 'wps', path: args.path, name: 'research.pptx', saved: true, active: true, how: 'created' };
    if (cmd === 'edit') return { done: ['title updated'], failed: null };
    if (cmd === 'save') return { app: 'ppt', path: args.path || 'C:\\synthetic\\research.pptx', bytes: 10000 };
    if (cmd === 'status') return [];
    return 'closed';
  }, onEvent() { return () => {}; }, dispose() {} };
  const tools = office.createTools({ helper, settings: () => ({ ...office.DEFAULTS, suite: 'wps', silent: true, finalCheck: false }), saveImage: async () => { throw Error('unexpected render'); }, vision: async () => true });
  const run = (name, args) => tools.find(tool => tool.name === name).execute(args, { signal: new AbortController().signal });
  return { tools, calls, run };
}

test('the complete upstream snapshot retains its pinned bytes and MIT copyright', async () => {
  const receipt = await verifyOfficeSource();
  assert.equal(Object.keys(receipt.files).length, 36);
  assert.match(await read('vendor/copylee-office/LICENSE'), /Copyright \(c\) 2026 Copy/);
  assert.match(await read('NOTICE.md'), /2069af2d6b2b2a9819321a73ea3427716b686608/);
});

test('the merged component registers eight distinct tool names and keeps usage references consistent', () => {
  const f = fakeOffice();
  assert.deepEqual(f.tools.map(tool => tool.name).sort(), [...names].sort());
  assert.ok(f.tools.every(tool => !/^office_/.test(tool.name)));
  assert.match(office.promptText(), /research_office_open/);
  assert.match(office.redirectText('office-pptx', 'ppt'), /research_office_edit/);
  assert.equal(office.ENTRY_ID, 'research-native-office');
  assert.equal(office.name, 'dsh-research-workbench/native-office');
});

test('merged open/edit/save tools retain the native WPS path and silent-mode arguments', async () => {
  const f = fakeOffice(), doc = 'C:\\synthetic\\research.pptx';
  const opened = await f.run('research_office_open', { path: doc });
  assert.match(opened.text, /WPS/);
  assert.match(opened.text, /research_office_edit/);
  await f.run('research_office_edit', { doc, ops: [{ op: 'set_text', slide: 1, shape: 'title', text: '研究计划' }] });
  await f.run('research_office_save', { doc });
  assert.equal(f.calls[0].cmd, 'open');
  assert.equal(f.calls[0].args.silent, true); assert.equal(f.calls[0].args.show, false);
  assert.ok(f.calls.some(call => call.cmd === 'edit' && call.args.ops[0].text === '研究计划'));
  assert.ok(f.calls.some(call => call.cmd === 'save'));
});

test('a human-opened document cannot be closed through the merged tools', async () => {
  await assert.rejects(fakeOffice().run('research_office_close', { doc: 'C:\\human\\personal.pptx', save: false }), /open|user|yours/i);
});

test('the compiled helper is reproducible, separately cached and never sweeps historical PIDs', async () => {
  const source = await read('vendor/copylee-office/helper/OfficeHelper.cs');
  const helper = await read('helper/OfficeHelper.cs');
  assert.equal(helper, adaptOfficeHelper(source));
  assert.doesNotMatch(helper, /process\.Kill\(/);
  assert.match(helper, /research-workbench-office/);
  assert.match(office.helperSourcePath().replaceAll('\\', '/'), /\/helper\/OfficeHelper\.cs$/);
});

test('settings and host status use the research namespace without DOM navigation scraping', async () => {
  const client = await read('lib/client.js');
  assert.match(client, /Office \/ WPS/);
  assert.match(client, /\/api\/research-workbench\/office\/status/);
  assert.doesNotMatch(client, /\/api\/dsh-office\/status|MutationObserver|querySelectorAll/);
  const manifest = JSON.parse(await read('package.json'));
  assert.equal(manifest.exports['./native-office'], './lib/native-office.js');
  assert.match(await read('cordis.patch.yml'), /id: research-native-office/);
});

test('pending background save/close remains busy after agent idle and clears on success or failure', async () => {
  let finish;
  const saving = trackOfficeCall(() => new Promise(resolve => { finish = resolve; }));
  assert.equal(nativeOfficeBusy(), true);
  finish('saved'); assert.equal(await saving, 'saved');
  assert.equal(nativeOfficeBusy(), false);
  await assert.rejects(trackOfficeCall(() => { throw Error('save failed'); }), /save failed/);
  assert.equal(nativeOfficeBusy(), false);
});

test('host integration contributes tools, guidance and an authenticated exact POST route', { skip: process.platform !== 'win32' }, () => {
  const definitions = [], routes = [], sections = [], disposers = [];
  const ctx = {
    tools: { register(definition) { definitions.push(definition); return () => {}; } },
    attachments: { saveImage: async () => { throw Error('unexpected render'); } },
    logger: { warn() {}, info() {} },
    effect(factory) { const disposer = factory(); if (disposer) disposers.push(disposer); return disposer; },
    on() {},
    get(name) { return this[name]; },
    connection: { fetch: { register(route) { routes.push(route); return () => {}; } } },
    systemPrompt: { section(section) { sections.push(section); return () => {}; } },
    inject(_names, callback) { callback(this); },
  };
  office.apply(ctx);
  assert.deepEqual(definitions.map(tool => tool.name).sort(), [...names].sort());
  assert.equal(routes.length, 1); assert.equal(routes[0].path, OFFICE_STATUS);
  assert.deepEqual(routes[0].methods, ['POST']);
  assert.equal(sections[0].name, 'research-office:guide');
  assert.match(sections[0].text, /research_office_open/);
  for (const dispose of disposers.reverse()) dispose();
});

test('host waits for every Office agent before settling, and updates stay blocked until background save finishes', { skip: process.platform !== 'win32' }, async () => {
  const original = office.HelperClient.prototype.call;
  const calls = [], hooks = new Map(), disposers = [];
  let finish;
  office.HelperClient.prototype.call = async function (cmd) {
    calls.push(cmd);
    return cmd === 'settle' ? new Promise(resolve => { finish = resolve; }) : [];
  };
  const ctx = {
    tools: { register() { return () => {}; } }, attachments: {}, logger: { warn() {}, info() {} },
    effect(factory) { const dispose = factory(); if (dispose) disposers.push(dispose); },
    on(name, handler) { hooks.set(name, handler); }, get(name) { return this[name]; },
    connection: { fetch: { register() { return () => {}; } } },
    systemPrompt: { section() { return () => {}; } }, inject(_names, callback) { callback(this); },
  };
  try {
    office.apply(ctx);
    const a = {}, b = {};
    hooks.get('tools/pre-execute')({ name: 'research_office_open', agent: a }, () => {});
    hooks.get('tools/pre-execute')({ name: 'research_office_edit', agent: b }, () => {});
    hooks.get('agent/status')({ agent: a, status: 'idle' });
    assert.deepEqual(calls, [], 'one idle agent must not close another agent’s documents');
    hooks.get('agent/status')({ agent: b, status: 'idle' });
    assert.deepEqual(calls, ['card', 'settle']);
    assert.equal(nativeOfficeBusy(), true, 'agent idle is not the end of a background save');
    finish([]); await new Promise(resolve => setImmediate(resolve));
    assert.equal(nativeOfficeBusy(), false);
  } finally {
    finish?.([]); await new Promise(resolve => setImmediate(resolve));
    office.HelperClient.prototype.call = original;
    for (const dispose of disposers.reverse()) dispose();
  }
});
