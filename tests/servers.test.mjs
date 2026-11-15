import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm,readFile,writeFile,mkdir } from 'node:fs/promises';
import { randomUUID,generateKeyPairSync } from 'node:crypto';
import ssh2 from 'ssh2';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { createServerService,validateServer } from '../src/workbench/servers.js';
import { createCredentialProtector } from '../src/workbench/ssh-credentials.js';
import { registerServerTools } from '../src/workbench/server-tools.js';
import { sshFixture } from './helpers/ssh-fixture.mjs';
const connection={requestRejection:req=>req.headers.cookie==='test=yes'?undefined:401};
async function fixture(t,extra={}) {
  const root=await mkdtemp(path.join(tmpdir(),'rwb-ssh-'));const host=await sshFixture(extra.fixtureOptions);
  const service=createServerService({root,protector:createCredentialProtector(path.join(root,'vault'),{platform:'linux'}),connection,...extra});await service.ready;
  t.after(async()=>{await service.dispose();await host.close();await rm(root,{recursive:true,force:true});});
  return {root,host,service,async save(){return service.save({name:'Synthetic SSH',host:'127.0.0.1',port:host.port,username:'research-test',auth:'password',password:'synthetic-password-only',directory:"/tmp/fixture directory's"});},async trust(server){const probe=await service.check(server.id);assert.equal(probe.connectionStatus,'needs-trust');return service.trust(server.id,probe.revision,probe.observedFingerprint);}};
}
test('server validation rejects option-like hosts, invalid ports and non-absolute remote directories',()=>{
  const input={name:'test',host:'localhost',username:'research-test',auth:'agent'};assert.equal(validateServer(input).port,22);
  for(const patch of [{host:'-oProxyCommand=bad'},{username:'user@host'},{port:0},{directory:'relative/path'},{auth:'key',keyFile:'relative-key'}])assert.throws(()=>validateServer({...input,...patch}));
});
test('real SSH handshake pins fingerprints before authentication, probes GPU and redacts credentials',async t=>{
  const f=await fixture(t),saved=await f.save();assert.equal(saved.hasPassword,true);assert.equal('credential' in saved,false);
  const probe=await f.service.check(saved.id);assert.equal(probe.connectionStatus,'needs-trust');assert.match(probe.observedFingerprint,/^SHA256:/);assert.equal(f.host.authAttempts.length,0);
  await assert.rejects(f.service.trust(saved.id,probe.revision,'SHA256:wrong'),/指纹/);await f.service.trust(saved.id,probe.revision,probe.observedFingerprint);
  const checked=await f.service.check(saved.id);assert.equal(checked.connectionStatus,'online');assert.equal(checked.gpus[0].memoryTotal,24576);
  assert.ok(!JSON.stringify(await f.service.list()).includes('synthetic-password-only'));assert.ok(!(await readFile(path.join(f.root,'ssh','servers.json'),'utf8')).includes('synthetic-password-only'));
  await assert.rejects(f.service.save({...saved,password:'changed',revision:saved.revision}),/记录已变化/);
});
test('remote jobs return before completion, persist both output streams and use real exit codes',async t=>{
  const f=await fixture(t),server=await f.trust(await f.save());
  const job=await f.service.submit({serverId:server.id,command:'success-fixture',title:'Successful fixture'});await f.service.idle();
  const detail=await f.service.logs(job.id);assert.equal(detail.job.status,'succeeded');assert.equal(detail.job.exitCode,0);assert.match(detail.stdout,/remote stdout/);assert.match(detail.stderr,/remote stderr/);
  assert.match(f.host.commands.at(-1),/cd -- '\/tmp\/fixture directory'\\''s'/);
  const failed=await f.service.submit({serverId:server.id,command:'fail-fixture'});await f.service.idle();assert.equal((await f.service.logs(failed.id)).job.exitCode,7);assert.equal((await f.service.logs(failed.id)).job.status,'failed');
});
test('disconnect, output capture limit and stop tracking never claim remote completion',async t=>{
  const f=await fixture(t,{maxLogBytes:512}),server=await f.trust(await f.save());
  const lost=await f.service.submit({serverId:server.id,command:'disconnect-fixture'});await f.service.idle();assert.equal((await f.service.logs(lost.id)).job.status,'unknown');
  const flood=await f.service.submit({serverId:server.id,command:'flood-fixture'});await f.service.idle();const log=await f.service.logs(flood.id);assert.equal(log.job.status,'unknown');assert.ok(Buffer.byteLength(log.stdout)<=512);
  const held=await f.service.submit({serverId:server.id,command:'hold-fixture'});assert.equal(f.service.isBusy(),true);const stopped=await f.service.stopTracking(held.id);assert.ok(['unknown','failed'].includes(stopped.status));assert.match(stopped.message,/停止|未启动/);
});
test('untrusted hosts cannot receive jobs and a changed key cannot authenticate',async t=>{
  const f=await fixture(t),server=await f.save();await assert.rejects(f.service.submit({serverId:server.id,command:'never'}),/指纹/);
  const probe=await f.service.check(server.id);await f.service.trust(server.id,probe.revision,probe.observedFingerprint);
  const file=path.join(f.root,'ssh','servers.json');await f.service.dispose();const data=JSON.parse(await readFile(file,'utf8'));data.servers[0].fingerprint='SHA256:wrong';await writeFile(file,JSON.stringify(data));
  const other=createServerService({root:f.root,protector:createCredentialProtector(path.join(f.root,'vault'),{platform:'linux'})});t.after(()=>other.dispose());await other.ready;
  const changed=await other.check(server.id);assert.equal(changed.connectionStatus,'changed-key');assert.equal(f.host.authAttempts.length,0);
});
test('dead-host jobs recover as unknown',async t=>{
  const f=await fixture(t);await f.service.dispose();
  const id=randomUUID(),folder=path.join(f.root,'ssh','jobs',id);await mkdir(folder,{recursive:true});await writeFile(path.join(folder,'job.json'),JSON.stringify({id,status:'running',ownerPid:process.pid,owner:'not-a-live-owner',createdAt:new Date().toISOString()}));
  const other=createServerService({root:f.root});t.after(()=>other.dispose());await other.ready;assert.equal((await other.listJobs())[0].status,'unknown');
});
test('encrypted private keys authenticate over SSH without a password prompt',async t=>{
  const pair=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs1',format:'pem',cipher:'aes-256-cbc',passphrase:'synthetic-key-passphrase'},publicKeyEncoding:{type:'spki',format:'pem'}});
  const key=ssh2.utils.parseKey(pair.privateKey,'synthetic-key-passphrase');assert.ok(!(key instanceof Error));
  const f=await fixture(t,{fixtureOptions:{authorizedKey:key}}),keyFile=path.join(f.root,'synthetic private key.pem');await writeFile(keyFile,pair.privateKey);
  const saved=await f.service.save({name:'key fixture',host:'127.0.0.1',port:f.host.port,username:'research-test',auth:'key',keyFile,passphrase:'synthetic-key-passphrase'});
  await f.trust(saved);const checked=await f.service.check(saved.id);assert.equal(checked.connectionStatus,'online');assert.ok(f.host.authAttempts.includes('publickey'));
});
test('another live host keeps tracking ownership and persisted logs',async t=>{
  const f=await fixture(t),server=await f.trust(await f.save());const job=await f.service.submit({serverId:server.id,command:'hold-fixture'});
  const other=createServerService({root:f.root});t.after(()=>other.dispose());await other.ready;assert.ok(['queued','connecting','running'].includes((await other.listJobs())[0].status));assert.equal((await other.listJobs())[0].canStopTracking,false);
  await f.service.stopTracking(job.id);assert.ok(['unknown','failed'].includes((await other.listJobs())[0].status));
});
test('a tracking deadline preserves unknown outcome instead of claiming the remote job stopped',async t=>{
  const f=await fixture(t,{jobTimeoutMs:40}),server=await f.trust(await f.save());const job=await f.service.submit({serverId:server.id,command:'hold-fixture'});await f.service.idle();const detail=await f.service.logs(job.id);assert.equal(detail.job.status,'unknown');assert.match(detail.job.message,/时限/);
});
test('a log write failure settles tracking without an unhandled rejection or false success',async t=>{
  const f=await fixture(t,{appendLog:async()=>{throw Error('synthetic disk full');}}),server=await f.trust(await f.save());const job=await f.service.submit({serverId:server.id,command:'hold-fixture'});await f.service.idle();const detail=await f.service.logs(job.id);assert.equal(detail.job.status,'unknown');assert.match(detail.job.message,/日志无法写入/);
});
test('SSH API rejects unauthenticated and cross-site writes, secrets stay out of responses',async t=>{
  const f=await fixture(t),server=createServer((req,res)=>f.service.handle(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  const base='http://127.0.0.1:'+server.address().port+'/research-workbench/servers';assert.equal((await fetch(base)).status,403);
  const body={name:'test',host:'127.0.0.1',port:f.host.port,username:'research-test',auth:'password',password:'synthetic-password-only'};
  const headers={cookie:'test=yes','content-type':'application/json'};assert.equal((await fetch(base+'/save',{method:'POST',headers,body:JSON.stringify(body)})).status,403);
  const intent={...headers,'x-research-workbench-ssh':'1'};assert.equal((await fetch(base+'/save',{method:'POST',headers:{...intent,origin:'https://foreign.example'},body:JSON.stringify(body)})).status,403);
  const accepted=await fetch(base+'/save',{method:'POST',headers:intent,body:JSON.stringify(body)});assert.equal(accepted.status,200);assert.ok(!(await accepted.text()).includes(body.password));
});
test('model tools do not manage credentials or trust keys and request native approval for remote execution',async()=>{
  const tools=[],listeners=[];registerServerTools({tools:{register:x=>{tools.push(x);return()=>{};}},on:(name,handler)=>listeners.push({name,handler})},{list:async()=>({servers:[{id:'test',keyFile:'private-path',hasPassword:true}]} )});
  assert.equal(tools.length,5);assert.ok(!JSON.stringify(await tools[0].execute({},{})).includes('private-path'));
  const handler=listeners[0].handler;assert.equal((await handler({name:'research_server_submit_job',arguments:{serverId:'test',command:'train'}},async()=>({kind:'allow'}))).kind,'ask');
  assert.equal((await handler({name:'research_server_submit_job'},async()=>({kind:'deny',reason:'read only'}))).kind,'deny');
  const unsupported=[];registerServerTools({tools:{register:x=>{unsupported.push(x);}}},{});await assert.rejects(unsupported.find(x=>x.name==='research_server_submit_job').execute({serverId:'test',command:'never'},{}),/原生工具确认/);
});
test('local credentials round-trip with authenticated encryption; Windows uses DPAPI',async t=>{
  const root=await mkdtemp(path.join(tmpdir(),'rwb-credential-'));t.after(()=>rm(root,{recursive:true,force:true}));const protector=createCredentialProtector(root);
  const cipher=await protector.protect({password:'synthetic vault password'});assert.ok(!cipher.includes('synthetic'));assert.match(cipher,process.platform==='win32'?/^dpapi:/:/^aes:/);assert.equal((await protector.unprotect(cipher)).password,'synthetic vault password');
});
