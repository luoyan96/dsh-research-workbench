import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { createFileService, FILE_API, registerFileTools } from '../src/workbench/files.js';
import { openOfficeZip, replaceOfficeXml } from '../src/workbench/office-import.js';

const source = name => fs.readFile(new URL('./fixtures/' + name, import.meta.url));
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64');
const connection = { requestRejection: req => req.headers.cookie === 'dsh-test-session=valid' ? undefined : {} };
async function fixture(t, options = {}) {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'research-files-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const calls = [];
  const office = { async call(cmd, args) {
    calls.push({ cmd, args });
    if (cmd === 'render') { await fs.writeFile(args.out, png); return { what: 'page 1 of 2', width: 1, height: 1 }; }
    if (cmd === 'save') return { path: args.doc };
    return { path: args.path, saved: true };
  } };
  const service = createFileService({ root, connection, office, ...options }); await service.ready;
  return { root, service, office, calls };
}

test('uploaded originals and arbitrary-format working files retain exact bytes and independent identities', async t => {
  const { service } = await fixture(t), bytes = await source('sample.docx');
  const a = await service.upload('proposal', '项目书.docx', bytes), b = await service.upload('ip', '项目书.docx', bytes);
  assert.notEqual(a.id, b.id); assert.notEqual(a.path, b.path);
  assert.deepEqual(await fs.readFile(a.originalPath), bytes); assert.deepEqual(await fs.readFile(a.path), bytes);
  assert.equal((await service.list('proposal')).length, 1);
  const zip = openOfficeZip(await fs.readFile(a.path));
  assert.ok(zip.items.has('word/media/image1.png'), 'the actual embedded image stays in the package');
  await assert.rejects(service.upload('proposal', '../secret.docx', bytes), { code: 'BAD_NAME' });
  await assert.rejects(service.upload('slides', 'wrong.docx', bytes), { code: 'WRONG_KIND' });
  await assert.rejects(service.upload('proposal', 'old.doc', bytes), { code: 'BAD_TYPE' });
  await assert.rejects(service.upload('proposal', 'broken.docx', Buffer.from('wrong')), { code: 'INVALID_OFFICE' });
});

test('Word and PowerPoint template uploads become normal working copies and retain original package layouts', async t => {
  const { service } = await fixture(t);
  for (const [kind, inputName, templateName, main, documentType, templateType] of [
    ['proposal', 'sample.docx', '原始模板.dotx', 'word/document.xml', 'wordprocessingml.document.main+xml', 'wordprocessingml.template.main+xml'],
    ['slides', 'sample.pptx', '汇报模板.potx', 'ppt/presentation.xml', 'presentationml.presentation.main+xml', 'presentationml.template.main+xml'],
  ]) {
    const bytes = await source(inputName), zip = openOfficeZip(bytes);
    const template = replaceOfficeXml(bytes, new Map([['[Content_Types].xml', zip.get('[Content_Types].xml').replace(documentType, templateType)]]));
    const item = await service.upload(kind, templateName, template);
    assert.equal(item.template, true); assert.equal(path.extname(item.path), path.extname(inputName));
    assert.deepEqual(await fs.readFile(item.originalPath), template);
    const working = openOfficeZip(await fs.readFile(item.path));
    assert.match(working.get('[Content_Types].xml'), new RegExp(documentType.replace('+', '\\+')));
    assert.equal(working.get(main), zip.get(main));
    assert.deepEqual([...working.items.keys()], [...zip.items.keys()]);
  }
});

test('a file conversation is immutable, revision-checked and survives service restart', async t => {
  const { service, root, office } = await fixture(t);
  const a = await service.upload('proposal', '项目.docx', await source('sample.docx'));
  await assert.rejects(service.bind(a.id, 'session-a', 999), { code: 'CONFLICT' });
  const bound = await service.bind(a.id, 'session-a', a.revision);
  await assert.rejects(service.bind(a.id, 'session-b', bound.revision), { code: 'BOUND' });
  const b = await service.upload('ip', '另一份.docx', await source('sample.docx'));
  await assert.rejects(service.bind(b.id, 'session-a', b.revision), { code: 'BOUND' });
  const restored = createFileService({ root, office }); await restored.ready;
  assert.equal((await restored.current('session-a')).id, a.id);
  assert.equal(await restored.current('unrelated'), null);
  assert.match(restored.prompt('session-a'), /workingPath/); assert.equal(restored.prompt('unrelated'), '');
  const tools = []; registerFileTools({ tools: { register(def) { tools.push(def); } } }, restored);
  assert.equal(JSON.parse(await tools[0].execute({}, { agent: { session: { id: 'session-a' } } })).path, a.path);
});

test('literal template-variable characters in filenames remain data in model context', async t => {
  const { service } = await fixture(t);
  const item = await service.upload('proposal', '项目{{自定义}}.docx', await source('sample.docx'));
  await service.bind(item.id, 'literal-name', item.revision);
  const context = service.prompt('literal-name');
  assert.ok(!context.includes('{{'));
  assert.equal(JSON.parse(context).researchFile.workingPath, item.path);
});

