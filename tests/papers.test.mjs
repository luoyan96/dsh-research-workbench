import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, symlink, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { createPaperService, authorized } from '../src/papers.js';

// Simulation of DSH's signed-cookie admission. Production uses ctx.connection.
const testConnection = {
  requestRejection(req) {
    return req.headers.cookie === 'dsh-test-session=valid' ? undefined : 401;
  },
};


async function fixture(t, tectonic) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-rwb-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return createPaperService({ root, ...(tectonic ? { tectonic } : {}), connection: testConnection });
}

function rejectsCode(promise, code) {
  return assert.rejects(promise, err => err.code === code);
}

test('projects persist, edit multi-file sources, check optimistic versions, and archive safely', async t => {
  const service = await fixture(t);
  assert.deepEqual(await service.list(), []);
  const project = await service.create('Agent 安全论文');
  assert.equal((await service.list()).length, 1);
  const original = await service.readSource(project.id, 'main.tex');
  assert.match(original.content, /\\section\{Introduction\}/);
  assert.match(original.content, /Agent 安全论文/);
  const updated = await service.saveSource(project.id, 'main.tex', original.content + '\n% Revision 2\n', original.sha);
  assert.match((await service.readSource(project.id, 'main.tex')).content, /Revision 2/);
  await rejectsCode(service.saveSource(project.id, 'main.tex', 'lost update', original.sha), 'VERSION_CONFLICT');
  await rejectsCode(service.saveSource(project.id, 'main.tex', 'no sha', null), 'VERSION_CONFLICT');
  const newly = await service.saveSource(project.id, 'sections/method.tex', 'Our method.', null);
  assert.equal((await service.readSource(project.id, 'sections/method.tex')).sha, newly.sha);
  await rejectsCode(service.saveSource(project.id, 'sections/method.tex', 'replace without sha', null), 'VERSION_CONFLICT');
  await service.upload(project.id, 'figures/test.png', Buffer.from([0x89, 0x50, 0x4E, 0x47]));
  const details = await service.details(project.id);
  assert.equal(details.files.length, 4);
  assert.ok(details.files.find(f => f.path === 'figures/test.png' && !f.editable));
  assert.equal(details.hasPdf, false);
  const titleChanged = await service.rename(project.id, 'Revised Paper');
  assert.equal(titleChanged.title, 'Revised Paper');
  await service.archive(project.id);
  assert.equal((await service.list()).length, 0);
  await rejectsCode(service.readSource(project.id, 'main.tex'), 'NOT_FOUND');
  assert.notEqual(updated.sha, original.sha);
});

test('reject traversal, symlinks, invalid names and oversized editable sources', async t => {
  const service = await fixture(t);
  const p = await service.create('Safe paper');
  for (const filename of ['../bad.tex', 'a/../../secret.tex', '/absolute.tex', '.config', 'C:/Windows/paper.tex', 'CON.tex', 'a\\..\\bad.tex']) {
    await rejectsCode(service.saveSource(p.id, filename, 'x', null), 'INVALID_PATH');
  }
  await rejectsCode(service.saveSource(p.id, 'paper.exe', 'x', null), 'INVALID_TYPE');
  await rejectsCode(service.saveSource(p.id, 'oversize.tex', 'a'.repeat(2 * 1024 * 1024 + 1), null), 'TOO_LARGE');
  await rejectsCode(service.upload(p.id, 'a.json', Buffer.from('{}')), 'INVALID_TYPE');
  if (process.platform !== 'win32') {
    await symlink('/etc/hosts', join(service.root, 'papers', p.id, 'evil.tex'));
    await rejectsCode(service.readSource(p.id, 'evil.tex'), 'INVALID_PATH');
    await rejectsCode(service.saveSource(p.id, 'evil.tex', 'bad', null), 'INVALID_PATH');
  }
});

