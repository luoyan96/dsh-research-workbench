import * as React from 'react';
import { IconBooks, IconSearch, IconStar, IconDownload, IconX, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import css from './literature-client.css';
export { css as literatureCss, IconBooks as LiteratureIcon };
const BASE='/research-workbench/literature';
async function api(route,body) {
  const response=await fetch(BASE+route,{credentials:'same-origin',...(body===undefined?{}:{method:'POST',headers:{'content-type':'application/json','x-research-workbench-literature':'1'},body:JSON.stringify(body)})});
  const value=await response.json();if(!response.ok || !value.ok)throw Error(value.error||'文献服务暂不可用');return value;
}
const date=value=>value?value.slice(0,10):'日期未提供';
const queryPath=(query,start,sort)=>'/search?'+new URLSearchParams({q:query,start:String(start),sort});
function PdfReader({paper,onClose}) {
  const [status,setStatus]=React.useState('正在获取 PDF…'),[error,setError]=React.useState(''),[doc,setDoc]=React.useState(null),[page,setPage]=React.useState(1),[zoom,setZoom]=React.useState('fit'),[pageText,setPageText]=React.useState(''),[readerWidth,setReaderWidth]=React.useState(800);
  const canvas=React.useRef(null),closeButton=React.useRef(null),dialog=React.useRef(null);
  React.useEffect(()=>{const element=canvas.current.parentElement;const observer=new ResizeObserver(()=>setReaderWidth(element.clientWidth));observer.observe(element);return()=>observer.disconnect();},[]);
  React.useEffect(()=>{
    const previous=document.activeElement;closeButton.current?.focus();
    const key=e=>{if(e.key==='Escape'){e.preventDefault();onClose();}if(e.key==='Tab'){const elements=[...dialog.current.querySelectorAll('button:not(:disabled),a[href],select,summary')];const first=elements[0],last=elements.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};
    const el=dialog.current;el.addEventListener('keydown',key);return()=>{el.removeEventListener('keydown',key);previous?.focus?.();};
  },[onClose]);
  React.useEffect(()=>{
    let stopped=false,timer,loadingTask;
    async function load(){
      try{
        let value=await api('/pdf',{id:paper.id});
        while(value.status==='loading') {await new Promise(resolve=>{timer=setTimeout(resolve,1000);});if(stopped)return;value=await api('/pdf-status?id='+encodeURIComponent(paper.id));}
        if(stopped)return;if(value.status!=='ready')throw Error(value.error||'PDF 尚未就绪，请关闭后重试');
        setStatus('正在打开 PDF…');
        const moduleUrl=BASE+'/assets/pdf.min.mjs', pdfjs=await import(/* webpackIgnore: true */ moduleUrl);
        if(stopped)return;pdfjs.GlobalWorkerOptions.workerSrc=BASE+'/assets/pdf.worker.min.mjs';
        loadingTask=pdfjs.getDocument({url:BASE+'/pdf?id='+encodeURIComponent(paper.id),withCredentials:true,isEvalSupported:false,enableXfa:false,standardFontDataUrl:BASE+'/assets/standard_fonts/',wasmUrl:BASE+'/assets/wasm/'});
        const document=await loadingTask.promise;if(stopped){await document.destroy();return;}setDoc(document);setStatus('');
      }catch(e){if(!stopped){setError(e.message);setStatus('');}}
    }
    void load();return()=>{stopped=true;clearTimeout(timer);void loadingTask?.destroy();};
  },[paper.id]);
  React.useEffect(()=>{
    if(!doc)return;let stopped=false,render;
    setStatus('正在渲染第 '+page+' 页…');setPageText('');
    void(async()=>{try{const pdfPage=await doc.getPage(page);if(stopped)return;const scale=zoom==='fit'?Math.min(1.5,Math.max(0.2,(readerWidth-40)/pdfPage.getViewport({scale:1}).width)):1.25*Number(zoom);const viewport=pdfPage.getViewport({scale});const ratio=Math.min(window.devicePixelRatio||1,2);const target=canvas.current;target.width=Math.ceil(viewport.width*ratio);target.height=Math.ceil(viewport.height*ratio);target.style.width=viewport.width+'px';target.style.height=viewport.height+'px';render=pdfPage.render({canvas:target,canvasContext:target.getContext('2d'),viewport,transform:ratio===1?null:[ratio,0,0,ratio,0,0]});await render.promise;if(stopped)return;const content=await pdfPage.getTextContent();if(!stopped){setPageText(content.items.map(x=>x.str+(x.hasEOL?'\n':' ')).join(''));setStatus('');}}catch(e){if(!stopped&&e.name!=='RenderingCancelledException'){setError('PDF 渲染失败：'+e.message);setStatus('');}}})();
    return()=>{stopped=true;render?.cancel();};
  },[doc,page,zoom,readerWidth]);
  return <div className="drw-literature-overlay"><section ref={dialog} className="drw-literature-reader" role="dialog" aria-modal="true" aria-labelledby="drw-pdf-title">
    <header><div><h2 id="drw-pdf-title">{paper.title}</h2><p>arXiv:{paper.id} · 本地 PDF 阅读</p></div><button ref={closeButton} type="button" aria-label="关闭 PDF 阅读" onClick={onClose}><IconX size={19}/></button></header>
    <nav aria-label="PDF 阅读工具"><div><button type="button" aria-label="上一页 PDF" disabled={!doc||page<=1} onClick={()=>setPage(x=>x-1)}><IconChevronLeft size={17}/></button><span>{page} / {doc?.numPages||'—'}</span><button type="button" aria-label="下一页 PDF" disabled={!doc||page>=doc.numPages} onClick={()=>setPage(x=>x+1)}><IconChevronRight size={17}/></button><label>缩放<select value={zoom} onChange={e=>setZoom(e.target.value)}><option value="fit">适合宽度</option>{[.5,.75,1,1.25,1.5].map(x=><option key={x} value={x}>{x*100}%</option>)}</select></label></div><div><a href={paper.url} target="_blank" rel="noopener noreferrer">arXiv 原文 ↗</a>{doc?<a download href={BASE+'/pdf?download=1&id='+encodeURIComponent(paper.id)}>下载 PDF</a>:null}</div></nav>
    {error?<div role="alert" className="drw-extension-warning">{error}。可前往 arXiv 原文阅读。</div>:null}
    {status?<p role="status" className="drw-literature-status">{status}{!doc?'首次下载较慢，切换页面后仍会继续下载。':''}</p>:null}
    <div className="drw-literature-canvas"><canvas ref={canvas} role="img" aria-label={'文献 PDF 第 '+page+' 页'}/></div>
    {pageText?<details className="drw-literature-text"><summary>本页文字（可复制）</summary><p>{pageText}</p></details>:null}
  </section></div>;
}
export function LiteraturePage(props) {
  const [tab,setTab]=React.useState('search'),[query,setQuery]=React.useState(''),[sort,setSort]=React.useState('relevance'),[result,setResult]=React.useState(null),[favorites,setFavorites]=React.useState([]),[busy,setBusy]=React.useState(false),[saving,setSaving]=React.useState(''),[error,setError]=React.useState(''),[notice,setNotice]=React.useState(''),[reader,setReader]=React.useState(null),[selected,setSelected]=React.useState([]),[filter,setFilter]=React.useState('');
  const mounted=React.useRef(true),epoch=React.useRef(0),mutation=React.useRef(false);
  props.useUpdateGuard?.('research-literature',false,busy||!!saving);
  async function search(value=query,start=0,order=sort){
    const run=++epoch.current;setBusy(true);setError('');setNotice('');setSelected([]);
    try{const data=await api(queryPath(value,start,order));if(mounted.current&&run===epoch.current){setResult(data);try{sessionStorage.setItem('dsh-rwb-literature-search',JSON.stringify({query:value,sort:order,start}));}catch{/* optional UI memory */}}}catch(e){if(mounted.current&&run===epoch.current)setError(e.message);}finally{if(mounted.current&&run===epoch.current)setBusy(false);}
  }
  React.useEffect(()=>{mounted.current=true;void api('/favorites').then(data=>{if(mounted.current)setFavorites(data.papers);}).catch(e=>{if(mounted.current)setError(e.message);});try{const previous=JSON.parse(sessionStorage.getItem('dsh-rwb-literature-search')||'null');if(previous?.query){setQuery(previous.query);setSort(previous.sort);void search(previous.query,previous.start,previous.sort);}}catch{/* empty initial search */}return()=>{mounted.current=false;++epoch.current;};},[]);
  async function toggle(paper){if(mutation.current)return;mutation.current=true;setSaving(paper.id);setError('');try{const saved=!favorites.some(x=>x.key===paper.key);const data=await api('/favorite',{id:paper.id,saved});if(mounted.current){setFavorites(data.papers);setNotice(saved?'已收藏到本地文献库':'已取消收藏');}}catch(e){if(mounted.current)setError(e.message);}finally{mutation.current=false;if(mounted.current)setSaving('');}}
  async function downloadBib(ids){if(!ids.length)return;setError('');try{const response=await fetch(BASE+'/bibtex',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json','x-research-workbench-literature':'1'},body:JSON.stringify({ids})});if(!response.ok){const value=await response.json();throw Error(value.error);}const blob=await response.blob(),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='references.bib';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);setNotice('BibTeX 已导出');}catch(e){setError(e.message);}}
  const savedKeys=new Set(favorites.map(x=>x.key));
  const papers=tab==='search'?result?.papers||[]:favorites.filter(x=>!filter.trim()||[x.title,...x.authors,x.id,...x.categories].join(' ').toLowerCase().includes(filter.trim().toLowerCase()));
  const selectedIds=selected.filter(id=>papers.some(x=>x.id===id));
  return <section className="drw-extension-page drw-literature-page" aria-label="文献搜索与收藏">
    <header className="drw-extension-heading"><div><h1>文献</h1><p>搜索 arXiv，收藏论文，在这里阅读 PDF 并导出引用。</p></div><button type="button" onClick={props.onReturnChat}>返回聊天</button></header>
    <div className="drw-literature-tabs" role="tablist" aria-label="文献视图"><button type="button" role="tab" aria-selected={tab==='search'} aria-controls="drw-literature-results" onClick={()=>{setTab('search');setSelected([]);}}>搜索文献</button><button type="button" role="tab" aria-selected={tab==='favorites'} aria-controls="drw-literature-results" onClick={()=>{setTab('favorites');setSelected([]);}}>我的收藏 <span>{favorites.length}</span></button></div>
    {tab==='search'?<form className="drw-literature-search" onSubmit={e=>{e.preventDefault();void search();}}><label>搜索文献<input type="search" required minLength={2} maxLength={300} placeholder="关键词、论文标题、作者或 arXiv 编号" value={query} onChange={e=>setQuery(e.target.value)}/></label><label>排序<select value={sort} onChange={e=>setSort(e.target.value)}><option value="relevance">相关性</option><option value="submittedDate">最新提交</option><option value="lastUpdatedDate">最近更新</option></select></label><button className="drw-extension-primary" type="submit" disabled={busy||query.trim().length<2}><IconSearch size={17}/>{busy?'搜索中…':'搜索'}</button></form>:<label className="drw-literature-filter">筛选收藏<input type="search" placeholder="标题、作者或研究方向" value={filter} onChange={e=>setFilter(e.target.value)}/></label>}
    {error?<div role="alert" className="drw-extension-warning">{error}</div>:null}{result?.stale&&tab==='search'?<div role="status" className="drw-extension-warning">{result.warning}</div>:null}{notice?<p role="status" className="drw-literature-notice">{notice}</p>:null}
    <div className="drw-literature-toolbar"><span>{busy?'正在从 arXiv 获取文献…':tab==='favorites'?papers.length+' 篇收藏':result?'共 '+result.total.toLocaleString()+' 条 · 第 '+(result.start+1)+'–'+(result.start+papers.length)+' 条'+(result.cached?' · 本地缓存':''):'来源：arXiv · 无需 API 密钥'}</span><div>{papers.length?<label><input type="checkbox" aria-label="选择本页全部文献" checked={!!papers.length&&selectedIds.length===papers.length} onChange={e=>setSelected(e.target.checked?papers.map(x=>x.id):[])}/>本页全选</label>:null}{selectedIds.length?<button type="button" onClick={()=>void downloadBib(selectedIds)}><IconDownload size={16}/>导出所选 ({selectedIds.length})</button>:tab==='favorites'&&favorites.length?<button type="button" onClick={()=>void downloadBib(favorites.map(x=>x.id))}>导出全部收藏</button>:null}</div></div>
    <div id="drw-literature-results" role="tabpanel" aria-label={tab==='search'?'搜索结果':'收藏文献'} aria-busy={busy} className="drw-literature-list">{papers.map(paper=><article key={paper.id} className="drw-literature-card"><input type="checkbox" aria-label={'选择 '+paper.title} checked={selectedIds.includes(paper.id)} onChange={e=>setSelected(current=>e.target.checked?[...current,paper.id]:current.filter(x=>x!==paper.id))}/><div><div className="drw-literature-meta"><span>arXiv:{paper.id}</span><span>{date(paper.published)}</span>{paper.primaryClass?<span>{paper.primaryClass}</span>:null}</div><h2>{paper.title}</h2><p className="drw-literature-authors">{paper.authors.slice(0,12).join(', ')}{paper.authors.length>12?' 等 '+paper.authors.length+' 位作者':''}</p><details className="drw-literature-abstract"><summary>摘要</summary><p>{paper.summary||'暂无摘要'}</p></details><div className="drw-literature-card-actions"><button type="button" className="drw-extension-primary" onClick={()=>setReader(paper)}>阅读 PDF</button><button type="button" disabled={!!saving} aria-label={(savedKeys.has(paper.key)?'取消收藏 ':'收藏 ')+paper.title} aria-pressed={savedKeys.has(paper.key)} onClick={()=>void toggle(paper)}><IconStar size={16} fill={savedKeys.has(paper.key)?'currentColor':'none'}/>{saving===paper.id?'保存中…':savedKeys.has(paper.key)?'已收藏':'收藏'}</button><button type="button" onClick={()=>void downloadBib([paper.id])}>BibTeX</button><a href={paper.url} target="_blank" rel="noopener noreferrer">arXiv 原文 ↗</a></div></div></article>)}</div>
    {!papers.length&&!busy?<div className="drw-extension-empty"><IconBooks size={38}/><h2>{tab==='favorites'?'还没有匹配的收藏':result?'没有找到文献':'从一篇论文开始'}</h2><p>{tab==='favorites'?'搜索后点击“收藏”，文献会保留在本机文献库里。':'可输入 attention、作者名、1706.03762，或 ti: / au: / cat: 高级查询。'}</p>{!result&&tab==='search'?<button type="button" onClick={()=>{setQuery('1706.03762');void search('1706.03762');}}>试搜 Attention Is All You Need</button>:null}</div>:null}
    {tab==='search'&&result?.papers.length?<nav className="drw-literature-pagination" aria-label="文献搜索分页"><button type="button" disabled={busy||!result.start} onClick={()=>void search(result.query,Math.max(0,result.start-20),result.sort)}>上一页</button><span>第 {Math.floor(result.start/20)+1} 页</span><button type="button" disabled={busy||result.start+20>=result.total||result.start>=1000} onClick={()=>void search(result.query,result.start+20,result.sort)}>下一页</button></nav>:null}
    <p className="drw-extension-footnote">当前支持 arXiv 预印本。搜索缓存 24 小时；收藏、引用与已下载 PDF 保存在本地。PDF 首次阅读需联网，最多 50 MB / 篇。BibTeX 保留 arXiv 来源与版本，不推断正式发表信息。</p>
    {reader?<PdfReader key={reader.id} paper={reader} onClose={()=>setReader(null)}/>:null}
  </section>;
}