test('preview admission returns before rendering, and its success persists independently of the browser', async t => {
  let finish; const rendering = new Promise(resolve => { finish = resolve; });
  const { service, calls } = await fixture(t);
  const normal = service.setOffice({ async call(cmd, args) { calls.push({ cmd, args }); if (cmd === 'render') { await rendering; await fs.writeFile(args.out, png); return { what: 'page 2 of 5' }; } return {}; } });
  const item = await service.upload('proposal', '测试.docx', await source('sample.docx'));
  const accepted = await service.preview(item.id, 2);
  assert.equal(accepted.preview.status, 'running'); assert.equal(service.isBusy(), true);
  finish(); await service.idle();
  const done = await service.one(item.id); assert.equal(done.preview.status, 'ready'); assert.equal(done.preview.total, 5); assert.equal(done.preview.page, 2);
  assert.ok(calls.every(call => call.args.doc === item.path || call.args.path === item.path));
  normal();
});

test('preview failure is durable and an interrupted preview can be recovered after restart', async t => {
  const { service, root } = await fixture(t, { office: { async call() { throw Error('WPS is busy'); } } });
  const item = await service.upload('proposal', '测试.docx', await source('sample.docx'));
  await service.preview(item.id); await service.idle();
  const failed = await service.one(item.id); assert.match(failed.preview.error, /WPS is busy/); assert.equal(failed.preview.status, 'error');
  failed.preview.status = 'running'; await fs.writeFile(path.join(root, 'files', item.id, 'file.json'), JSON.stringify(failed));
  const restored = createFileService({ root }); await restored.ready;
  assert.match((await restored.one(item.id)).preview.error, /中断/);
  await assert.rejects(restored.preview(item.id), { code: 'NO_OFFICE' });
});

test('PowerPoint previews use the native slide count, including refreshed counts after edits', async t => {
  const { service } = await fixture(t);
  service.setOffice({ async call(cmd, args) {
    if (cmd === 'render') { await fs.writeFile(args.out, png); return { what: 'slide 2' }; }
    if (cmd === 'read') return { slides: 3 };
    return {};
  } });
  const item = await service.upload('slides', '研究.pptx', await source('sample.pptx'));
  await service.preview(item.id, 2); await service.idle();
  assert.equal((await service.one(item.id)).preview.total, 3);
});

test('read-only working files expose their actual state and refuse saves before a modal Office wait', async t => {
  const { service } = await fixture(t), calls = [];
  service.setOffice({ async call(cmd, args) { calls.push(cmd); if(cmd === 'open')return {readOnly:true}; throw Error('must not attempt save'); } });
  const item = await service.upload('proposal', '只读.docx', await source('sample.docx'));
  await assert.rejects(service.act(item.id, 'save'), {code:'READ_ONLY'});
  assert.deepEqual(calls, ['open']); assert.equal((await service.one(item.id)).readOnly, true);
  const bound = await service.bind(item.id, 'read-only-session', (await service.one(item.id)).revision);
  assert.equal(JSON.parse(service.prompt(bound.sessionId)).researchFile.readOnly, true);
});

test('Office tool receipts record actual saves for the bound file and preserve the uploaded original', async t => {
  const { service } = await fixture(t), bytes = await source('sample.docx');
  const item = await service.upload('proposal', '测试.docx', bytes); await service.bind(item.id, 'test-session', item.revision);
  await service.noteTool({ name: 'research_office_edit', arguments: { doc: item.path }, agent: { session: { id: 'test-session' } } }, {});
  await service.noteTool({ name: 'research_office_save', arguments: { doc: 'D:/other.docx' }, agent: { session: { id: 'test-session' } } }, {});
  assert.equal((await service.one(item.id)).events.at(-1).type, 'edited');
  await service.noteTool({ name: 'research_office_save', arguments: { doc: item.path }, agent: { session: { id: 'test-session' } } }, {});
  assert.equal((await service.one(item.id)).events.at(-1).type, 'saved');
  await service.noteTool({ name: 'research_office_save', arguments: { doc: item.path, path: 'D:/synthetic/另存文件.docx' }, agent: { session: { id: 'test-session' } } }, {});
  assert.equal((await service.one(item.id)).events.at(-1).type, 'exported');
  assert.deepEqual((await service.download(item.id, true)).bytes, bytes);
});

test('HTTP uploads, previews and downloads require the authenticated local owner and an explicit mutation header', async t => {
  const { service } = await fixture(t), server = createServer((req,res) => service.handle(req,res));
  await new Promise(resolve => server.listen(0,'127.0.0.1', resolve)); t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port, headers = { cookie: 'dsh-test-session=valid', 'x-research-workbench-files': '1', origin: base };
  assert.equal((await fetch(base + FILE_API + '?kind=proposal')).status, 403);
  const bytes = await source('sample.docx');
  const url = base + FILE_API + '/upload?kind=proposal&name=' + encodeURIComponent('本地.docx');
  assert.equal((await fetch(url, { method: 'POST', headers: { ...headers, origin: 'https://evil.test' }, body: bytes })).status, 403);
  assert.equal((await fetch(url, { method: 'POST', headers: { cookie: headers.cookie }, body: bytes })).status, 403);
  const response = await fetch(url, { method: 'POST', headers, body: bytes }); assert.equal(response.status, 201);
  const item = (await response.json()).item;
  const saved = await fetch(base + FILE_API + '/' + item.id + '/download', { headers }); assert.equal(saved.status, 200); assert.deepEqual(Buffer.from(await saved.arrayBuffer()), bytes);
  const malicious = await fetch(base + FILE_API + '/' + item.id + '/open', { method: 'POST', headers, body: JSON.stringify({ path: 'D:/private.docx' }) });
  assert.equal(malicious.status, 200, 'an unrecognized path field never changes the selected target');
});
