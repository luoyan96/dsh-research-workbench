import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm,readFile,writeFile,mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { createLiteratureService, arxivId, baseId, parseArxiv, bibtex, registerLiteratureTools } from '../src/workbench/literature.js';
const feed=(version='v1',title='Attention &amp; Evidence')=>`<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/" xmlns:arxiv="http://arxiv.org/schemas/atom"><opensearch:totalResults>1</opensearch:totalResults><entry><id>http://arxiv.org/abs/1706.03762${version}</id><title>${title}</title><summary>Actual abstract &lt;script&gt;ignored&lt;/script&gt;</summary><author><name>Alice A.</name></author><author><name>Bob B.</name></author><published>2017-06-12T00:00:00Z</published><updated>2017-06-13T00:00:00Z</updated><category term="cs.CL"/><arxiv:primary_category term="cs.CL"/><arxiv:doi>10.1234/test</arxiv:doi></entry></feed>`;
const auth={requestRejection:req=>req.headers.cookie==='test=yes'?undefined:401};
async function service(t,extra={}){const root=await mkdtemp(path.join(tmpdir(),'rwb-literature-'));const value=createLiteratureService({root,intervalMs:0,fetchImpl:async()=>new Response(feed()),...extra});t.after(async()=>{await value.dispose();await rm(root,{recursive:true,force:true});});return {value,root};}
const ready=async(value,id)=>{for(let i=0;i<100;i++){const state=await value.pdf(id);if(state.status!=='loading')return state;await new Promise(r=>setTimeout(r,5));}throw Error('PDF did not settle');};

