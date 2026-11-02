import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {createDeadlineService,normalizeDeadlineFeed,DEADLINES_SOURCE} from '../src/workbench/deadlines.js';

const mockFeed={generated_at:'2026-11-01T11:59:37+00:00',conferences:[
  {short_name:'CVPR',full_name:'IEEE/CVF Conference on Computer Vision',ccf_rank:'A',submission_date:'2026-11-16',
    conference_date:'2027-06-20',fields:['ai','cv'],detail_page:'https://www.myhuiban.com/conference/100',updated_at:'2026-10-30'},
  {short_name:'NAACL',full_name:'North American Chapter of ACL',ccf_rank:'B',submission_date:null,
    fields:['nlp'],detail_page:'javascript:alert(1)'},
  {short_name:'Not Ranked',ccf_rank:'',submission_date:'2026-11-14'},
]};
const cookie={requestRejection:(req)=>req.headers.cookie==='dsh-ok=yes'?undefined:401};
async function withRoot(t){const root=await mkdtemp(join(tmpdir(),'rwb-ccf-'));
  t.after(async()=>rm(root,{recursive:true,force:true}));return root;}

test('normalizes ranks, dates and untrusted links without inventing times',()=>{
  const data=normalizeDeadlineFeed(mockFeed);
  assert.equal(data.conferences.length,2);
  const cvpr=data.conferences.find(x=>x.name==='CVPR');
  assert.equal(cvpr.deadline,'2026-11-16');
  assert.equal(cvpr.rank,'A');
  const naacl=data.conferences.find(x=>x.name==='NAACL');
  assert.equal(naacl.deadline,null);
  assert.equal(naacl.page,'');
  assert.equal(data.source,DEADLINES_SOURCE);
  assert.match(data.attribution,/时区/);
});

test('fetch caches, provides offline fallback, and persists JSON',async t=>{
  const root=await withRoot(t);let hits=0,fail=false;
  const fetchImpl=async()=>{hits++;if(fail)throw Error('offline');return {
    ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify(mockFeed)
  }};
  const a=createDeadlineService({root,fetchImpl,connection:cookie,now:()=>2000000000000});
  const first=await a.list();assert.equal(first.ok,true);assert.equal(first.stale,false);
  assert.equal(first.conferences.length,2);
  const again=await a.list();assert.equal(again.cache,true);assert.equal(hits,1);
  fail=true;
  const fallback=await a.list(true);assert.equal(fallback.ok,true);assert.equal(fallback.stale,true);
  const b=createDeadlineService({root,fetchImpl,connection:cookie,now:()=>2000000000000});
  const cached=await b.list();assert.equal(cached.cache,true);assert.equal(cached.conferences.length,2);
});

test('GET API uses DSH cookie auth and rejects unauthorized requests',async t=>{
  const root=await withRoot(t);
  const fetchImpl=async()=>({ok:true,headers:{get:()=>null},text:async()=>JSON.stringify(mockFeed)});
  const service=createDeadlineService({root,fetchImpl,connection:cookie});
  const server=createServer((req,res)=>service.handle(req,res));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url=`http://127.0.0.1:${server.address().port}/research-workbench/deadlines`;
  assert.equal((await fetch(url)).status,403);
  const accepted=await fetch(url,{headers:{cookie:'dsh-ok=yes'}});
  assert.equal(accepted.status,200);
  const d=await accepted.json();assert.equal(d.conferences.length,2);
  assert.equal((await fetch(url,{method:'POST',headers:{cookie:'dsh-ok=yes'}})).status,405);
});

test('bad upstream data is never reported as a successful fresh feed',async t=>{
  const root=await withRoot(t);
  const svc=createDeadlineService({root,connection:cookie,fetchImpl:async()=>({ok:true,headers:{get:()=>null},text:async()=>JSON.stringify({conferences:[]})})});
  const result=await svc.list();assert.equal(result.ok,false);
});
