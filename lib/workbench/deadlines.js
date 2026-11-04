/** CCF conference deadline data: third-party daily snapshot, local-first fallback.
 * Provider: Conference Partner, https://github.com/sundou82/conference-partner-mcp
 * This plugin does not infer official submission times from date-only records.
 */
import {randomUUID} from 'node:crypto';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {promises as fs} from 'node:fs';
import {authorized} from '../papers.js';

export const DEADLINES_API='/research-workbench/deadlines';
export const DEADLINES_SOURCE='https://raw.githubusercontent.com/sundou82/conference-partner-mcp/main/data/ccf-conferences.json';
const CACHE_MS=6*60*60*1000;
const MAX_RESPONSE=3*1024*1024;
const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const textField=(v,max=200)=>typeof v==='string'?v.slice(0,max):'';
const httpsLink=(v)=>{if(typeof v!=='string')return '';try{const u=new URL(v);return u.protocol==='https:'&&u.hostname==='www.myhuiban.com'&&/^\/conference\/\d+\/?$/.test(u.pathname)?u.toString():'';}catch{return '';}};

export function normalizeDeadlineFeed(data){
  if(!data || !Array.isArray(data.conferences) || data.conferences.length>3000) throw Error('Invalid source dataset');
  const out=[];
  for(const item of data.conferences){
    if(!item||!['A','B','C'].includes(item.ccf_rank))continue;
    const name=textField(item.short_name,80).trim();
    if(!name)continue;
    out.push({
      name,
      title:textField(item.full_name,260).replace(/\s+/g,' ').trim(),
      rank:item.ccf_rank,
      deadline:validDate(item.submission_date)?item.submission_date:null,
      conferenceDate:validDate(item.conference_date)?item.conference_date:null,
      areas:Array.isArray(item.fields)?item.fields.filter(v=>typeof v==='string').slice(0,12).map(v=>v.slice(0,32)):[],
      location:textField(item.location,160),
      page:httpsLink(item.detail_page),
      recordUpdated:validDate(item.updated_at)?item.updated_at:null,
    });
  }
  if(out.length===0)throw Error('No CCF A/B/C rows in source feed');
  const unique=new Map();
  for(const row of out)unique.set(row.name.toUpperCase(),row);
  return {generatedAt:typeof data.generated_at==='string'?data.generated_at.slice(0,40):null,source:DEADLINES_SOURCE,
    attribution:'Conference Partner (myhuiban.com) 社区数据；日期仅精确到天，具体截稿时间/时区请以会议官网为准。',
    conferences:Array.from(unique.values()).sort((a,b)=>a.name.localeCompare(b.name,'en'))};
}

function writeJson(res,status,payload){
  const buffer=Buffer.from(JSON.stringify(payload));
  res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store',
    'x-content-type-options':'nosniff','content-length':buffer.length});
  res.end(buffer);
}
export function createDeadlineService(options={}){
  const root=options.root||process.env.DSH_RWB_DATA_DIR||join(homedir(),'.dsh','research-workbench');
  const cachePath=join(root,'ccf-deadlines-cache.json');
  const fetchImpl=options.fetchImpl||globalThis.fetch;
  const ttlMs=options.ttlMs??CACHE_MS;
  const clock=options.now||(()=>Date.now());
  let cache=null;let checkedAt=0;let inFlight=null;
  async function readCache(){
    if(cache)return cache;
    try{
      const data=JSON.parse(await fs.readFile(cachePath,'utf8'));
      if(data&&Array.isArray(data.conferences)&&data.conferences.length&&typeof data.fetchedAt==='number')cache=data;
    }catch{/* on first install there is no snapshot */}
    return cache;
  }
  async function refresh(){
    const response=await fetchImpl(DEADLINES_SOURCE,{headers:{'accept':'application/json','user-agent':'DSH-Research-Workbench/0.4.0'},signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw Error('会议数据源返回 HTTP '+response.status);
    const length=Number(response.headers?.get?.('content-length')||0);
    if(length>MAX_RESPONSE)throw Error('会议数据源体积超限');
    const body=await response.text();
    if(Buffer.byteLength(body)>MAX_RESPONSE)throw Error('会议数据源体积超限');
    const normalized=normalizeDeadlineFeed(JSON.parse(body));
    const updated={...normalized,fetchedAt:clock()};
    await fs.mkdir(root,{recursive:true});
    const temp=cachePath+'.'+randomUUID()+'.tmp';
    try{await fs.writeFile(temp,JSON.stringify(updated),'utf8');await fs.rename(temp,cachePath)}
    finally{await fs.rm(temp,{force:true})}
    cache=updated;checkedAt=clock();
    return updated;
  }
  async function list(force=false){
    await readCache();
    if(!force&&cache&&clock()-cache.fetchedAt<ttlMs)
      return {ok:true,...cache,stale:false,cache:true};
    if(!force&&inFlight)return inFlight;
    const task=(async()=>{
      try{return {ok:true,...await refresh(),stale:false,cache:false}}catch(error){
        checkedAt=clock();
        if(cache)return {ok:true,...cache,stale:true,cache:true,warning:'在线更新失败，展示上次缓存：'+String(error.message).slice(0,150)};
        return {ok:false,error:'无法获取 CCF 投稿日期，请检查网络后重试。',source:DEADLINES_SOURCE};
      }
    })();
    inFlight=task;
    try{return await task}finally{if(inFlight===task)inFlight=null}
  }
  async function handle(req,res){
    if(!authorized(req,false,options.connection))return writeJson(res,403,{ok:false,error:'仅允许本机 DSH 已登录页面访问'});
    if(req.method!=='GET')return writeJson(res,405,{ok:false,error:'仅支持 GET'});
    const url=new URL(req.url||'', 'http://localhost');
    if(url.pathname!==DEADLINES_API)return writeJson(res,404,{ok:false,error:'路径不存在'});
    const result=await list(url.searchParams.get('refresh')==='1');
    writeJson(res,result.ok?200:503,result);
  }
  return {list,handle,cachePath};
}
