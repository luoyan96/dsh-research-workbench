import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { competitionDate,normalizeCompetitions,createCompetitionService,COMPETITIONS_SOURCE } from '../src/workbench/competitions.js';
const feed={data:[{name:'Research Challenge',url:'https://example.org/challenge',deadline:'15 Dec 2026','registration-deadline':'1 Dec 2026',conference:'NeurIPS','conference-year':2026,tags:['science'],platform:'Codabench'},{name:'Unknown date',url:'https://example.org/unknown',deadline:'11 May 2026 Apr 2026'},{name:'unsafe link',url:'javascript:alert(1)',deadline:'1 Dec 2026'}]};
const auth={requestRejection:req=>req.headers.cookie==='test=yes'?undefined:401};
async function root(t){const value=await mkdtemp(path.join(tmpdir(),'rwb-competitions-'));t.after(()=>rm(value,{recursive:true,force:true}));return value;}
test('competition dates remain date-only and reject malformed or impossible dates',()=>{
  assert.equal(competitionDate('7 Dec 2026'),'2026-12-07');assert.equal(competitionDate('29 Feb 2024'),'2024-02-29');assert.equal(competitionDate('29 Feb 2026'),null);assert.equal(competitionDate('11 May 2026 Apr 2026'),null);
  const value=normalizeCompetitions(feed);assert.equal(value.competitions.length,2);assert.equal(value.invalidDates,1);assert.equal(value.competitions[0].registrationDeadline,'2026-12-01');assert.equal(value.competitions[1].submissionDeadline,null);assert.equal(value.competitions[1].dateIssue,true);
  assert.equal(normalizeCompetitions(feed).competitions[0].id,value.competitions[0].id);assert.throws(()=>normalizeCompetitions({data:[]}));
  const conflicting=normalizeCompetitions({data:[{...feed.data[0],deadline:'1 Dec 2026','registration-deadline':'15 Dec 2026'}]});assert.equal(conflicting.timelineConflicts,1);assert.equal(conflicting.competitions[0].timelineConflict,true);
});
test('competition cache distinguishes source commit date from retrieval and survives offline restart',async t=>{
  const directory=await root(t);let failed=false,hits=0;
  const fetchImpl=async url=>{hits++;if(failed)throw Error('offline');return Response.json(url===COMPETITIONS_SOURCE?feed:[{commit:{committer:{date:'2026-11-10T16:24:21Z'}}}]);};
  const options={root:directory,fetchImpl,now:()=>2000000000000};const service=createCompetitionService(options);
  const [a,b]=await Promise.all([service.list(true),service.list(true)]);assert.equal(hits,2);assert.equal(a.sourceUpdatedAt,'2026-11-10T16:24:21Z');assert.equal(a.fetchedAt,2000000000000);assert.deepEqual(a,b);
  failed=true;const cached=await createCompetitionService(options).list(true);assert.equal(cached.stale,true);assert.equal(cached.competitions.length,2);
});
test('competition metadata failure stays unknown and a broken feed never claims freshness',async t=>{
  const directory=await root(t);const service=createCompetitionService({root:directory,fetchImpl:async url=>{if(url!==COMPETITIONS_SOURCE)throw Error('rate limited');return Response.json(feed);}});
  assert.equal((await service.list()).sourceUpdatedAt,null);
  const bad=createCompetitionService({root:await root(t),fetchImpl:async()=>Response.json({data:[]})});assert.equal((await bad.list()).ok,false);
});
test('competition API requires DSH authentication and permits only exact GET route',async t=>{
  const service=createCompetitionService({root:await root(t),connection:auth,fetchImpl:async url=>Response.json(url===COMPETITIONS_SOURCE?feed:[])});
  const server=createServer((req,res)=>service.handle(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  const url='http://127.0.0.1:'+server.address().port+'/research-workbench/competitions';assert.equal((await fetch(url)).status,403);assert.equal((await fetch(url,{headers:{cookie:'test=yes'}})).status,200);assert.equal((await fetch(url,{method:'POST',headers:{cookie:'test=yes'}})).status,405);
});