test('loopback-only HTTP API rejects cross-site writes and provides persistent paper JSON', async t => {
  const service = await fixture(t);
  const server = createServer((req, res) => service.handle(req, res));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}`;
  const post = (origin, body) => fetch(url + '/research-workbench/api/papers', { method:'POST', headers: { origin, cookie:'dsh-test-session=valid', 'content-type':'application/json' }, body:JSON.stringify(body) });
  assert.equal((await post('https://example.invalid', {title:'Cross origin'})).status, 403);
  const created = await post(url, {title:'Research from DSH'});
  assert.equal(created.status, 201);
  const project = (await created.json()).project;
  assert.equal(project.title, 'Research from DSH');
  const listed = await fetch(url + '/research-workbench/api/papers', {headers: {cookie:'dsh-test-session=valid'}});
  assert.equal((await listed.json()).projects.length, 1);
  const file = await fetch(url + `/research-workbench/api/papers/${project.id}/file?path=main.tex`, {headers:{cookie:'dsh-test-session=valid'}});
  assert.equal(file.status, 200);
  assert.match((await file.json()).content, /Research from DSH/);
  assert.equal((await fetch(url + '/research-workbench/api/papers/foo/file?path=main.tex', {headers:{cookie:'dsh-test-session=valid'}})).status, 400);
  assert.equal((await fetch(url + `/research-workbench/api/papers/${project.id}/file?path=..%2Fsecret.tex`, {headers:{cookie:'dsh-test-session=valid'}})).status, 400);
  const content = await service.readSource(project.id, 'main.tex');
  const edit = await fetch(url + `/research-workbench/api/papers/${project.id}/file?path=main.tex`, {
    method:'PUT',headers:{origin:url,cookie:'dsh-test-session=valid','content-type':'application/json'},
    body:JSON.stringify({content:content.content+'\n% From Web API',expectedSha:content.sha}),
  });
  assert.equal(edit.status, 200);
  assert.match((await service.readSource(project.id, 'main.tex')).content, /From Web API/);
  // Desktop's authenticated proxy forwards the Host's signed cookie but strips
  // Origin, including for POST/PUT. Missing Origin alone must not reject it.
  const desktopCreate = await fetch(url + '/research-workbench/api/papers', {
    method:'POST',headers:{cookie:'dsh-test-session=valid','content-type':'application/json'},
    body:JSON.stringify({title:'Desktop paper'}),
  });
  assert.equal(desktopCreate.status,201);
  assert.equal((await desktopCreate.json()).project.title,'Desktop paper');
  assert.equal((await fetch(url + '/research-workbench/api/papers', {
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({title:'Unauthenticated'}),
  })).status,403);
  assert.equal((await fetch(url + '/research-workbench/api/papers', {
    method:'POST',headers:{origin:'null',cookie:'dsh-test-session=valid','content-type':'application/json'},
    body:JSON.stringify({title:'Opaque origin'}),
  })).status,403);
  assert.equal((await fetch(url + '/research-workbench/api/papers', {
    headers:{cookie:'dsh-test-session=valid','sec-fetch-site':'cross-site'},
  })).status,403);

});

test('Tectonic compilation uses approved binary and produces a retrievable PDF', { skip: process.platform === 'win32' }, async t => {
  const root = await mkdtemp(join(tmpdir(), 'rwb-fake-tectonic-'));
  t.after(() => rm(root, {recursive:true,force:true}));
  const binary = join(root, 'tectonic');
  await writeFile(binary, `#!${process.execPath}\nconst fs=require('node:fs');const path=require('node:path');\nif(process.argv.includes('--version')){console.log('tectonic 0.17.0');process.exit(0)}\nconst args=process.argv.slice(2);\nconst out=args[args.indexOf('--outdir')+1];\nif(fs.readFileSync('main.tex','utf8').includes('BROKEN-TEX')){console.error('main.tex:2: error');process.exit(1)}\nfs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'main.pdf'),'%PDF-1.4 fake-test');\nconsole.log('typeset success');\n`, {mode:0o755});
  await chmod(binary,0o755);
  const service = await fixture(t, binary);
  const p = await service.create('Compile test');
  assert.equal((await service.probe()).available, true);
  const result = await service.compile(p.id);
  assert.equal(result.ok, true);
  assert.match((await service.pdf(p.id)).toString(), /%PDF-1.4/);
  assert.equal((await service.details(p.id)).hasPdf, true);
  const a = await service.readSource(p.id,'main.tex');
  await service.saveSource(p.id,'main.tex', a.content+'\nBROKEN-TEX\n',a.sha);
  await rejectsCode(service.compile(p.id),'COMPILE_FAILED');
  // Last successful PDF stays available on a failed compilation.
  assert.match((await service.pdf(p.id)).toString(), /%PDF-1.4/);
});

test('Cordis host plugin registers and disposes research API prefixes', async () => {
  const host = await import('../src/index.js');
  assert.deepEqual(host.inject, ['webServer', 'connection']);
  const registrations = [];
  const effectDisposers = [];
  const ctx = {
    connection: testConnection,
    webServer: { register(route) {
      registrations.push(route);
      return () => registrations.splice(registrations.indexOf(route), 1);
    } },
    effect(factory) { effectDisposers.push(factory()); },
  };
  host.apply(ctx);
  assert.equal(registrations.length, 4);
  assert.deepEqual(registrations.map(r=>r.path), ['/research-workbench/files','/research-workbench/api','/research-workbench/content','/research-workbench/deadlines']);
  for (const r of registrations) { assert.equal(r.kind, 'prefix'); assert.equal(typeof r.handler,'function'); }
  for (const dispose of effectDisposers) dispose();
  assert.equal(registrations.length, 0);
});

test('Cordis host activates model-facing tools only if tools service exists', async () => {
  const host=await import('../src/index.js');
  const registrations=[];
  const disposers=[];
  const specs=[];
  const ctx={
    connection:testConnection,
    webServer:{register(r){registrations.push(r);return()=>{};}},
    tools:{register(spec){specs.push(spec);return()=>{specs.splice(specs.indexOf(spec),1);}}},
    effect(factory){disposers.push(factory());},
    inject(names,cb){if(names[0]==='tools')cb(this);},
  };
  host.apply(ctx);
  assert.equal(registrations.length,4);
  assert.equal(specs.length,8);
  assert.ok(specs.every(s=>s.parameters.type==='object'&&s.output.schema.type==='string'));
  for (const dispose of disposers.reverse()) dispose();
  assert.equal(specs.length,0);
});
