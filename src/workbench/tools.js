/** DSH model-facing research artifact tools. All writes go through same version checks as UI. */
import { randomUUID } from 'node:crypto';
const kindEnum=['proposal','slides','paper','ip'];
const prop=(type,extra={})=>({type,...extra});
const fields={
  kind:prop('string',{enum:kindEnum,description:'proposal=项目书, slides=PPT, paper=论文, ip=专利软著'}),
  id:prop('string',{description:'项目 ID，需先读取列表获得'}),
  title:prop('string',{description:'标题或章节标题'}),
  templateId:prop('string',{description:'模板: 项目书 research/feasibility/pilot/generic；PPT defense/paper/proposal/blank；IP patent/software'}),
  revision:prop('integer',{description:'最近读取时返回的 revision，防止覆盖并发修改'}),
  index:prop('integer',{description:'要修改的章节/幻灯片索引，从 0 开始'}),
  body:prop('string',{description:'正文，不要编造科研事实或实验数字'}),
  layout:prop('string',{enum:['cover','bullets','two-column','closing'],description:'PPT 页面版式'}),
  path:prop('string',{description:'论文中相对文件名，如 main.tex、references.bib、sections/method.tex'}),
  expectedSha:prop('string',{description:'论文文件读取时返回的 sha256'}),
};
const output={schema:{type:'string'},render:(_args,value)=>[{type:'text',text:value}]};
const result=(data)=>{const text=JSON.stringify(data);if(text.length>65000)throw Error('result too large; reduce document size');return text};
const readable=(kind,items)=>items.map(x=>({id:x.id,title:x.title??x.doc?.title,revision:x.revision,kind:kind,subtype:x.subtype||x.doc?.subtype}));
/** Register using raw JSON Schema, the canonical DSH ToolDefinition wire contract. */
export function registerResearchTools(ctx,contents,papers){
 const disposers=[];
 const add=(name,description,properties,required,run)=>{
   const definition={name,description,parameters:{type:'object',properties,required,additionalProperties:false},output,
     async execute(args,exec){exec?.signal?.throwIfAborted?.();return result(await run(args));}};
   const dispose=ctx.tools.register(definition);
   if(typeof dispose==='function')disposers.push(dispose);
 };
 add('research_artifact_list','列出 DSH Research Workbench 本地成果（项目书、PPT、论文、专利与软著）。',
    {kind:fields.kind},[],async ({kind})=>{
      if(kind==='paper')return {kind:'paper',items:await papers.list()};
      if(kind)return {kind,items:await contents.list(kind)};
      const [proposal,slides,ip,paper]=await Promise.all([contents.list('proposal'),contents.list('slides'),contents.list('ip'),papers.list()]);
      return {proposal,slides,ip,paper};
    });
 add('research_artifact_create','按照指定科研模板创建本地成果项目；若无 templateId 使用默认模板。不要填虚构技术细节。',
    {kind:fields.kind,title:fields.title,templateId:fields.templateId},['kind','title'],async ({kind,title,templateId})=>{
      if(kind==='paper'){const item=await papers.create(title);return {kind,id:item.id,title:item.title,created:true};}
      const defaults={proposal:'research',slides:'defense',ip:'patent'};
      const item=await contents.create(kind,title,templateId||defaults[kind]);
      return {kind,id:item.id,revision:item.revision,title:item.doc.title,template:item.doc.subtype,created:true};
    });
 add('research_artifact_read','读取本地项目书、PPT、专利软著的结构化内容和版本号，或论文指定源码文件。',
    {kind:fields.kind,id:fields.id,path:fields.path},['kind','id'],async ({kind,id,path})=>{
      if(kind==='paper')return {kind,id,...await papers.readSource(id,path||'main.tex')};
      const d=await contents.one(kind,id);return {kind,id,revision:d.revision,doc:d.doc};
    });
 add('research_artifact_edit','按索引更新项目书、PPT 或专利软著的一节。必须携带读取所得 revision，防止覆盖他人编辑。',
    {kind:fields.kind,id:fields.id,revision:fields.revision,index:fields.index,title:fields.title,body:fields.body,layout:fields.layout},
    ['kind','id','revision','index','body'],async ({kind,id,revision,index,title,body,layout})=>{
      if(kind==='paper')throw Error('论文请使用 research_paper_write');
      const item=await contents.one(kind,id);
      const key=kind==='slides'?'slides':'sections';const list=item.doc[key];
      if(!Number.isInteger(index)||index<0||index>=list.length)throw Error('index out of bounds');
      const fields=kind==='slides'?{body,...(title?{title}:{}),...(layout?{layout}:{})}:{body,...(title?{heading:title}:{})};
      const next={...item.doc,[key]:list.map((s,i)=>i===index?{...s,...fields}:s)};
      const updated=await contents.update(kind,id,next,revision);
      return {ok:true,kind,id,revision:updated.revision,editedIndex:index};
    });
 add('research_artifact_append','向现有项目书、PPT 或专利软著文档末尾添加章节/幻灯片。',
    {kind:fields.kind,id:fields.id,revision:fields.revision,title:fields.title,body:fields.body,layout:fields.layout},
    ['kind','id','revision','title','body'],async ({kind,id,revision,title,body,layout})=>{
      if(kind==='paper')throw Error('论文请使用 research_paper_write');
      const item=await contents.one(kind,id);const key=kind==='slides'?'slides':'sections';
      const node=kind==='slides'?{id:randomUUID(),title,body,layout:layout||'bullets',footer:''}:{id:randomUUID(),heading:title,body};
      const updated=await contents.update(kind,id,{...item.doc,[key]:[...item.doc[key],node]},revision);
      return {ok:true,id,revision:updated.revision,index:updated.doc[key].length-1};
    });
 add('research_paper_write','修改 LaTeX 项目里的文本源文件，使用 expectedSha 防止覆盖；新文件传空字符串。',
    {id:fields.id,path:fields.path,body:fields.body,expectedSha:fields.expectedSha},
    ['id','path','body','expectedSha'],async ({id,path,body,expectedSha})=>{
      const out=await papers.saveSource(id,path,body,expectedSha||null);return {ok:true,id,...out};
    });
 add('research_proposal_to_slides','从已保存的项目书章节生成可编辑 PPT 草稿，不会编造不存在的研究数据。',
    {id:fields.id},['id'],async ({id})=>{
      const out=await contents.fromProposal(id);return {ok:true,id:out.id,kind:'slides',title:out.doc.title,slideCount:out.doc.slides.length};
    });
 return ()=>{for(const dispose of disposers.reverse())dispose()};
}
