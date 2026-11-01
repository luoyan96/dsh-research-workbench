import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {createContentService,ContentError,templateCatalog} from '../src/workbench/content.js';
import {makeDocx,makePptx,zipEntries,makeMarkdown} from '../src/workbench/office.js';
import {registerResearchTools} from '../src/workbench/tools.js';
import {createPaperService} from '../src/papers.js';
const testConnection={requestRejection:req=>req.headers.cookie==='dsh-test-session=valid'?undefined:401};

const unpack=(b)=>{
  // deterministic zip local headers; enough to inspect OOXML without an npm dependency.
  const z=Buffer.isBuffer(b)?b:Buffer.from(b);
  const result=new Map();let pos=0;
  while(z.readUInt32LE(pos)===0x04034b50){
    const comp=z.readUInt16LE(pos+8),size=z.readUInt32LE(pos+18),n=z.readUInt16LE(pos+26),extra=z.readUInt16LE(pos+28);
    const name=z.subarray(pos+30,pos+30+n).toString();
    const data=z.subarray(pos+30+n+extra,pos+30+n+extra+size);
    const decoded=comp===8?(awaitInflate(data)):data;
    result.set(name,decoded.toString('utf8'));
    pos+=30+n+extra+size;
  }
  return result;
};
import {inflateRawSync} from 'node:zlib';
const awaitInflate=b=>inflateRawSync(b);
async function fixture(t){const root=await mkdtemp(join(tmpdir(),'rwb-four-'));t.after(()=>rm(root,{recursive:true,force:true}));return createContentService({root,connection:testConnection});}

test('templates cover proposal, presentation, patent, and software copyright',()=>{
 const all=templateCatalog();
 assert.deepEqual(Object.keys(all),['proposal','slides','ip']);
 assert.equal(all.proposal.length>=3,true);
 assert.ok(all.ip.find(v=>v.id==='patent'));
 assert.ok(all.ip.find(v=>v.id==='software'));
});

test('local documents persist, edit with revisions, and archive by type',async t=>{
 const svc=await fixture(t);
 for(const [kind,template] of [['proposal','pilot'],['slides','defense'],['ip','patent'],['ip','software']]){
   const created=await svc.create(kind,'智能体安全关键技术研究',template);
   assert.equal(created.revision,1);
   const original=await svc.one(kind,created.id);
   assert.ok((original.doc.slides||original.doc.sections).length>=2);
   const doc=structuredClone(original.doc);
   const first=kind==='slides'?doc.slides[1]:doc.sections[0];first.body='改写后的科研内容，尚未通过审稿。';
   const next=await svc.update(kind,created.id,doc,original.revision);
   assert.equal(next.revision,2);
   assert.equal((await svc.one(kind,created.id)).revision,2);
   await assert.rejects(svc.update(kind,created.id,doc,1),e=>e.code==='REVISION_CONFLICT');
   assert.ok((await svc.list(kind)).some(v=>v.id===created.id));
   await svc.archive(kind,created.id);
   assert.ok(!(await svc.list(kind)).some(v=>v.id===created.id));
 }
});

