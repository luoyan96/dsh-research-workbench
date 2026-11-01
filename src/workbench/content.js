/** Local-first structured research artifacts: proposals, editable slides, IP filings. */
import { randomUUID, createHash } from 'node:crypto';
import { homedir } from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { authorized } from '../papers.js';
import { makeDocx, makePptx, makeMarkdown } from './office.js';

export const CONTENT_API='/research-workbench/content';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const KINDS=new Set(['proposal','slides','ip']);
const templates={
 proposal:[
  {id:'research',label:'科研项目申报书',sections:['项目摘要','立项背景与需求分析','国内外研究现状','研究目标与考核指标','研究内容与关键科学问题','技术路线与研究方法','创新点与可行性','实施计划与进度安排','团队基础与条件保障','预期成果与应用价值','经费预算及说明','研究风险与应对措施']},
  {id:'feasibility',label:'技术项目可行性研究报告',sections:['项目概况','业务背景与痛点','国内外技术及产品现状','项目目标与指标','总体技术架构','关键技术与实施方案','工程化验证方案','进度计划与分工','资源配置与经费','风险与保障措施','预期成果和推广应用']},
  {id:'pilot',label:'中试平台建设方案',sections:['平台建设背景','产业与服务需求','现有建设基础','建设定位与目标','平台总体架构','核心技术与验证能力','服务内容与流程','建设计划与任务','组织运营与管理制度','预期服务成效','投资预算与资金筹措','风险控制与合规保障']},
  {id:'generic',label:'通用项目书',sections:['项目概述','研究背景','研究目标','主要研究内容','技术路线','实施安排','创新性与预期成果','条件保障','经费预算','风险与对策']},
 ],
 slides:[
  {id:'defense',label:'科研项目答辩',titles:['项目背景与需求','核心问题与研究目标','总体技术路线','研究内容一','研究内容二','研究内容三','关键创新点','研究基础与团队','实施计划与考核指标','预期成果与应用示范']},
  {id:'paper',label:'论文组会报告',titles:['研究背景与动机','相关研究与不足','研究问题与贡献','总体方法框架','关键方法设计','实验设置','主要实验结果','消融实验与分析','局限性与未来工作','总结与讨论']},
  {id:'proposal',label:'项目方案汇报',titles:['项目背景','问题与挑战','建设目标','总体方案','关键技术','实施路径','时间计划','资源与保障','预期成果','下一步工作']},
  {id:'blank',label:'空白演示文稿',titles:['议程','核心内容','总结']},
 ],
 ip:[
  {id:'patent',label:'发明专利技术交底书',sections:['发明名称','技术领域','背景技术及现有方案的不足','发明目的和要解决的技术问题','技术方案及系统架构','方法步骤与具体实施方式','关键创新点与有益效果','可选实施例和替代方案','权利要求书草稿','说明书摘要草稿','附图说明与图号清单']},
  {id:'software',label:'软件著作权申请材料',sections:['软件名称、简称和版本号','开发目的与应用场景','运行环境与依赖','总体架构与功能模块','主要功能及操作说明','主要界面及流程截图说明','核心技术特点','数据库、接口与数据处理','安装部署和运行步骤','源程序清单准备说明','权属、开发完成时间与版本记录','申请材料核验清单']},
 ],
};
export function templateCatalog(){return Object.fromEntries(Object.entries(templates).map(([kind,items])=>[kind,items.map(({id,label})=>({id,label}))]));}
const guardTitle=v=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=120&&!/[\x00-\x1f\x7f]/.test(v);
const cap=(v,n=20000)=>typeof v==='string'&&v.length<=n&&!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v);
const cleanTitle=v=>{if(!guardTitle(v))throw new ContentError(400,'BAD_TITLE','标题须为1～120字符');return v.trim();};
const safeId=v=>{if(!UUID.test(v||''))throw new ContentError(400,'BAD_ID','文档标识无效');return v;};
const safeKind=v=>{if(!KINDS.has(v))throw new ContentError(400,'BAD_KIND','不支持的内容类型');return v;};
const digest=x=>createHash('sha256').update(x).digest('hex');
export class ContentError extends Error {constructor(status,code,message){super(message);this.status=status;this.code=code;}}
const fail=(status,code,message)=>{throw new ContentError(status,code,message)};
async function writeAtomic(dest,bytes){
 const temp=dest+'.'+randomUUID()+'.tmp';await fs.mkdir(path.dirname(dest),{recursive:true});
 try{await fs.writeFile(temp,bytes,{flag:'wx'});await fs.rename(temp,dest)}finally{await fs.rm(temp,{force:true})}
}
function validSection(s){return s&&typeof s==='object'&&typeof s.id==='string'&&UUID.test(s.id)&&guardTitle(s.heading)&&cap(s.body,50000)}
function validSlide(s){return s&&typeof s==='object'&&typeof s.id==='string'&&UUID.test(s.id)&&guardTitle(s.title)&&cap(s.body,12000)&&['cover','bullets','two-column','closing'].includes(s.layout)&&cap(s.footer||'',120)}
function normalizeDoc(doc,kind){
 if(!doc||typeof doc!=='object'||Array.isArray(doc))fail(400,'BAD_DOCUMENT','文档结构无效');
 const result={title:cleanTitle(doc.title),organization:cap(doc.organization||'',150)?(doc.organization||''):'',author:cap(doc.author||'',120)?(doc.author||''):'',subtype:cap(doc.subtype||'',50)?(doc.subtype||''):''};
 if(kind==='slides'){
  if(!Array.isArray(doc.slides)||!doc.slides.length||doc.slides.length>80||doc.slides.some(x=>!validSlide(x)))fail(400,'BAD_SLIDES','幻灯片须为1～80页，标题及正文不能过长');
  if(new Set(doc.slides.map(x=>x.id)).size!==doc.slides.length)fail(400,'DUPLICATE_ID','幻灯片 ID 重复');
  result.slides=doc.slides.map(s=>({id:s.id,title:s.title.trim(),body:s.body,layout:s.layout,footer:s.footer||''}));
  result.theme=['blue','dark','ink'].includes(doc.theme)?doc.theme:'blue';
 }else{
  if(!Array.isArray(doc.sections)||!doc.sections.length||doc.sections.length>80||doc.sections.some(x=>!validSection(x)))fail(400,'BAD_SECTIONS','章节须为1～80节，标题或正文非法');
  if(new Set(doc.sections.map(x=>x.id)).size!==doc.sections.length)fail(400,'DUPLICATE_ID','章节 ID 重复');
  result.sections=doc.sections.map(s=>({id:s.id,heading:s.heading.trim(),body:s.body}));
 }
 if(Buffer.byteLength(JSON.stringify(result))>600000)fail(413,'DOC_TOO_LARGE','单个文档不能超过 600 KB');
 return result;
}
function initialDoc(kind,templateId,title){
 const def=templates[kind].find(t=>t.id===templateId);
 if(!def)fail(400,'BAD_TEMPLATE','没有找到选定的模板');
 if(kind==='slides')return {title,organization:'',author:'',subtype:def.label,theme:'blue',slides:[{id:randomUUID(),title,body:'研究课题 / 项目 / 汇报人',layout:'cover',footer:''},...def.titles.map((v,i)=>({id:randomUUID(),title:v,body:'• 请在此补充经过核实的内容\n• 可在页面中继续编辑与调整',layout:'bullets',footer:''})),{id:randomUUID(),title:'谢谢 · Q&A',body:'欢迎交流与讨论',layout:'closing',footer:''}]};
 return {title,organization:'',author:'',subtype:def.label,sections:def.sections.map(v=>({id:randomUUID(),heading:v,body:kind==='ip'&&templateId==='patent'&&v==='权利要求书草稿'?'1. 一种……方法，其特征在于包括：\n（1）……\n（2）……\n注意：权利要求需由专业人员核查清楚性、新颖性及保护范围。':'【待补充】请填写可核查的事实、依据和技术细节。'}))};
}
async function readBody(req,max=800000){
 const len=Number(req.headers['content-length']);if(Number.isFinite(len)&&len>max)fail(413,'BODY_TOO_LARGE','请求体太大');let bytes=0;const chunks=[];
 for await(const chunk of req){bytes+=chunk.length;if(bytes>max)fail(413,'BODY_TOO_LARGE','请求体太大');chunks.push(chunk)}
 let obj;try{obj=JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{fail(400,'BAD_JSON','无效 JSON')}
 if(!obj||typeof obj!=='object'||Array.isArray(obj))fail(400,'BAD_JSON','请求必须为对象');return obj;
}
function send(res,status,data){const b=Buffer.from(JSON.stringify(data));res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','content-length':b.length});res.end(b)}
function fname(title,ext){const clean=title.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,72)||'export';return encodeURIComponent(`${clean}.${ext}`)}

export function createContentService(options={}){
 const root=path.resolve(options.root||process.env.DSH_RWB_DATA_DIR||path.join(homedir(),'.dsh','research-workbench'));
 const contentDir=path.join(root,'content');
 let queue=Promise.resolve();const lock=fn=>{const next=queue.then(fn,fn);queue=next.catch(()=>{});return next};
 const folder=(kind,id)=>path.join(contentDir,safeKind(kind),safeId(id));
 async function one(kind,id){
  const target=folder(kind,id);
  const st=await fs.lstat(target).catch(e=>e.code==='ENOENT'?null:Promise.reject(e));
  if(!st?.isDirectory()||st.isSymbolicLink())fail(404,'NOT_FOUND','找不到该成果');
  const loc=path.join(target,'artifact.json');
  const st2=await fs.lstat(loc).catch(e=>e.code==='ENOENT'?null:Promise.reject(e));
  if(!st2?.isFile()||st2.isSymbolicLink())fail(404,'NOT_FOUND','找不到该成果');
  const data=JSON.parse(await fs.readFile(loc,'utf8'));
  if(data.id!==id||data.kind!==kind)fail(500,'BAD_STORAGE','文档标识不一致');
  return data;
 }
 async function list(kind){
  safeKind(kind);await fs.mkdir(path.join(contentDir,kind),{recursive:true});
  const out=[];
  for(const f of await fs.readdir(path.join(contentDir,kind),{withFileTypes:true})){
   if(!f.isDirectory()||!UUID.test(f.name))continue;
   try{const d=await one(kind,f.name);out.push({id:d.id,kind,title:d.doc.title,subtype:d.doc.subtype,updatedAt:d.updatedAt,createdAt:d.createdAt,revision:d.revision,count:(d.doc.slides||d.doc.sections).length})}catch{/* ignore malformed local directory */}
  }
  return out.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
 }
 async function create(kind,title,templateId){
  safeKind(kind);const name=cleanTitle(title);
  const id=randomUUID(),now=new Date().toISOString();
  const doc=normalizeDoc(initialDoc(kind,templateId,name),kind);
  const item={id,kind,doc,revision:1,createdAt:now,updatedAt:now};
  await writeAtomic(path.join(folder(kind,id),'artifact.json'),JSON.stringify(item,null,2)+'\n');return item;
 }
 async function update(kind,id,doc,expectedRevision){
  return lock(async()=>{
   const old=await one(kind,id);
   if(!Number.isSafeInteger(expectedRevision)||expectedRevision!==old.revision)fail(409,'REVISION_CONFLICT','内容已由其他会话修改，请重新加载后再保存');
   const next={...old,revision:old.revision+1,updatedAt:new Date().toISOString(),doc:normalizeDoc(doc,kind)};
   const oldPath=path.join(folder(kind,id),'history',`revision-${old.revision}.json`);
   await writeAtomic(oldPath,JSON.stringify(old,null,2)+'\n');
   await writeAtomic(path.join(folder(kind,id),'artifact.json'),JSON.stringify(next,null,2)+'\n');return next;
  });
 }
 async function archive(kind,id){return lock(async()=>{
  await one(kind,id);
  const from=folder(kind,id),dest=path.join(root,'archived',`content-${kind}-${id}-${Date.now()}`);
  await fs.mkdir(path.dirname(dest),{recursive:true});await fs.rename(from,dest);return {id,archived:true};
 })}
 async function exportFile(kind,id,format){
  const item=await one(kind,id);let bytes,ext,mime;
  if(format==='md'){bytes=Buffer.from(makeMarkdown(item.doc),'utf8');ext='md';mime='text/markdown; charset=utf-8'}
  else if(kind==='slides'&&format==='pptx'){bytes=makePptx(item.doc);ext='pptx';mime='application/vnd.openxmlformats-officedocument.presentationml.presentation'}
  else if(kind!=='slides'&&format==='docx'){bytes=makeDocx(item.doc);ext='docx';mime='application/vnd.openxmlformats-officedocument.wordprocessingml.document'}
  else fail(400,'BAD_FORMAT','不支持的导出格式');
  return {bytes,mime,filename:fname(item.doc.title,ext)};
 }
 async function importMarkdown(kind,title,markdown,templateId){
  safeKind(kind);
  if(typeof markdown!=='string'||!markdown.trim()||Buffer.byteLength(markdown)>300000)fail(400,'BAD_IMPORT','只支持小于 300KB 的非空 Markdown / TXT 文本');
  const name=cleanTitle(title);
  const normalized=markdown.replace(/\r\n/g,'\n');
  const chunks=[];let current=null;
  for(const line of normalized.split('\n')){
    const match=line.match(/^#{1,3} +(.+?)\s*$/);
    if(match){if(current)chunks.push(current);current={heading:match[1].trim().slice(0,110),body:''};}
    else {if(!current)current={heading:kind==='slides'?'正文':'文档正文',body:''};current.body+=(current.body?'\n':'')+line;}
  }
  if(current)chunks.push(current);
  const sections=chunks.filter(c=>c.heading&&c.body.trim()).slice(0,70);
  if(!sections.length)fail(400,'BAD_IMPORT','未从文件中提取到正文内容');
  if(sections.some(c=>c.body.length>(kind==='slides'?12000:50000)))fail(413,'IMPORT_TOO_LONG','导入文件有单个章节过长，请拆成多个章节，避免正文被截断');
  const base=await create(kind,name,templateId);
  const doc=kind==='slides'?{...base.doc,slides:[{id:randomUUID(),title:name,body:'由本地 Markdown 导入',layout:'cover',footer:''},...sections.map(c=>({id:randomUUID(),title:c.heading,body:c.body,layout:'bullets',footer:''}))]}:{...base.doc,sections:sections.map(c=>({id:randomUUID(),heading:c.heading,body:c.body}))};
  return await update(kind,base.id,doc,base.revision);
 }
 async function fromProposal(id){
  const source=await one('proposal',id);
  const out=await create('slides',source.doc.title+' · 汇报版','blank');
  const slides=[{id:randomUUID(),title:source.doc.title,body:[source.doc.organization,source.doc.author].filter(Boolean).join(' / ')||'项目汇报',layout:'cover',footer:''},
   ...source.doc.sections.slice(0,18).map(s=>({id:randomUUID(),title:s.heading,body:s.body.length>1000?s.body.slice(0,1000)+'\n（内容较长，请编辑精简后再导出）':s.body,layout:'bullets',footer:''})),
   {id:randomUUID(),title:'谢谢 · Q&A',body:'欢迎交流',layout:'closing',footer:''}];
  const doc={...out.doc,slides,organization:source.doc.organization,author:source.doc.author,theme:'blue'};
  return await update('slides',out.id,doc,out.revision);
 }
 async function handle(req,res){
  if(!authorized(req,req.method!=='GET'&&req.method!=='HEAD',options.connection))return send(res,403,{ok:false,code:'FORBIDDEN',error:'仅允许本机 DSH 页面访问'});
  try{
   const url=new URL(req.url||'', 'http://localhost');
   if(url.pathname===CONTENT_API+'/templates'&&req.method==='GET')return send(res,200,{ok:true,templates:templateCatalog()});
   const importing=url.pathname.match(/^\/research-workbench\/content\/(proposal|slides|ip)\/import$/i);
   if(importing&&req.method==='POST'){const body=await readBody(req);return send(res,201,{ok:true,item:await importMarkdown(importing[1],body.title,body.markdown,body.templateId)});}
   const match=url.pathname.match(/^\/research-workbench\/content\/(proposal|slides|ip)(?:\/([a-f0-9-]{36})(?:\/(export|archive|to-slides))?)?$/i);
   if(!match)return send(res,404,{ok:false,code:'NOT_FOUND',error:'路径不存在'});
   const [,kind,id,action]=match;
   if(!id){
    if(req.method==='GET')return send(res,200,{ok:true,items:await list(kind)});
    if(req.method==='POST'){const body=await readBody(req);return send(res,201,{ok:true,item:await create(kind,body.title,body.templateId)})}
   }else if(!action){
    if(req.method==='GET')return send(res,200,{ok:true,item:await one(kind,id)});
    if(req.method==='PUT'){const body=await readBody(req);return send(res,200,{ok:true,item:await update(kind,id,body.doc,body.expectedRevision)})}
   }else if(action==='archive'&&req.method==='POST')return send(res,200,{ok:true,...await archive(kind,id)});
   else if(action==='to-slides'&&kind==='proposal'&&req.method==='POST')return send(res,201,{ok:true,item:await fromProposal(id)});
   else if(action==='export'&&req.method==='GET'){
    const {bytes,mime,filename}=await exportFile(kind,id,url.searchParams.get('format'));
    res.writeHead(200,{'content-type':mime,'content-disposition':`attachment; filename*=UTF-8''${filename}`,'content-length':bytes.length,'cache-control':'no-store','x-content-type-options':'nosniff'});return res.end(bytes);
   }
   return send(res,405,{ok:false,code:'METHOD_NOT_ALLOWED',error:'请求方法不允许'});
  }catch(e){return send(res,e instanceof ContentError?e.status:500,{ok:false,code:e instanceof ContentError?e.code:'INTERNAL_ERROR',error:e instanceof ContentError?e.message:'内容服务内部错误'})}
 }
 return {root,handle,list,one,create,update,archive,exportFile,templateCatalog,fromProposal,importMarkdown};
}