test('strict arXiv IDs handle new/old/versioned URLs and reject paths and external URLs',()=>{
  assert.equal(arxivId('https://arxiv.org/pdf/1706.03762v7.pdf'),'1706.03762v7');assert.equal(baseId('hep-th/9901001v2'),'hep-th/9901001');
  assert.equal(baseId('1706.03762V7'),'1706.03762');
  for(const id of ['../x','1706.03762/../../x','https://evil.test/1706.03762','C:\\private','/1706.03762','1706.03762v0','1706.03762?url=http://localhost'])assert.throws(()=>arxivId(id));
});
test('Atom parsing preserves authors/source metadata and rejects entities, broken or error feeds',()=>{
  const {papers,total}=parseArxiv(feed());assert.equal(total,1);assert.deepEqual(papers[0].authors,['Alice A.','Bob B.']);assert.equal(papers[0].title,'Attention & Evidence');assert.equal(papers[0].primaryClass,'cs.CL');assert.equal(papers[0].doi,'10.1234/test');assert.equal(papers[0].pdfUrl,'https://arxiv.org/pdf/1706.03762v1');
  assert.throws(()=>parseArxiv('<!DOCTYPE a [<!ENTITY x SYSTEM "file:///secret">]>'+feed()));assert.throws(()=>parseArxiv('<feed>'));assert.throws(()=>parseArxiv('<feed><entry><id>http://arxiv.org/api/errors#bad</id></entry></feed>'));assert.equal(parseArxiv('<feed><totalResults>0</totalResults></feed>').papers.length,0);
});
test('BibTeX is deterministic, deduplicated, escaped and explicitly an arXiv preprint',()=>{
  const p=parseArxiv(feed()).papers[0];p.title='A {B} 50% & C \\input{evil}';const result=bibtex([p,p]);assert.equal((result.match(/@misc/g)||[]).length,1);assert.match(result,/arxiv_1706_03762/);assert.match(result,/author = \{Alice A\. and Bob B\.\}/);assert.match(result,/eprint = \{1706.03762v1\}/);assert.match(result,/50\\% \\&/);assert.match(result,/\\textbackslash\{\}input\\\{evil\\\}/);assert.doesNotMatch(result,/journal|booktitle/);assert.equal(result,bibtex([p]));
});
test('search singleflight/daily cache, version dedup, concurrent favorites and offline restart preserve the library',async t=>{
  let hits=0,clock=2000000000000,fail=false,version='v1';const fetchImpl=async()=>{hits++;if(fail)throw Error('offline');return new Response(feed(version));};
  const {value,root}=await service(t,{fetchImpl,now:()=>clock});const [a,b]=await Promise.all([value.search({query:'attention'}),value.search({query:'attention'})]);assert.equal(hits,1);assert.deepEqual(a,b);await value.search({query:'attention'});assert.equal(hits,1);
  await Promise.all([value.favorite(a.papers[0].id,true),value.favorite(a.papers[0].id,true)]);assert.equal((await value.favorites()).papers.length,1);
  version='v2';const newer=await value.search({query:'ti:attention'});await value.favorite(newer.papers[0].id,true);assert.equal((await value.favorites()).papers[0].id,'1706.03762v2');
  fail=true;clock+=86400001;const cached=await value.search({query:'attention'});assert.equal(cached.stale,true);assert.match(cached.warning,/offline/);
  const restarted=createLiteratureService({root,fetchImpl});t.after(()=>restarted.dispose());assert.equal((await restarted.favorites()).papers[0].id,'1706.03762v2');assert.match(await restarted.exportBib(['1706.03762v2']),/archivePrefix = \{arXiv\}/);await restarted.favorite('1706.03762v1',false);assert.equal((await restarted.favorites()).papers.length,0);
  await assert.rejects(value.favorite('9999.99999',true),{code:'NOT_FOUND'});await assert.rejects(value.exportBib(['9999.99999']),{code:'NOT_FOUND'});
});
test('PDF jobs run independently of the request, cache by validated ID, persist and reject HTML or untrusted redirects',async t=>{
  let fetches=0,release;const gate=new Promise(r=>release=r);let mode='pdf';const {value}=await service(t,{fetchImpl:async url=>{if(url.includes('/api/'))return new Response(feed());fetches++;await gate;if(mode==='html')return new Response('<html>not PDF</html>');if(mode==='redirect')return new Response(null,{status:302,headers:{location:'https://evil.test/private'}});return new Response('%PDF-1.7\nsynthetic bounded fixture');}});
  await value.search({query:'attention'});assert.equal((await value.pdf('1706.03762v1',true)).status,'loading');await value.pdf('1706.03762v1',true);assert.equal(fetches,1);release();assert.equal((await ready(value,'1706.03762v1')).status,'ready');assert.equal((await value.pdf('1706.03762v1',true)).status,'ready');assert.equal(fetches,1);
  for(const failure of ['html','redirect']){mode=failure;const {value:other}=await service(t,{fetchImpl:async url=>url.includes('/api/')?new Response(feed()):failure==='html'?new Response('not a PDF'):new Response(null,{status:302,headers:{location:'http://127.0.0.1/private'}})});await other.search({query:'attention'});await other.pdf('1706.03762v1',true);assert.equal((await ready(other,'1706.03762v1')).status,'error');}
});
test('bad queries, oversized feeds and damaged library files are reported without overwriting local data',async t=>{
  const {value}=await service(t,{fetchImpl:async()=>new Response('x',{headers:{'content-length':String(4*1024*1024)}})});await assert.rejects(value.search({query:'a'}),{code:'BAD_QUERY'});await assert.rejects(value.search({query:'attention'}),/体积超限/);
  const root=await mkdtemp(path.join(tmpdir(),'rwb-bad-library-'));t.after(()=>rm(root,{recursive:true,force:true}));await mkdir(path.join(root,'literature'));const file=path.join(root,'literature/library.json');await writeFile(file,'broken');const bad=createLiteratureService({root});await assert.rejects(bad.favorites());assert.equal(await readFile(file,'utf8'),'broken');await bad.dispose();
});
test('authenticated API serves exact routes, favorite intent, citation download and PDF byte ranges',async t=>{
  const {value}=await service(t,{connection:auth,fetchImpl:async url=>new Response(url.includes('/api/')?feed():'%PDF-1.7\nfixture')});const server=createServer((req,res)=>value.handle(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port+'/research-workbench/literature',headers={cookie:'test=yes'},post=(route,body,extra={})=>fetch(base+route,{method:'POST',headers:{...headers,'content-type':'application/json','x-research-workbench-literature':'1',...extra},body:JSON.stringify(body)});
  assert.equal((await fetch(base+'/favorites')).status,403);assert.equal((await fetch(base+'/search?q=attention',{headers})).status,200);assert.equal((await post('/favorite',{id:'1706.03762v1',saved:true},{'x-research-workbench-literature':'0'})).status,403);assert.equal((await post('/favorite',{id:'1706.03762v1',saved:true},{origin:'https://evil.test'})).status,403);assert.equal((await post('/favorite',{id:'1706.03762v1',saved:true})).status,200);
  const bib=await post('/bibtex',{ids:['1706.03762v1']});assert.match(bib.headers.get('content-disposition'),/references.bib/);assert.match(await bib.text(),/@misc/);
  await post('/pdf',{id:'1706.03762v1'});await ready(value,'1706.03762v1');const partial=await fetch(base+'/pdf?id=1706.03762v1',{headers:{...headers,range:'bytes=0-4'}});assert.equal(partial.status,206);assert.equal(await partial.text(),'%PDF-');assert.equal((await fetch(base+'/pdf?id=1706.03762v1',{headers:{...headers,range:'bytes=99999-'}})).status,416);assert.equal((await fetch(base+'/assets/nope.mjs',{headers})).status,404);assert.equal((await fetch(base+'/favorites/extra',{headers})).status,404);
});
test('literature tools use native raw schemas and expose actual search/library/citation results',async t=>{
  const {value}=await service(t);const specs=[];const dispose=registerLiteratureTools({tools:{register(spec){specs.push(spec);return()=>specs.splice(specs.indexOf(spec),1);}}},value);assert.equal(specs.length,3);assert.ok(specs.every(x=>x.parameters.type==='object'&&x.output.schema.type==='string'));const result=JSON.parse(await specs[0].execute({query:'attention'}));await specs[1].execute({action:'save',id:result.papers[0].id});assert.equal(JSON.parse(await specs[1].execute({action:'list'})).papers.length,1);assert.match(JSON.parse(await specs[2].execute({ids:[result.papers[0].id]})).bibtex,/@misc/);dispose();assert.equal(specs.length,0);
});