test('DOCX and PPTX are real editable OOXML archives',async t=>{
 const svc=await fixture(t);
 const proposal=await svc.create('proposal','项目书&测试','research');
 const word=await svc.exportFile('proposal',proposal.id,'docx');
 assert.equal(word.mime,'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
 const w=unpack(word.bytes);
 assert.ok(w.has('[Content_Types].xml'));
 assert.match(w.get('word/document.xml'),/研究目标与考核指标/);
 assert.match(w.get('word/document.xml'),/项目书&amp;测试/);
 assert.ok(w.has('word/styles.xml'));
 assert.ok(!w.has('word/vbaProject.bin'));
 const slides=await svc.create('slides','研究成果汇报','paper');
 const ppt=await svc.exportFile('slides',slides.id,'pptx');
 assert.match(ppt.mime,/presentationml.presentation/);
 const pp=unpack(ppt.bytes);
 assert.ok(pp.has('ppt/presentation.xml'));
 assert.ok(pp.has('ppt/slideMasters/slideMaster1.xml'));
 assert.ok(pp.has('ppt/theme/theme1.xml'));
 assert.match(pp.get('ppt/slides/slide2.xml'),/<p:sp>/);
 assert.match(pp.get('ppt/slides/slide2.xml'),/研究背景与动机/);
 assert.match(pp.get('ppt/presentation.xml'),/<p:sldId /);
 const md=await svc.exportFile('slides',slides.id,'md');
 assert.match(md.bytes.toString('utf8'),/研究背景与动机/);
});

test('proposal-to-PPT reuses actual authored content',async t=>{
 const svc=await fixture(t);
 const original=await svc.create('proposal','项目蓝图','generic');
 const data=structuredClone(original.doc);data.sections[0].body='第一项真实研究数据：需进一步验证';
 await svc.update('proposal',original.id,data,1);
 const out=await svc.fromProposal(original.id);
 assert.match(out.doc.slides[1].body,/真实研究数据/);
 assert.equal(out.kind,'slides');
 assert.equal((await svc.list('slides')).length,1);
});

test('reject unsupported types, forged revisions, oversized bodies, and malformed slide objects',async t=>{
 const svc=await fixture(t);const d=await svc.create('ip','新型软著申请','software');
 await assert.rejects(svc.create('secret','伪造','software'),e=>e.code==='BAD_KIND');
 await assert.rejects(svc.create('proposal','', 'generic'),e=>e.code==='BAD_TITLE');
 await assert.rejects(svc.exportFile('ip',d.id,'pptx'),e=>e.code==='BAD_FORMAT');
 const mutated={...d.doc,sections:[{id:'../../oops',heading:'坏',body:'bad'}]};
 await assert.rejects(svc.update('ip',d.id,mutated,1),e=>e.code==='BAD_SECTIONS');
 const oversize={...d.doc,sections:d.doc.sections.map((x,i)=>i===0?{...x,body:'a'.repeat(52000)}:x)};
 await assert.rejects(svc.update('ip',d.id,oversize,1),e=>e.code==='BAD_SECTIONS');
});

test('HTTP endpoints enforce loopback origin and return DOCX/PPTX downloads',async t=>{
 const svc=await fixture(t),server=createServer((req,res)=>svc.handle(req,res));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base=`http://127.0.0.1:${server.address().port}`;
 const request=(url,body,origin=base)=>fetch(base+url,{method:'POST',headers:{origin,cookie:'dsh-test-session=valid','content-type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await request('/research-workbench/content/proposal',{title:'Test',templateId:'research'},'https://evil.com')).status,403);
 const response=await request('/research-workbench/content/proposal',{title:'Local proposal',templateId:'research'});
 assert.equal(response.status,201);
 const {item}=await response.json();
 const dl=await fetch(base+`/research-workbench/content/proposal/${item.id}/export?format=docx`,{headers:{cookie:'dsh-test-session=valid'}});
 assert.equal(dl.status,200);
 assert.match(dl.headers.get('content-type'),/wordprocessingml/);
 assert.ok((await dl.arrayBuffer()).byteLength>1000);
 const createdPpt=await request('/research-workbench/content/proposal/'+item.id+'/to-slides',{});
 assert.equal(createdPpt.status,201);
 const slideId=(await createdPpt.json()).item.id;
 const deck=await fetch(base+`/research-workbench/content/slides/${slideId}/export?format=pptx`,{headers:{cookie:'dsh-test-session=valid'}});
 assert.equal(deck.status,200);assert.match(deck.headers.get('content-type'),/presentationml/);
 assert.ok((await deck.arrayBuffer()).byteLength>1000);
 // Desktop's authenticated Electron proxy drops Origin. It must still be able
 // to create documents and download them, while the same request without the
 // DSH session cookie remains forbidden.
 const desktop=await fetch(base+'/research-workbench/content/ip',{
  method:'POST',headers:{cookie:'dsh-test-session=valid','content-type':'application/json'},
  body:JSON.stringify({title:'Desktop patent',templateId:'patent'})
 });
 assert.equal(desktop.status,201);
 assert.equal((await fetch(base+'/research-workbench/content/ip',{
  method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({title:'Unauthenticated',templateId:'patent'})
 })).status,403);
 assert.equal((await fetch(base+'/research-workbench/content/ip',{headers:{cookie:'dsh-test-session=valid','sec-fetch-site':'cross-site'}})).status,403);

});

test('agent tool registry enables artifact CRUD with version protection',async t=>{
 const svc=await fixture(t),paper=createPaperService({root:svc.root});
 const defs=new Map();const disposers=[];
 const ctx={tools:{register(spec){defs.set(spec.name,spec);const off=()=>defs.delete(spec.name);disposers.push(off);return off}}};
 const unregister=registerResearchTools(ctx,svc,paper);
 assert.ok(defs.has('research_artifact_create'));
 const invoke=async(name,args)=>JSON.parse(await defs.get(name).execute(args,{signal:new AbortController().signal}));
 const c=await invoke('research_artifact_create',{kind:'proposal',title:'科技项目',templateId:'generic'});
 assert.equal(c.kind,'proposal');
 const r=await invoke('research_artifact_read',{kind:'proposal',id:c.id});
 const modified=await invoke('research_artifact_edit',{kind:'proposal',id:c.id,revision:r.revision,index:0,body:'真实信息需核验'});
 assert.equal(modified.revision,r.revision+1);
 await assert.rejects(defs.get('research_artifact_edit').execute({kind:'proposal',id:c.id,revision:r.revision,index:0,body:'旧版本覆写'},{}));
 const slides=await invoke('research_proposal_to_slides',{id:c.id});
 assert.equal(slides.kind,'slides');
 unregister();assert.equal(defs.size,0);
});

test('Markdown import creates editable proposal, slide and software documentation',async t=>{
 const svc=await fixture(t);
 const md='# 背景\n基于现有实验记录。\n\n## 核心方案\n按条件授权工具调用。';
 const proposal=await svc.importMarkdown('proposal','导入项目书',md,'generic');
 assert.equal(proposal.doc.sections.length,2);
 assert.match(proposal.doc.sections[1].body,/条件授权/);
 const slide=await svc.importMarkdown('slides','导入演示文稿',md,'blank');
 assert.equal(slide.doc.slides.length,3);
 const software=await svc.importMarkdown('ip','软件说明书',md,'software');
 assert.match(software.doc.subtype,/软件著作权/);
 await assert.rejects(svc.importMarkdown('proposal','空','','generic'),e=>e.code==='BAD_IMPORT');
});

test('updates preserve last document revisions in local history',async t=>{
 const svc=await fixture(t);
 const d=await svc.create('proposal','版本检查','generic');
 await svc.update('proposal',d.id,{...d.doc,author:'科研人员'},1);
 const {readFile}=await import('node:fs/promises');
 const loc=join(svc.root,'content','proposal',d.id,'history','revision-1.json');
 const old=JSON.parse(await readFile(loc,'utf8'));
 assert.equal(old.revision,1);
 assert.equal(old.doc.author,'');
});
