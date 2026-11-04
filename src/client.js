/*
 * DSH Research Workbench v0.3.3 — native sidebar + keyed-main-panel MVP.
 * This file is a prebuilt browser module: the exact DSH __ModuleLoader__ ABI
 * used by current client bundles. No DOM scraping or React duplication.
 */
(function registerResearchWorkbench() {
  'use strict';
  window.__ModuleLoader__.load({
    id: 'dsh-research-workbench',
    factory: function (require) {
      const React = require('react');
      const h = React.createElement;
      let nativeOfficeClient = null;
      /* NATIVE_OFFICE_CLIENT */
      let fileClient = null;
      /* FILE_WORKSPACE_CLIENT */

      const PANELS = Object.freeze([
        { id:'research-proposals', kind:'proposal', order:20, title:'项目书', icon:'filetext', subtitle:'科技项目申报、可行性报告与中试平台建设' },
        { id:'research-slides', kind:'slides', order:30, title:'PPT 工作台', icon:'presentation', subtitle:'科研组会、项目汇报和答辩演示文稿' },
        { id:'research-papers', kind:'paper', order:40, title:'论文管理', icon:'book', subtitle:'本地 LaTeX 项目编辑与 Tectonic 编译' },
        { id:'research-ip', kind:'ip', order:50, title:'专利与软著', icon:'shield', subtitle:'专利技术交底和软件著作权申请材料' },
        { id:'research-ccf', kind:'deadlines', order:60, title:'CCF 截稿', icon:'calendar', subtitle:'CCF A/B/C 会议投稿时间、分类与收藏' },
      ]);

      const SHAPES = Object.freeze({
        filetext: ['M5 2h10l4 4v16H5z','M15 2v5h4','M8 12h8','M8 16h8'],
        shield: ['M12 2l9 4v6c0 6-3.8 9.5-9 11C6.8 21.5 3 18 3 12V6z','M9 12l2 2 4-4'],
        book: [
          'M4 19.5A2.5 2.5 0 0 1 6.5 17H20',
          'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z',
        ],
        presentation: [
          'M2 3h20v14H2z',
          'M8 21l4-4 4 4',
          'M12 17v4',
        ],
        calendar: ['M8 2v4','M16 2v4','M3 10h18','M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z','M8 14h3','M8 18h3'],
        flask: [
          'M9 3h6',
          'M10 3v7l-5.6 9a2 2 0 0 0 1.7 3h11.8a2 2 0 0 0 1.7-3L14 10V3',
          'M7 16h10',
        ],
        checklist: [
          'M9 6h12',
          'M9 12h12',
          'M9 18h12',
          'M3 6l1.3 1.3L6 5',
          'M3 12l1.3 1.3L6 11',
          'M3 18l1.3 1.3L6 17',
        ],
        arrowleft: ['M19 12H5', 'm12 19-7-7 7-7'],
        arrowright: ['M5 12h14', 'm12 5 7 7-7 7'],
        check: ['M20 6 9 17l-5-5'],
        layers: ['M3 9l9-6 9 6-9 6-9-6Z','m3 13 9 6 9-6'],
      });

      function Icon(props) {
        const size = props.size || 18;
        return h('svg', {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.75,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
        }, (SHAPES[props.name] || SHAPES.layers).map((d, index) => h('path', { key: index, d })));
      }

      function PanelIcon(props) {
        return h(Icon, { name: props.icon, size: props.size });
      }

      // DSH global main-panel contribution for proposals, editable slides,
      // and patent/software copyright materials. Files live on the Host.
      const ARTIFACT_API = '/research-workbench/content';
      function makeId() {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
        const a = new Uint8Array(16);
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(a);
        else for (let i = 0; i < 16; i++) a[i] = Math.floor(Math.random() * 256);
        a[6] = (a[6] & 15) | 64; a[8] = (a[8] & 63) | 128;
        const k = [...a].map(v => v.toString(16).padStart(2, '0')).join('');
        return k.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
      }
      async function artifactRequest(url, options = {}) {
        const response = await fetch(ARTIFACT_API + url, {
          credentials: 'same-origin',
          ...options,
          headers: { ...(options.body ? { 'content-type': 'application/json' } : {}), ...options.headers },
        });
        let data;
        try { data = await response.json(); }
        catch { throw new Error(`无法连接 DSH 成果服务（HTTP ${response.status}），请更新插件并重启 DSH。`); }
        if (!response.ok || !data || data.ok !== true) {
          const error = new Error(data?.error || `成果服务返回错误（${response.status}）`);
          error.code = data?.code || 'UNKNOWN';
          throw error;
        }
        return data;
      }
      const sendBody = body => JSON.stringify(body);
      const editorCount = d => d ? (d.slides || d.sections || []).length : 0;
      const artifactUrl = (kind,id) => `/${kind}/${encodeURIComponent(id)}`;
      const exportUrl = (kind,id,format) => ARTIFACT_API + artifactUrl(kind,id) + `/export?format=${format}`;
      const productLabels = { proposal: '项目书', slides: 'PPT', ip: '专利与软著' };
      const sectionLabel = kind => kind === 'slides' ? '幻灯片' : '章节';
      const textRows = (text, limit=28) => String(text || '').split('\n').slice(0,limit);

      // Only editing/activity flags leave this browser. Update operations are
      // owned by the Host, so switching panels does not lose their outcome.
      const updateGuards = new Map(), updateListeners = new Set();
      let updateView = { data: null, error: '', busy: false }, updatePending = false, updateFlight;
      let updateClientId;
      try {
        updateClientId = sessionStorage.getItem('research-update-client') || makeId();
        sessionStorage.setItem('research-update-client', updateClientId);
      } catch { updateClientId = makeId(); }
      const updateClient = () => ({ id: updateClientId, dirty: [...updateGuards.values()].some(x => x.dirty), busy: [...updateGuards.values()].some(x => x.busy) });
      function publishUpdate(patch) { updateView = { ...updateView, ...patch }; for (const listen of updateListeners) listen(); }
      async function updateRequest(input = { action: 'state' }) {
        if (updatePending) {
          if (input.action === 'state') return false;
          await updateFlight;
          return updateRequest(input);
        }
        let finish;
        updateFlight = new Promise(resolve => { finish = resolve; });
        updatePending = true;
        const manual = input.action !== 'state';
        if (manual) publishUpdate({ busy: true, error: '' });
        try {
          const response = await fetch('/api/research-workbench/updates', {
            method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-research-workbench-updates': '1' },
            body: JSON.stringify({ ...input, client: updateClient() }), signal: AbortSignal.timeout(20000),
          });
          let result;
          try { result = await response.json(); }
          catch { throw Error(`更新服务不可用（HTTP ${response.status}），请重启 DSH 后重试。`); }
          if (!response.ok || !result.ok) throw Error(result.error || '无法读取插件更新状态。');
          if (!updateView.data || result.value.revision >= updateView.data.revision) publishUpdate({ data: result.value, error: '' });
          return true;
        } catch (error) { publishUpdate({ error: error.message || '更新服务不可用，请重启 DSH 后重试。' }); return false; }
        finally { updatePending = false; finish(); if (manual) publishUpdate({ busy: false }); }
      }
      function useUpdateGuard(key, dirty, busy) {
        React.useEffect(() => {
          updateGuards.set(key, { dirty, busy });
          return () => { updateGuards.delete(key); };
        }, [key, dirty, busy]);
      }
      const useUpdates = () => React.useSyncExternalStore(callback => { updateListeners.add(callback); return () => updateListeners.delete(callback); }, () => updateView);
      function UpdateFooter({ subject } = {}) {
        if (!['bundle', 'row'].includes(subject?.kind) || subject?.pkg?.name !== 'dsh-research-workbench') return null;
        return h(ResearchUpdates, { detail: true });
      }
      function ResearchUpdates({ detail = false } = {}) {
        const { data, error, busy } = useUpdates();
        React.useEffect(() => {
          if (!detail) return;
          publishUpdate({ detailVisible: true });
          return () => publishUpdate({ detailVisible: false });
        }, [detail]);
        const [confirming, setConfirming] = React.useState(false);
        const [notes, setNotes] = React.useState(false);
        const pending = busy || data?.installing;
        const choice = action => updateRequest({ action, revision: data.revision, version: data.release?.version });
        const install = async () => {
          if (await updateRequest({ action: 'install', revision: data.revision, version: data.release.version, confirmation: 'update-research-plugin' })) setConfirming(false);
        };
        return h('section', { className: 'drw-updates', 'aria-label': '科研插件版本与更新' },
          h('div', { className: 'drw-update-heading' }, h('h3', null, '版本与更新'), h('button', { disabled: pending, onClick: () => { setConfirming(false); void updateRequest({ action: 'check' }); } }, busy ? '正在处理…' : '检查更新')),
          data ? h(React.Fragment, null,
            h('p', null, '科研工作台 · 已安装 ', data.installedVersion || '暂不可读', data.runningVersion !== data.installedVersion ? ' · 本次运行 ' + data.runningVersion : ''),
            h('p', { role: 'status' }, data.operation?.message || (!data.installedVersion ? '无法读取已安装版本，请在原生插件管理中核对。' : data.available ? `发现新版本：${data.installedVersion} → ${data.release.version}` : data.checkedAt && !data.lastError ? '当前没有更高的稳定版本' : '等待检查更新')),
            data.checkedAt && h('p', { className: 'drw-update-muted' }, '上次检查成功：' + new Date(data.checkedAt).toLocaleString()),
            data.lastError && h('p', { className: 'drw-update-error', role: 'alert' }, '检查失败：' + data.lastError),
            data.available && h('div', { className: 'drw-update-actions' },
              h('button', { className: 'drw-update-primary', disabled: pending || ['restart-required', 'unknown', 'restore-failed'].includes(data.operation?.status), onClick: () => setConfirming(true) }, data.installing ? '更新进行中…' : '更新此插件'),
              h('button', { disabled: pending, onClick: () => choice('later') }, '明天再提醒'),
              h('button', { disabled: pending, onClick: () => choice('ignore') }, data.ignoredVersion === data.release.version ? '已忽略此版本提醒' : '忽略此版本提醒')),
            confirming && h('div', { className: 'drw-update-confirm', role: 'group', 'aria-label': '确认更新科研插件' },
              h('strong', null, `确认更新到 ${data.release.version}？`),
              h('p', null, '请先保存所有科研页面并结束任务。更新完成后需手动重启 DSH；失败时会尝试恢复原插件包。'),
              h('div', { className: 'drw-update-actions' }, h('button', { className: 'drw-update-primary', disabled: pending, onClick: install }, '确认下载并更新'), h('button', { disabled: pending, onClick: () => setConfirming(false) }, '取消'))),
            data.release && h(React.Fragment, null,
              h('button', { 'aria-expanded': notes, onClick: () => setNotes(!notes) }, notes ? '收起更新记录' : '更新记录'),
              notes && h('div', null, h('pre', null, data.release.notes || '此版本未提供更新说明。'), h('a', { href: data.release.page, target: '_blank', rel: 'noopener noreferrer' }, '在 GitHub 查看发行版'))),
            h('label', { className: 'drw-update-preference' }, h('input', { type: 'checkbox', checked: data.checkEnabled, disabled: pending, onChange: event => updateRequest({ action: 'preferences', checkEnabled: event.target.checked, revision: data.revision }) }), '自动检查更新（每天一次，安装前需要确认）'),
            data.deferredUntil > Date.now() && h('p', { className: 'drw-update-muted' }, '已暂停提醒至 ' + new Date(data.deferredUntil).toLocaleString()),
          ) : h('p', null, '正在读取更新状态…'),
          error && h('p', { className: 'drw-update-error', role: 'alert' }, error));
      }
      function UpdateReminder() {
        const { data, busy, detailVisible } = useUpdates();
        const [open, setOpen] = React.useState(false);
        const dialog = React.useRef(null);
        React.useEffect(() => {
          if (data?.installing) dialog.current?.showModal();
          return () => dialog.current?.close();
        }, [data?.installing]);
        if (data?.installing) return h('dialog', { ref: dialog, className: 'drw-update-progress', onCancel: event => event.preventDefault(), 'aria-label': '科研插件正在更新' }, h('h3', null, '正在更新科研工作台'), h('p', { role: 'status' }, data.operation?.message), h('p', null, '请等待更新结束。关闭这个页面不会取消宿主上的安装。'));
        if (!data?.reminder || detailVisible || ['restart-required', 'unknown', 'restore-failed'].includes(data.operation?.status)) return null;
        return h('aside', { className: 'drw-update-reminder', 'aria-label': '科研插件更新提醒' },
          h('strong', null, '科研工作台有新版本 ' + data.release.version),
          h('div', { className: 'drw-update-actions' }, h('button', { onClick: () => setOpen(!open), 'aria-expanded': open }, open ? '收起' : '查看更新'), h('button', { disabled: busy, onClick: () => updateRequest({ action: 'later', revision: data.revision }) }, '明天再提醒')),
          open && h(ResearchUpdates));
      }

      function ArtifactPage(props) {
        const kind = props.panel.kind;
        const [items, setItems] = React.useState([]);
        const [templates, setTemplates] = React.useState([]);
        const [template, setTemplate] = React.useState('');
        const [newTitle, setNewTitle] = React.useState('');
        const [selectedId, setSelectedId] = React.useState(null);
        const [current, setCurrent] = React.useState(null);
        const [draft, setDraft] = React.useState(null);
        const [activeId, setActiveId] = React.useState(null);
        const [busy, setBusy] = React.useState(false);
        const [loading, setLoading] = React.useState(true);
        const [notice, setNotice] = React.useState('');
        const [error, setError] = React.useState('');
        const [saving, setSaving] = React.useState(false);
        const draftRef = React.useRef(null);
        const savedRef = React.useRef('');
        const versionRef = React.useRef(0);
        const busySaveRef = React.useRef(false);
        const saveTimer = React.useRef(null);
        const selectedRef = React.useRef(null);
        const mountedRef = React.useRef(true);
        draftRef.current = draft;
        selectedRef.current = selectedId;
        useUpdateGuard('artifact-' + kind, (!!draft && JSON.stringify(draft) !== savedRef.current) || !!newTitle.trim(), busy || saving);
        React.useEffect(() => {
          mountedRef.current = true;
          let live = true;
          Promise.all([artifactRequest(`/templates`), artifactRequest(`/${kind}`)]).then(([t, p]) => {
            if (!live) return;
            const rows = t.templates?.[kind] || [];
            setTemplates(rows);
            setTemplate(rows[0]?.id || '');
            setItems(p.items || []);
            setLoading(false);
          }).catch(e => { if (live) { setError(e.message); setLoading(false); } });
          return () => {
            live = false;
            if (saveTimer.current) clearTimeout(saveTimer.current);
            // Leaving via the DSH global navigation also attempts to flush the
            // latest local editor state. The host's revision check remains authoritative.
            if (selectedRef.current && draftRef.current &&
                JSON.stringify(draftRef.current) !== savedRef.current && !busySaveRef.current) {
              void artifactRequest(artifactUrl(kind, selectedRef.current), {
                method: 'PUT', body: sendBody({ doc: draftRef.current, expectedRevision: versionRef.current }),
              }).catch(error => console.warn('[research-workbench] leave-save failed', error));
            }
            mountedRef.current = false;
          };
        }, [kind]);
        const refreshItems = React.useCallback(async () => {
          const res = await artifactRequest(`/${kind}`);
          if (mountedRef.current) setItems(res.items || []);
        }, [kind]);
        const flush = React.useCallback(async (override) => {
          const id = selectedRef.current;
          const pending = override || draftRef.current;
          if (!id || !pending || JSON.stringify(pending) === savedRef.current) return true;
          if (busySaveRef.current) { setError('正在保存，请等待当前操作完成'); return false; }
          busySaveRef.current = true; setSaving(true); setError('');
          const snapshot = JSON.stringify(pending), expectedRevision=versionRef.current;
          let succeeded = false;
          try {
            const res = await artifactRequest(artifactUrl(kind,id), {
              method:'PUT',body:sendBody({doc:pending,expectedRevision}),
            });
            if (id !== selectedRef.current) return true;
            versionRef.current = res.item.revision;
            savedRef.current = snapshot;
            succeeded = true;
            if (mountedRef.current) { setCurrent(res.item); setNotice('已保存 · ' + new Date().toLocaleTimeString()); }
            await refreshItems();
            return true;
          } catch(e) { if (mountedRef.current) setError(e.code === 'REVISION_CONFLICT' ? '检测到其他窗口已修改此文件，请复制未保存内容并重新加载。' : e.message); return false; }
          finally {
            busySaveRef.current = false; if (mountedRef.current) setSaving(false);
            if (succeeded && id === selectedRef.current && JSON.stringify(draftRef.current) !== savedRef.current && mountedRef.current && !saveTimer.current) {
              saveTimer.current = setTimeout(() => { saveTimer.current = null; void flush(); }, 1400);
            }
          }
        }, [kind, refreshItems]);
        React.useEffect(() => {
          if (!selectedId || !draft || JSON.stringify(draft) === savedRef.current || busySaveRef.current) return;
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => { saveTimer.current = null; void flush(); }, 1000);
          return () => { if (saveTimer.current) {clearTimeout(saveTimer.current);saveTimer.current=null;} };
        }, [draft,selectedId,flush]);
        const loadOne = React.useCallback(async (id, skipFlush=false) => {
          if (!skipFlush && selectedRef.current && selectedRef.current!==id) {
            if (saveTimer.current) {clearTimeout(saveTimer.current);saveTimer.current=null;}
            if (busySaveRef.current) {setError('当前文档仍在保存，请稍后再切换');return;}
            const ok = await flush(); if (!ok) return;
          }
          setError('');setNotice('');setBusy(true);
          try {
            const {item}=await artifactRequest(artifactUrl(kind,id));
            const initial=JSON.stringify(item.doc);
            versionRef.current=item.revision;
            savedRef.current=initial;
            selectedRef.current=id;
            setSelectedId(id);setCurrent(item);setDraft(item.doc);
            setActiveId((item.doc.slides||item.doc.sections)[0]?.id||null);
          }catch(e){setError(e.message)}finally{setBusy(false)}
        },[kind,flush]);
        const create = async () => {
          if (!newTitle.trim()||!template||busy)return;
          if(selectedRef.current && !await flush())return;
          setBusy(true);setError('');
          try{
            const {item}=await artifactRequest(`/${kind}`,{method:'POST',body:sendBody({title:newTitle.trim(),templateId:template})});
            setNewTitle('');await refreshItems();await loadOne(item.id,true);
          }catch(e){setError(e.message)}finally{setBusy(false)}
        };
        const importFile = async (file) => {
          if (!file || busy) return;
          const office= /\.(docx|pptx)$/i.test(file.name);
          const correctOffice= kind==='slides' ? /\.pptx$/i.test(file.name) : /\.docx$/i.test(file.name);
          if ((office && (!correctOffice || file.size>12*1024*1024)) ||
              (!office && (!/\.(md|txt)$/i.test(file.name) || file.size>300000))) {
            setError(kind==='slides'?'支持 PPTX (最大12 MiB) 或 MD/TXT (最大300 KB)':'支持 DOCX (最大12 MiB) 或 MD/TXT (最大300 KB)');return;
          }
          if (selectedRef.current && !await flush()) return;
          setBusy(true); setError('');
          try {
            const title = newTitle.trim() || file.name.replace(/\.(docx|pptx|md|txt)$/i, '');
            let item;
            if(office){
              const query=new URLSearchParams({title,templateId:template,filename:file.name});
              ({item}=await artifactRequest(`/${kind}/import-office?`+query.toString(),{
                method:'POST',body:await file.arrayBuffer(),headers:{'content-type':'application/octet-stream'},
              }));
            }else{
              ({item}=await artifactRequest(`/${kind}/import`,{
                method:'POST',body:sendBody({title,templateId:template,markdown:await file.text()}),
              }));
            }
            setNewTitle('');await refreshItems();await loadOne(item.id,true);
            if(item.sourceWarnings?.length)setNotice('Office 原文件已保留，可以下载原件；编辑超出原有结构时导出将简化排版。');
          } catch(e) { setError(e.message); }
          finally { setBusy(false); }
        };
        const change = fn => setDraft(d=>{if(!d)return d;return fn(d)});
        const nodes=draft?(draft.slides||draft.sections):[];
        const active=nodes.find(s=>s.id===activeId)||nodes[0];
        const editNode=(field,value)=>{
          change(d=>({...d,[kind==='slides'?'slides':'sections']:nodes.map(s=>s.id===active?.id?{...s,[field]:value}:s)}));
        };
        const addNode=()=>{
          const id=makeId(),node=kind==='slides'
            ? {id,title:`新幻灯片 ${nodes.length+1}`,body:'',layout:'bullets',footer:''}
            : {id,heading:`新章节 ${nodes.length+1}`,body:''};
          change(d=>({...d,[kind==='slides'?'slides':'sections']:[...nodes,node]}));setActiveId(id);
        };
        const reorderNode=(direction)=>{
          const n=nodes.findIndex(s=>s.id===active?.id), j=n+direction;
          if(n<0||j<0||j>=nodes.length)return;
          const moved=nodes.slice();[moved[n],moved[j]]=[moved[j],moved[n]];
          change(d=>({...d,[kind==='slides'?'slides':'sections']:moved}));
        };
        const removeNode=()=>{
          if(nodes.length<=1){setError(`至少保留一个${sectionLabel(kind)}`);return;}
          if(!window.confirm(`确定删除“${active?.title||active?.heading}”？`))return;
          const remain=nodes.filter(s=>s.id!==active?.id);
          change(d=>({...d,[kind==='slides'?'slides':'sections']:remain}));setActiveId(remain[0].id);
        };
        const archive = async () => {
          if(!current||busy)return;
          if(!window.confirm(`归档“${draft?.title}”？归档后不再显示在列表中，文件保留在本机归档目录。`))return;
          setBusy(true);try{
            await artifactRequest(artifactUrl(kind,current.id)+'/archive',{method:'POST',body:'{}'});
            savedRef.current='';selectedRef.current=null;setSelectedId(null);setCurrent(null);setDraft(null);
            setActiveId(null);await refreshItems();setNotice('已归档');
          }catch(e){setError(e.message)}finally{setBusy(false)}
        };
        const buildSlides=async()=>{
          if(!current||kind!=='proposal')return;
          if(!await flush())return;
          setBusy(true);
          try{
            const res=await artifactRequest(`/proposal/${encodeURIComponent(current.id)}/to-slides`,{method:'POST',body:'{}'});
            setNotice('已生成 PPT（' + (res.item?.doc?.slides?.length||0) + '页），点击左侧 PPT 工作台查看。');
            props.onOpenPanel('research-slides');
          }catch(e){setError(e.message)}finally{setBusy(false)}
        };
        React.useEffect(()=>{
          const onKey = e=>{
            if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){
              if(!selectedRef.current)return;
              e.preventDefault();if(saveTimer.current){clearTimeout(saveTimer.current);saveTimer.current=null;}void flush();
            }
          };window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
        },[flush]);
        const updating=(field,value)=>change(d=>({...d,[field]:value}));
        const slideTheme=draft?.theme||'blue';
        return h('section',{className:'drw-artifact-workspace','aria-label':props.panel.title},
          h('aside',{className:'drw-artifact-library'},
            h('div',{className:'drw-artifact-library-header'},
              h('h2',null,props.panel.title),
              h('small',null,'本地保存 · 可编辑导出')
            ),
            h('div',{className:'drw-artifact-new'},
              h('select',{'aria-label':'选择模板',value:template,onChange:e=>setTemplate(e.target.value)},templates.map(t=>h('option',{key:t.id,value:t.id},t.label))),
              h('input',{'aria-label':'新建成果名称',placeholder:kind==='slides'?'演示文稿名称':kind==='proposal'?'项目书名称':'专利或软著材料名称',value:newTitle,onChange:e=>setNewTitle(e.target.value),onKeyDown:e=>e.key==='Enter'&&void create()}),
              h('button',{type:'button',className:'drw-artifact-primary',disabled:busy||!newTitle.trim()||!template,onClick:()=>void create()},'＋ 新建'+productLabels[kind]),
              h('label',{className:'drw-artifact-import'},kind==='slides'?'导入 PPTX / MD / TXT':'导入 Word DOCX / MD / TXT',h('input',{type:'file',accept:kind==='slides'?'.pptx,.md,.txt':'.docx,.md,.txt','aria-label':kind==='slides'?'导入 PowerPoint PPTX 或文本':'导入 Word DOCX 或文本',disabled:busy,onChange:e=>{const file=e.target.files?.[0];e.target.value='';if(file)void importFile(file);}}))
            ),
            h('div',{className:'drw-artifact-projects'},
              loading?h('p',{className:'drw-artifact-muted'},'正在加载…'):
                items.length===0?h('p',{className:'drw-artifact-muted'},'暂无项目。选择模板后创建一份成果。'):
                items.map(item=>h('button',{type:'button',className:'drw-artifact-item'+(selectedId===item.id?' active':''),key:item.id,onClick:()=>void loadOne(item.id)},
                  h('strong',null,item.title),h('small',null,`${item.subtype||productLabels[kind]} · ${item.count} ${kind==='slides'?'页':'节'}`)
                ))
            ),
            h('div',{className:'drw-artifact-library-footer'},h('button',{type:'button',onClick:()=>flush().then(ok=>{if(ok)props.onReturnChat();})},'← 返回聊天'))
          ),
          h('main',{className:'drw-artifact-main'},
            error?h('div',{role:'alert',className:'drw-paper-error'},error):null,
            !draft?h('div',{className:'drw-artifact-empty'},
              h('div',{className:'drw-artifact-empty-icon'},h(Icon,{name:props.panel.icon,size:38})),
              h('h2',null,kind==='proposal'?'新建一份结构完整的科研项目书':kind==='slides'?'制作可编辑、可导出的 PPTX':'准备专利技术交底书或软著材料'),
              h('p',null,kind==='proposal'?'可选通用申报、可行性报告、中试平台方案等模板，逐章节完善内容并导出 Word。':kind==='slides'?'选择模板后编辑每一页的标题和内容，调整顺序与版式，导出可编辑 PowerPoint。':'包含发明专利技术交底书和软件著作权申请材料模板，按章节填写并导出 Word。'),
              h('p',{className:'drw-artifact-muted'},'所有文件默认保存在本机 .dsh/research-workbench 目录。')
            ):
            h('div',{className:'drw-artifact-editor'},
              h('div',{className:'drw-artifact-topbar'},
                h('div',{className:'drw-artifact-title-group'},
                  h('input',{'aria-label':'文档标题',className:'drw-artifact-title',value:draft.title,onChange:e=>updating('title',e.target.value)}),
                  h('small',{className:'drw-artifact-muted'},saving?'保存中…':JSON.stringify(draft)===savedRef.current?'已保存':notice||'有未保存的更改')
                ),
                h('div',{className:'drw-artifact-actions'},
                  h('button',{type:'button',disabled:saving||busy,onClick:()=>void flush()},'保存'),
                  current.sourceFormat?h('a',{href:ARTIFACT_API+artifactUrl(kind,current.id)+'/source',download:true},'原件下载'):null,
                  h('a',{href:exportUrl(kind,current.id,'md'),download:true,onClick:e=>{if(JSON.stringify(draft)!==savedRef.current){e.preventDefault();void flush().then(ok=>{if(ok)window.location.assign(exportUrl(kind,current.id,'md'));});}}},'Markdown'),
                  h('a',{href:exportUrl(kind,current.id,kind==='slides'?'pptx':'docx'),download:true,className:'drw-artifact-primary',onClick:e=>{if(JSON.stringify(draft)!==savedRef.current){e.preventDefault();void flush().then(ok=>{if(ok)window.location.assign(exportUrl(kind,current.id,kind==='slides'?'pptx':'docx'));});}}},'导出 '+(kind==='slides'?'PPTX':'Word')),
                  kind==='proposal'?h('button',{type:'button',disabled:busy,onClick:()=>void buildSlides()},'转换成PPT'):null,
                  h('button',{type:'button',className:'drw-artifact-danger',disabled:busy,onClick:()=>void archive()},'归档')
                )
              ),
              current.sourceFormat?h('div',{className:'drw-office-import-note',role:'note'},
                '已导入 '+current.sourceFormat.toUpperCase()+' 原文件，可随时下载原件。',
                kind==='slides'?'可修改文本框文字；新增/删除页面、调整版式或复杂排版后，导出可能使用简化页面布局。':'可修改标题和段落文字；增加/删除章节或改变原有段落数量后，导出可能使用简化排版。',
                ' 修改后建议用 Word / PowerPoint 核对最终文件。'
              ):null,
              h('div',{className:'drw-artifact-meta'},
                h('label',null,'单位',h('input',{value:draft.organization||'',onChange:e=>updating('organization',e.target.value),placeholder:'申报单位 / 所属机构'})),
                h('label',null,'作者或负责人',h('input',{value:draft.author||'',onChange:e=>updating('author',e.target.value),placeholder:'可选'})),
                kind==='slides'?h('label',null,'演示主题',h('select',{value:slideTheme,onChange:e=>updating('theme',e.target.value)},
                  h('option',{value:'blue'},'经典蓝白'),h('option',{value:'ink'},'简约黑白'),h('option',{value:'dark'},'深蓝'))):null
              ),
              h('div',{className:'drw-artifact-body'},
                h('nav',{className:'drw-artifact-outline','aria-label':sectionLabel(kind)+'目录'},
                  h('div',{className:'drw-artifact-outline-head'},h('strong',null,sectionLabel(kind)+` (${nodes.length})`),h('button',{type:'button',onClick:addNode,title:'添加'},'＋')),
                  h('div',{className:'drw-artifact-outline-items'},nodes.map((s,i)=>h('button',{type:'button',key:s.id,onClick:()=>setActiveId(s.id),className:'drw-artifact-outline-item'+(active?.id===s.id?' active':''),title:s.title||s.heading},`${i+1}. ${s.title||s.heading}`)))
                ),
                h('div',{className:'drw-artifact-fields'},
                  h('div',{className:'drw-artifact-fields-header'},h('strong',null,kind==='slides'?'幻灯片内容':'章节内容'),
                    h('div',{className:'drw-artifact-small-actions'},
                      h('button',{type:'button',onClick:()=>reorderNode(-1),title:'上移'},'↑'),h('button',{type:'button',onClick:()=>reorderNode(1),title:'下移'},'↓'),h('button',{type:'button',onClick:removeNode,title:'删除'},'删除')
                    )),
                  active? h('div',{className:'drw-artifact-fields-content'},
                    h('label',null,kind==='slides'?'页面标题':'章节标题',h('input',{'aria-label':kind==='slides'?'页面标题':'章节标题',value:active.title||active.heading,onChange:e=>editNode(kind==='slides'?'title':'heading',e.target.value)})),
                    kind==='slides'?h('label',null,'版式',h('select',{value:active.layout,onChange:e=>editNode('layout',e.target.value)},
                      h('option',{value:'cover'},'封面'),h('option',{value:'bullets'},'标题 + 正文'),h('option',{value:'two-column'},'双栏（用 --- 分隔）'),h('option',{value:'closing'},'结束页'))):null,
                    h('label',{className:'drw-artifact-area-label'},kind==='slides'?'正文内容（换行分段）':'正文内容（换行分段；以 - 开头表示项目符号）',h('textarea',{
                      'aria-label':'正文',value:active.body,rows:kind==='slides'?12:22,spellCheck:false,onChange:e=>editNode('body',e.target.value),placeholder:'在这里填写经过核实的研究内容…'
                    })),
                    kind==='slides'?h('label',null,'底部文字',h('input',{value:active.footer||'',onChange:e=>editNode('footer',e.target.value),placeholder:'可选'})):null,
                    h('p',{className:'drw-artifact-muted'},kind==='slides'?'PPTX 中的文字框、标题和底色均可在 PowerPoint 中修改。':'此处为结构化正文编辑，导出 DOCX 后可在 Word 中继续精细排版。')
                  ):null
                ),
                kind==='slides'&&active?h('aside',{className:'drw-slide-preview-pane'},
                  h('strong',null,'页面预览（16:9）'),
                  h('div',{className:'drw-slide-preview', 'data-theme':slideTheme},
                    h('div',{className:'drw-slide-accent'}),
                    h('div',{className:'drw-slide-preview-inner','data-layout':active.layout},
                      h('h3',null,active.title||'标题'),
                      active.layout==='two-column'?h('div',{className:'drw-slide-preview-columns'},...(active.body||'').split('\n---\n').slice(0,2).map((v,i)=>h('p',{key:i},...textRows(v,15).map((line,j)=>h('span',{key:j},line))))):
                        h('div',{className:'drw-slide-preview-text'},...textRows(active.body,19).map((line,i)=>h('p',{key:i},line))),
                      h('small',null,active.footer||'')
                    )
                  ),
                  h('p',{className:'drw-artifact-muted'},'预览供快速检查布局，最终以导出后的 PPTX 为准。')
                ):null
              )
            )
          )
        );
      }

      // The paper editor is a first-class keyed main panel. It deliberately
      // communicates with the Host's loopback API instead of storing manuscripts
      // in browser localStorage (which would lose files on profile changes).
      const PAPER_API = '/research-workbench/api';
      const paperEndpoint = (id, suffix = '') => `/papers/${encodeURIComponent(id)}${suffix}`;
      async function paperRequest(endpoint, options = {}) {
        const response = await fetch(PAPER_API + endpoint, {
          credentials: 'same-origin',
          ...options,
          headers: {
            ...(options.raw ? { 'content-type': 'application/octet-stream' } : options.body ? { 'content-type': 'application/json' } : {}),
            ...options.headers,
          },
        });
        let data;
        try { data = await response.json(); }
        catch { throw new Error(`DSH 论文服务返回了非 JSON 响应（HTTP ${response.status}），请确认插件后台已启用并重启 DSH。`); }
        if (!response.ok || data?.ok !== true) {
          const error = new Error(data?.error || `请求失败（HTTP ${response.status}）`);
          error.code = data?.code || 'REQUEST_FAILED';
          error.log = data?.log || '';
          throw error;
        }
        return data;
      }

      function FileGlyph(props) {
        const file = props.file;
        const ext = file.slice(file.lastIndexOf('.') + 1).toUpperCase();
        return h('span', { className: 'drw-file-ext', 'aria-hidden': 'true' }, ext.slice(0, 3));
      }

      function PaperPage(props) {
        const [projects, setProjects] = React.useState([]);
        const [selected, setSelected] = React.useState(null);
        const [files, setFiles] = React.useState([]);
        const [activeFile, setActiveFile] = React.useState('main.tex');
        const [editor, setEditor] = React.useState('');
        const [saved, setSaved] = React.useState('');
        const [sha, setSha] = React.useState(null);
        const [newTitle, setNewTitle] = React.useState('');
        const [newFile, setNewFile] = React.useState('');
        const [addingFile, setAddingFile] = React.useState(false);
        const [notice, setNotice] = React.useState('');
        const [error, setError] = React.useState('');
        const [compileLog, setCompileLog] = React.useState('');
        const [showLog, setShowLog] = React.useState(false);
        const [hasPdf, setHasPdf] = React.useState(false);
        const [pdfRevision, setPdfRevision] = React.useState(0);
        const [engine, setEngine] = React.useState(null);
        const [loading, setLoading] = React.useState(true);
        const [busy, setBusy] = React.useState(false);
        const [compiling, setCompiling] = React.useState(false);
        const [compileJob, setCompileJob] = React.useState(null);
        const [compileHistory, setCompileHistory] = React.useState([]);
        const [historyId, setHistoryId] = React.useState('');
        const [compileClock, setCompileClock] = React.useState(Date.now());
        const compileRef = React.useRef(null);
        const historyEpoch = React.useRef(0);
        const historySelection = React.useRef('');
        const state = React.useRef({});
        const savePending = React.useRef(null);
        const mounted = React.useRef(true);
        const selectionEpoch = React.useRef(0);
        const uploadRef = React.useRef(null);
        state.current = { selected, files, activeFile, editor, saved, sha };
        useUpdateGuard('papers', editor !== saved || !!newTitle.trim() || !!newFile.trim(), busy || compiling);

        function applyCompile(id, record, pdfAvailable) {
          if (!mounted.current || state.current.selected?.id !== id) return;
          const previous = compileRef.current;
          if (previous && record && (previous.startedAt > record.startedAt || (previous.id === record.id && previous.status !== 'running' && record.status === 'running'))) return;
          compileRef.current = record;
          setCompileJob(record);
          setCompiling(record?.status === 'running');
          if (!historySelection.current) setCompileLog(record?.log || '');
          if (typeof pdfAvailable === 'boolean') setHasPdf(pdfAvailable);
          if (record?.status === 'succeeded' && (previous?.id !== record.id || previous?.status !== record.status)) {
            setPdfRevision(Date.now());
          }
          if (record && record.status !== 'running' && (previous?.id !== record.id || previous?.status === 'running')) {
            void refreshCompileHistory(id).catch(e => { if (mounted.current && state.current.selected?.id === id) setError('无法读取编译历史：' + e.message); });
          }
        }
        async function refreshCompileHistory(id) {
          const result = await paperRequest(paperEndpoint(id, '/compiles'));
          if (mounted.current && state.current.selected?.id === id) setCompileHistory(result.history);
        }
        async function selectCompileHistory(runId) {
          setHistoryId(runId);
          historySelection.current = runId;
          const epoch = ++historyEpoch.current;
          if (!runId) {
            setCompileLog(compileRef.current?.log || '');
            return;
          }
          const id = state.current.selected?.id;
          try {
            const result = await paperRequest(paperEndpoint(id, '/compiles/' + encodeURIComponent(runId)));
            if (mounted.current && state.current.selected?.id === id && historyEpoch.current === epoch) setCompileLog(result.compile.log || '暂无编译输出');
          } catch (e) { if (mounted.current && state.current.selected?.id === id) setError(e.message); }
        }

        async function refreshList() {
          const result = await paperRequest('/papers');
          if (mounted.current) setProjects(result.projects);
          return result.projects;
        }
        async function refreshFiles(id) {
          const result = await paperRequest(paperEndpoint(id));
          if (mounted.current && state.current.selected?.id === id) {
            setFiles(result.files);
            setHasPdf(result.hasPdf);
            setSelected(result.project);
          }
          return result;
        }
        async function saveCurrent() {
          const current = state.current;
          if (!current.selected || !current.activeFile || current.editor === current.saved) return true;
          if (savePending.current) {
            try { await savePending.current; } catch { return false; }
            if (state.current.editor === state.current.saved) return true;
            return saveCurrent();
          }
          if (current.sha === undefined) return false;
          const id = current.selected.id, name = current.activeFile;
          const source = current.editor, expectedSha = current.sha;
          setNotice('正在保存…');
          const pending = paperRequest(paperEndpoint(id, '/file?path=' + encodeURIComponent(name)), {
            method: 'PUT', body: JSON.stringify({ content: source, expectedSha }),
          }).then(result => {
            if (mounted.current && state.current.selected?.id === id && state.current.activeFile === name) {
              state.current.sha = result.sha;
              state.current.saved = source;
              setSha(result.sha);
              setSaved(source);
              setNotice('已保存到本机');
              setError('');
            }
            return result;
          }).catch(e => {
            if (mounted.current) {
              setError(e.code === 'VERSION_CONFLICT' ? '文件在其他位置被修改。请复制当前编辑内容后重新打开，不会覆盖磁盘上的新版本。' : e.message);
              setNotice('保存失败');
            }
            throw e;
          }).finally(() => { if (savePending.current === pending) savePending.current = null; });
          savePending.current = pending;
          try { await pending; return true; } catch { return false; }
        }
        async function readIntoEditor(id, name, epoch) {
          const item = await paperRequest(paperEndpoint(id, '/file?path=' + encodeURIComponent(name)));
          if (!mounted.current || selectionEpoch.current !== epoch) return;
          state.current.activeFile = item.path;
          state.current.editor = item.content;
          state.current.saved = item.content;
          state.current.sha = item.sha;
          setActiveFile(item.path);
          setEditor(item.content);
          setSaved(item.content);
          setSha(item.sha);
          setNotice('已从本机打开');
        }
        async function openProject(id, preferredFile = 'main.tex') {
          if (!(await saveCurrent())) return;
          const epoch = ++selectionEpoch.current;
          setBusy(true); setError('');
          try {
            const data = await paperRequest(paperEndpoint(id));
            if (!mounted.current || epoch !== selectionEpoch.current) return;
            setSelected(data.project);
            state.current.selected = data.project;
            setFiles(data.files);
            setHasPdf(data.hasPdf);
            setPdfRevision(Date.now());
            ++historyEpoch.current;
            historySelection.current = '';
            setHistoryId('');
            setCompileHistory([]);
            compileRef.current = null;
            applyCompile(id, data.compile, data.hasPdf);
            try { window.sessionStorage?.setItem('dsh-rwb-selected-paper', id); } catch { /* optional UI preference */ }
            void refreshCompileHistory(id).catch(e => { if (mounted.current && state.current.selected?.id === id) setError(e.message); });
            const target = data.files.find(file => file.path === preferredFile && file.editable)
              ?? data.files.find(file => file.editable);
            if (target) await readIntoEditor(id, target.path, epoch);
            else { setActiveFile(''); setEditor(''); setSaved(''); setSha(null); }
          } catch (e) { if (mounted.current) setError(e.message); }
          finally { if (mounted.current && epoch === selectionEpoch.current) setBusy(false); }
        }
        async function openFile(name) {
          if (!selected || name === activeFile) return;
          if (!(await saveCurrent())) return;
          const epoch = ++selectionEpoch.current;
          setError('');
          try { await readIntoEditor(selected.id, name, epoch); }
          catch (e) { if (mounted.current) setError(e.message); }
        }
        React.useEffect(() => {
          mounted.current = true;
          void (async () => {
            try {
              const [list, health] = await Promise.all([refreshList(), paperRequest('/health')]);
              if (!mounted.current) return;
              setEngine(health.tectonic);
              let preferred;
              try { preferred = window.sessionStorage?.getItem('dsh-rwb-selected-paper'); } catch { /* optional UI preference */ }
              if (list.length > 0) await openProject(list.find(item => item.id === preferred)?.id || list[0].id);
            } catch (e) { if (mounted.current) setError(e.message); }
            finally { if (mounted.current) setLoading(false); }
          })();
          return () => {
            if (state.current.editor !== state.current.saved) void saveCurrent();
            mounted.current = false; ++selectionEpoch.current;
          };
        }, []);
        React.useEffect(() => {
          const id = selected?.id;
          if (!id) return;
          let stopped = false;
          let timer;
          async function poll() {
            try {
              const result = await paperRequest(paperEndpoint(id, '/compile'));
              if (!stopped) {
                applyCompile(id, result.compile, result.hasPdf);
                setError(current => current.startsWith('无法读取编译状态：') ? '' : current);
              }
            } catch (e) {
              if (!stopped && mounted.current && state.current.selected?.id === id) setError('无法读取编译状态：' + e.message + '。恢复连接后会继续查询。');
            } finally {
              if (!stopped) timer = window.setTimeout(poll, compileRef.current?.status === 'running' ? 1000 : 3000);
            }
          }
          void poll();
          return () => { stopped = true; window.clearTimeout(timer); };
        }, [selected?.id]);
        React.useEffect(() => {
          if (!compiling) return;
          setCompileClock(Date.now());
          const timer = window.setInterval(() => setCompileClock(Date.now()), 1000);
          return () => window.clearInterval(timer);
        }, [compiling]);
        React.useEffect(() => {
          if (!selected || !activeFile || editor === saved || busy || compiling) return;
          const timer = window.setTimeout(() => { void saveCurrent(); }, 1300);
          return () => window.clearTimeout(timer);
        }, [selected?.id, activeFile, editor, saved, busy, compiling]);
        React.useEffect(() => {
          const onKey = event => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
              event.preventDefault(); event.stopPropagation();
              void saveCurrent();
            }
          };
          const beforeUnload = event => {
            if (state.current.editor !== state.current.saved) { event.preventDefault(); event.returnValue = ''; }
          };
          window.addEventListener('keydown', onKey, true);
          window.addEventListener('beforeunload', beforeUnload);
          return () => { window.removeEventListener('keydown', onKey, true); window.removeEventListener('beforeunload', beforeUnload); };
        }, []);

        async function createProject(event) {
          event?.preventDefault?.();
          if (!newTitle.trim()) return;
          if (!(await saveCurrent())) return;
          setBusy(true); setError('');
          try {
            const created = await paperRequest('/papers', { method: 'POST', body: JSON.stringify({ title: newTitle }) });
            setNewTitle('');
            await refreshList();
            await openProject(created.project.id);
          } catch (e) { setError(e.message); }
          finally { if (mounted.current) setBusy(false); }
        }
        async function createFile(event) {
          event?.preventDefault?.();
          const id = selected?.id, name = newFile.trim();
          if (!id || !name || !(await saveCurrent())) return;
          setBusy(true); setError('');
          try {
            const content = name.endsWith('.bib') ? '% Bibliography\n' : '';
            await paperRequest(paperEndpoint(id, '/file?path=' + encodeURIComponent(name)), { method:'PUT', body:JSON.stringify({ content, expectedSha: null }) });
            setNewFile(''); setAddingFile(false);
            await refreshFiles(id);
            await openFile(name);
          } catch (e) { setError(e.message); }
          finally { if (mounted.current) setBusy(false); }
        }
        async function uploadFiles(event) {
          const chosen = Array.from(event.target.files ?? []);
          event.target.value = '';
          if (!chosen.length || !selected || !(await saveCurrent())) return;
          setBusy(true); setError('');
          try {
            for (const file of chosen) {
              if (file.size > 20 * 1024 * 1024) throw new Error('导入文件不能超过 20 MiB');
              await paperRequest(paperEndpoint(selected.id, '/upload?path=' + encodeURIComponent(file.name)), {
                method:'POST', raw:true, body: await file.arrayBuffer(),
              });
            }
            await refreshFiles(selected.id);
            setNotice(`已导入 ${chosen.length} 个文件`);
          } catch (e) { setError(e.message); }
          finally { if (mounted.current) setBusy(false); }
        }
        async function renameCurrent() {
          if (!selected) return;
          const name = window.prompt('修改论文项目名称', selected.title);
          if (name === null || !name.trim()) return;
          if (!(await saveCurrent())) return;
          try {
            const result = await paperRequest(paperEndpoint(selected.id), { method:'PATCH', body:JSON.stringify({title:name}) });
            setSelected(result.project);
            await refreshList();
          } catch(e) { setError(e.message); }
        }
        async function archiveCurrent() {
          if (!selected || !window.confirm(`将「${selected.title}」归档？文件不会被删除，但会从当前论文列表隐藏。`)) return;
          if (!(await saveCurrent())) return;
          setBusy(true);
          try {
            await paperRequest(paperEndpoint(selected.id,'/archive'), {method:'POST',body:'{}'});
            setSelected(null); setFiles([]); setActiveFile(''); setEditor(''); setSaved('');
            state.current = { selected: null, activeFile:'', editor:'', saved:'', sha:null };
            const remaining = await refreshList();
            if (remaining.length > 0) await openProject(remaining[0].id);
            setNotice('项目已归档，源文件仍保存在本机');
          } catch(e) { setError(e.message); }
          finally { if (mounted.current) setBusy(false); }
        }
        async function compileCurrent() {
          const id = selected?.id;
          if (!id || !(await saveCurrent())) return;
          setCompiling(true); setError(''); setShowLog(true);
          setHistoryId(''); ++historyEpoch.current; historySelection.current = '';
          try {
            const result = await paperRequest(paperEndpoint(id, '/compile'), { method:'POST', body:'{}' });
            if (mounted.current && state.current.selected?.id === id) {
              applyCompile(id, result.compile);
            }
          } catch(e) {
            if (mounted.current && state.current.selected?.id === id) {
              setError(e.message);
              const current = await paperRequest(paperEndpoint(id, '/compile')).catch(() => null);
              if (current) applyCompile(id, current.compile, current.hasPdf);
              else setCompiling(false);
            }
          }
        }
        async function stopCompile() {
          const id = selected?.id;
          if (!id) return;
          try {
            const result = await paperRequest(paperEndpoint(id, '/compile/cancel'), { method:'POST', body:'{}' });
            applyCompile(id, result.compile);
          } catch (e) { if (mounted.current && state.current.selected?.id === id) setError(e.message); }
        }
        const dirty = editor !== saved;
        const elapsed = compileJob ? Math.max(0, Math.floor(((compileJob.finishedAt ? Date.parse(compileJob.finishedAt) : compileClock) - Date.parse(compileJob.startedAt)) / 1000)) : 0;
        const compileLabel = compileJob ? ({ running: '后台编译中', succeeded: '编译成功', failed: '编译失败', cancelled: '编译已停止', interrupted: '上次编译已中断' }[compileJob.status] || compileJob.status) : '尚未编译';
        const pdfUrl = selected ? PAPER_API + paperEndpoint(selected.id,'/pdf?rev='+pdfRevision) : '';
        return h('section', { className:'drw-paper', 'aria-label':'论文管理', 'data-research-panel':'research-papers' },
          h('header', { className:'drw-paper-header' },
            h('div', { className:'drw-paper-title' },
              h(Icon,{name:'book',size:22}),
              h('div',null,h('h1',null,'论文管理'),h('p',null,'本地论文项目 · LaTeX 编辑 · Tectonic 编译'))
            ),
            h('div',{className:'drw-paper-actions'},
              h('button',{type:'button',className:'drw-paper-button',onClick:async()=>{if(await saveCurrent())props.onReturnChat();}},'返回聊天')
            )
          ),
          error && h('div',{className:'drw-paper-error',role:'alert'},error),
          h('div',{className:'drw-paper-workspace'},
            h('aside',{className:'drw-paper-library'},
              h('div',{className:'drw-paper-group-title'},'论文项目',h('span',null,projects.length)),
              h('form',{onSubmit:createProject,className:'drw-paper-create'},
                h('input',{type:'text','aria-label':'新论文项目名称',placeholder:'输入论文标题',value:newTitle,maxLength:120,onChange:e=>setNewTitle(e.target.value),disabled:busy}),
                h('button',{type:'submit',disabled:busy||!newTitle.trim(),title:'新建论文'},'创建')
              ),
              h('div',{className:'drw-paper-project-list'},
                projects.map(p => h('button',{key:p.id,type:'button',className:'drw-paper-project'+(selected?.id===p.id?' is-active':''),onClick:()=>void openProject(p.id),disabled:busy},
                  h('strong',null,p.title),h('small',null,new Date(p.updatedAt).toLocaleDateString())
                ))
              ),
              selected && h('div',{className:'drw-paper-files'},
                h('div',{className:'drw-paper-group-title'},'文件',h('span',null,files.length)),
                h('div',{className:'drw-paper-file-actions'},
                  h('button',{type:'button',onClick:()=>setAddingFile(v=>!v),disabled:busy,title:'创建 tex、bib 等文件'},'＋ 新文件'),
                  h('button',{type:'button',onClick:()=>uploadRef.current?.click(),disabled:busy,title:'导入 tex、bib、sty、cls、图片和 PDF'},'导入'),
                  h('input',{type:'file',multiple:true,ref:uploadRef,hidden:true,onChange:uploadFiles,accept:'.tex,.bib,.cls,.sty,.txt,.png,.jpg,.jpeg,.pdf,.svg,.eps'})
                ),
                addingFile && h('form',{onSubmit:createFile,className:'drw-paper-create'},
                  h('input',{value:newFile,onChange:e=>setNewFile(e.target.value),placeholder:'例如 sections/method.tex','aria-label':'新文件路径'}),
                  h('button',{type:'submit',disabled:busy||!newFile.trim()},'创建')
                ),
                h('div',{className:'drw-paper-file-list'},files.map(file=>h('button',{
                  key:file.path,type:'button',disabled:!file.editable||busy,onClick:()=>void openFile(file.path),
                  className:'drw-paper-file'+(file.path===activeFile?' is-active':''),title:file.path,
                },h(FileGlyph,{file:file.path}),h('span',null,file.path))))
              ),
              selected && h('div',{className:'drw-paper-project-actions'},
                h('button',{type:'button',onClick:renameCurrent,disabled:busy},'重命名'),
                h('button',{type:'button',onClick:archiveCurrent,disabled:busy},'归档')
              )
            ),
            h('div',{className:'drw-paper-main'},
              !selected ? h('div',{className:'drw-paper-empty'},
                h('h2',null,loading?'正在加载本地论文项目…':'创建你的第一篇论文'),
                h('p',null,loading?'': '在左侧输入论文标题并点击「创建」，自动生成 main.tex 和 references.bib。')
              ) : h('div',{className:'drw-paper-editor-layout'+(showLog?' has-compile-log':'')},
                h('div',{className:'drw-paper-source'},
                  h('div',{className:'drw-paper-toolbar'},
                    h('div',{className:'drw-paper-file-heading'},
                      h('strong',null,activeFile||'源文件'),
                      h('span',{className:dirty?'drw-paper-dirty':'drw-paper-muted'},dirty?'● 未保存':notice||'已保存')
                    ),
                    h('div',{className:'drw-paper-buttons'},
                      activeFile && h('a',{className:'drw-paper-button',href:PAPER_API+paperEndpoint(selected.id,'/download?path='+encodeURIComponent(activeFile)),download:true,title:'下载磁盘上已保存的文件版本'},'下载源码'),
                      h('button',{type:'button',className:'drw-paper-button',disabled:!dirty||busy,onClick:()=>void saveCurrent()},'保存'),
                      compiling && h('button',{type:'button',className:'drw-paper-button',onClick:stopCompile},'停止编译'),
                      h('button',{type:'button',className:'drw-paper-primary',disabled:compiling||busy,onClick:compileCurrent},compiling?'后台编译中…':'编译 PDF')
                    )
                  ),
                  compileJob && h('div',{className:'drw-paper-compile-status','data-status':compileJob.status,role:'status'},
                    h('strong',null,compileLabel),
                    h('span',null,compiling ? `已运行 ${elapsed} 秒 · 切换页面后继续，返回可恢复日志。首次编译可能需要联网下载宏包。` : `${new Date(compileJob.finishedAt || compileJob.startedAt).toLocaleString()} · ${elapsed} 秒`),
                    compileJob.error && h('span',null,compileJob.error)
                  ),
                  h('textarea',{className:'drw-paper-code',value:editor,spellCheck:false,'aria-label':'LaTeX 源码编辑器',
                    onChange:e=>{state.current.editor=e.target.value;setEditor(e.target.value);},
                    disabled:!activeFile,placeholder:'打开或新建 tex 文件后开始编辑…'}),
                  h('div',{className:'drw-paper-bottom'},
                    h('span',null,engine?.available ? `Tectonic: ${engine.version||'已安装'}` : '未检测到 Tectonic（需要本机安装才能编译）'),
                    h('button',{type:'button',className:'drw-paper-link',onClick:()=>setShowLog(v=>!v)},showLog?'关闭日志':'查看编译日志')
                  ),
                  showLog && h('div',{className:'drw-paper-log-panel'},
                    h('label',{className:'drw-paper-history'},'编译记录',h('select',{'aria-label':'编译记录',value:historyId,onChange:e=>void selectCompileHistory(e.target.value)},
                      h('option',{value:''},'最近一次（编译时实时更新）'),
                      compileHistory.map(item=>h('option',{key:item.id,value:item.id},`${new Date(item.startedAt).toLocaleString()} · ${{succeeded:'成功',failed:'失败',cancelled:'已停止',interrupted:'已中断'}[item.status] || item.status}`))
                    )),
                    h('pre',{className:'drw-paper-log','aria-label':'编译日志'},compileLog||'暂无编译日志')
                  )
                ),
                h('div',{className:'drw-paper-preview'},
                  h('div',{className:'drw-paper-preview-header'},
                    h('strong',null,'PDF 预览',hasPdf?'（上次成功编译）':''),
                    hasPdf && h('div',{className:'drw-paper-buttons'},
                      h('a',{href:pdfUrl,download:'main.pdf'},'下载 PDF'),
                      h('a',{href:pdfUrl,target:'_blank',rel:'noopener noreferrer'},'新窗口打开')
                    )
                  ),
                  hasPdf ? h('iframe',{title:'论文 PDF 预览',src:pdfUrl,className:'drw-paper-pdf'})
                    : h('div',{className:'drw-paper-preview-empty'},
                        h(Icon,{name:'book',size:30}),
                        h('strong',null,compiling?'正在后台生成 PDF':compileJob?.error?'本次编译没有生成 PDF':'还没有编译结果'),
                        h('p',null,compiling?'可以切换页面，编译状态和日志会保留。':compileJob?.error?'请查看编译日志；修正问题后可重新编译。':'保存 LaTeX 源码后点击「编译 PDF」，成功后在此预览。'),
                        !engine?.available && h('a',{href:'https://github.com/tectonic-typesetting/tectonic/releases/tag/tectonic%400.17.0',target:'_blank',rel:'noopener noreferrer'},'获取 Tectonic 0.17.0')
                      )
                )
              )
            )
          )
        );
      }

      /** Native DSH panel for CCF submission deadlines. The source only has dates, not clock times. */
      function DeadlinePage(props) {
        const [payload,setPayload] = React.useState(null);
        const [loading,setLoading] = React.useState(true);
        const [error,setError] = React.useState('');
        const [level,setLevel] = React.useState('all');
        const [area,setArea] = React.useState('focus');
        const [windowDays,setWindowDays] = React.useState('90');
        const [query,setQuery] = React.useState('');
        const [onlyFav,setOnlyFav] = React.useState(false);
        const [favorites,setFavorites] = React.useState(() => {
          try { const x = JSON.parse(window.localStorage?.getItem('dsh-rwb-ccf-favorites') || '[]');
            return Array.isArray(x) ? x.filter(v=>typeof v==='string').slice(0,1000) : [];
          } catch { return []; }
        });
        async function load(force=false) {
          setLoading(true);setError('');
          try {
            const response=await fetch('/research-workbench/deadlines'+(force?'?refresh=1':''),{credentials:'same-origin'});
            const result=await response.json();
            if(!response.ok||!result.ok)throw Error(result.error||'无法获取会议数据');
            setPayload(result);
          } catch(e){ setError(e.message||String(e)); }
          finally{ setLoading(false); }
        }
        React.useEffect(()=>{let canceled=false;
          const request=fetch('/research-workbench/deadlines',{credentials:'same-origin'}).then(async res=>{
            const data=await res.json();if(!res.ok||!data.ok)throw Error(data.error||'获取失败');
            if(!canceled){setPayload(data);setError('');}
          }).catch(e=>{if(!canceled)setError(e.message||String(e));}).finally(()=>{if(!canceled)setLoading(false)});
          return ()=>{canceled=true;void request;};
        },[]);
        const current=new Date();
        const today=Date.UTC(current.getFullYear(),current.getMonth(),current.getDate());
        const distance=(date)=>{
          if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return null;
          const [year,month,day]=date.split('-').map(Number);
          return Math.round((Date.UTC(year,month-1,day)-today)/86400000);
        };
        const focusRe=/\b(?:AI|NLP|CV|ML|VISION|SECURITY|MULTIMEDIA|COMPUTER\s*VISION)\b/i;
        const knownFocus=/^(AAAI|ACL|EMNLP|NAACL|ICLR|ICML|NEURIPS|NIPS|IJCAI|CVPR|ICCV|ECCV|ACM MM|CCS|NDSS|USENIX SECURITY|IEEE S&P|ICSE|ASE|ICPR|WACV)$/i;
        const all=payload?.conferences||[];
        const featured=all.filter(x=>{
          const fields=(x.areas||[]).join(' ');
          return focusRe.test(fields)||knownFocus.test(x.name);
        });
        const favoritesSet=new Set(favorites);
        const filtered=all.filter(x=>{
          const days=distance(x.deadline);
          if(level!=='all'&&x.rank!==level)return false;
          if(onlyFav&&!favoritesSet.has(x.name))return false;
          if(area==='focus'&&!featured.includes(x))return false;
          if(!['all','focus'].includes(area)&&!(x.areas||[]).some(v=>v.toLowerCase().includes(area)))return false;
          if(windowDays!=='any'&&(days===null||days<0||days>Number(windowDays)))return false;
          if(windowDays==='any' && days!==null && days<0 && !onlyFav)return false;
          const term=query.trim().toLowerCase();
          if(term && !(x.name+' '+x.title+' '+(x.areas||[]).join(' ')).toLowerCase().includes(term))return false;
          return true;
        }).sort((a,b)=>{
          const da=distance(a.deadline),db=distance(b.deadline);
          return (da===null?1e9:da)-(db===null?1e9:db)||a.name.localeCompare(b.name);
        });
        const toggleFavorite=(name)=>{
          const next=favoritesSet.has(name)?favorites.filter(x=>x!==name):[...favorites,name];
          setFavorites(next);
          try{window.localStorage?.setItem('dsh-rwb-ccf-favorites',JSON.stringify(next));}catch{/* private window */}
        };
        const labelDays=(days)=>days===null?'待公布':days===0?'今天截止':days>0?'还有 '+days+' 天':'已过期';
        const sourceTime=payload?.generatedAt ? new Date(payload.generatedAt) : null;
        const dataTime=sourceTime&&!Number.isNaN(sourceTime.getTime())?sourceTime.toLocaleString('zh-CN',{hour12:false}):'未知';
        return h('section',{className:'drw-ccf-page',role:'region','aria-label':'CCF 投稿截止日历'},
          h('header',{className:'drw-ccf-header'},
            h('div',null,h('div',{className:'drw-ccf-eyebrow'},'RESEARCH · CONFERENCE DEADLINES'),
              h('h1',null,'CCF 投稿截止日历'),
              h('p',null,'按等级、研究方向和截稿日期筛选会议；收藏你正在准备投稿的会议。')),
            h('div',{className:'drw-ccf-actions'},
              h('button',{type:'button',disabled:loading,onClick:()=>void load(true)},loading?'更新中…':'更新日期'),
              h('button',{type:'button',onClick:()=>props.onReturnChat()},'返回聊天'))
          ),
          h('div',{className:'drw-ccf-stats'},
            h('div',null,h('strong',null,all.length),h('span',null,'已收录 CCF 会议')),
            h('div',null,h('strong',null,all.filter(x=>{const n=distance(x.deadline);return n!==null&&n>=0&&n<=30}).length),h('span',null,'未来 30 天截稿')),
            h('div',null,h('strong',null,all.filter(x=>{const n=distance(x.deadline);return n!==null&&n>=0&&n<=90}).length),h('span',null,'未来 90 天截稿')),
            h('div',null,h('strong',null,favorites.length),h('span',null,'收藏的会议'))
          ),
          h('div',{className:'drw-ccf-filter'},
            h('label',null,'会议搜索',h('input',{type:'search',value:query,onChange:e=>setQuery(e.target.value),placeholder:'例如 CVPR / ICLR / ACL'})),
            h('label',null,'CCF 分级',h('select',{value:level,onChange:e=>setLevel(e.target.value)},
              h('option',{value:'all'},'全部级别'),h('option',{value:'A'},'CCF A'),h('option',{value:'B'},'CCF B'),h('option',{value:'C'},'CCF C'))),
            h('label',null,'研究方向',h('select',{value:area,onChange:e=>setArea(e.target.value)},
              h('option',{value:'focus'},'AI / 视觉 / NLP / 安全'),h('option',{value:'all'},'全部方向'),
              h('option',{value:'ai'},'人工智能'),h('option',{value:'nlp'},'自然语言处理'),
              h('option',{value:'cv'},'计算机视觉'),h('option',{value:'security'},'安全'),
              h('option',{value:'se'},'软件工程'),h('option',{value:'database'},'数据库'))),
            h('label',null,'截稿范围',h('select',{value:windowDays,onChange:e=>setWindowDays(e.target.value)},
              h('option',{value:'30'},'未来 30 天'),h('option',{value:'90'},'未来 90 天'),
              h('option',{value:'365'},'未来一年'),h('option',{value:'any'},'所有未来及待公布'))),
            h('label',{className:'drw-ccf-favorite-toggle'},h('input',{type:'checkbox',checked:onlyFav,onChange:e=>setOnlyFav(e.target.checked)}),'仅看收藏')
          ),
          h('div',{className:'drw-ccf-databar'},
            h('span',null,loading?'正在读取会议数据':`筛选结果 ${filtered.length} 条 · 数据更新于 ${dataTime}`),
            h('a',{href:'https://ccfddl.com/',target:'_blank',rel:'noopener noreferrer'},'查看含时区的社区截稿目录')),
          payload?.stale?h('div',{className:'drw-ccf-warning',role:'status'},'当前使用离线缓存，在线更新未成功。请核对会议官网。'):null,
          error?h('div',{className:'drw-ccf-warning',role:'alert'},error):null,
          h('div',{className:'drw-ccf-list'},
            !loading&&!filtered.length?h('div',{className:'drw-ccf-empty'},
              all.length?'当前筛选没有匹配的未来截稿记录，可以扩大日期范围。':'暂时没有会议数据，请点击“更新日期”或检查网络。'):null,
            filtered.map(x=>{
              const days=distance(x.deadline),isFavorite=favoritesSet.has(x.name);
              return h('article',{className:'drw-ccf-row',key:x.name},
                h('button',{className:'drw-ccf-star'+(isFavorite?' active':''),type:'button',
                  'aria-label':(isFavorite?'取消收藏 ':'收藏 ')+x.name,'aria-pressed':isFavorite,onClick:()=>toggleFavorite(x.name)},isFavorite?'★':'☆'),
                h('div',{className:'drw-ccf-main'},
                  h('div',{className:'drw-ccf-name'},h('strong',null,x.name),h('span',{className:'drw-ccf-rank'},'CCF '+x.rank)),
                  h('p',null,x.title||'会议名称未提供'),
                  h('span',{className:'drw-ccf-subline'},x.location||'地点待公布')),
                h('div',{className:'drw-ccf-deadline'},
                  h('strong',null,x.deadline||'暂未公布'),
                  h('span',null,labelDays(days)),
                  h('small',null,'具体时间/时区请以官网为准')),
                h('div',{className:'drw-ccf-links'},
                  x.page?h('a',{href:x.page,target:'_blank',rel:'noopener noreferrer'},'会议详情 ↗'):h('span',null,'来源链接暂缺'))
              );
            })
          ),
          h('footer',{className:'drw-ccf-footnote'},
            '日期与 CCF 分级来自 Conference Partner (myhuiban.com) 公开汇总；不是会议主办方的最终通知。',
            '数据仅给出日期，没有精确时刻或 AoE/时区信息，正式投稿前务必点开详情并核对官方 CFP。',
            '过期截稿默认隐藏，未公布的日期不会推算。')
        );
      }

      const CSS = `
        /* The built-in redundant More launcher is visually replaced by our CCF panel row. */
        nav[class*="panelList"] button[aria-haspopup="menu"][aria-label="更多"],
        nav[class*="panelList"] button[aria-haspopup="menu"][aria-label="More"]{display:none!important;}
        /* Artifact studios: native DSH layout, no extra overlay or navigation shell. */
        .drw-artifact-workspace{display:grid;grid-template-columns:256px minmax(0,1fr);width:100%;height:100%;min-height:0;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#161a22);font-size:13px;}
        .drw-artifact-workspace *{box-sizing:border-box;}
        .drw-artifact-library{display:flex;flex-direction:column;min-height:0;min-width:0;border-right:1px solid var(--dsw-alias-border-l3,#e1e5ea);background:var(--dsw-alias-bg-layer-1,#f8f9fb);}
        .drw-artifact-library-header{padding:22px 17px 12px;display:flex;flex-direction:column;gap:4px;}
        .drw-artifact-library-header h2{margin:0;font-size:19px;font-weight:600;}
        .drw-artifact-library-header small{color:var(--dsw-alias-label-secondary,#68768a);}
        .drw-artifact-new{display:flex;flex-direction:column;gap:8px;padding:4px 14px 16px;border-bottom:1px solid var(--dsw-alias-border-l3,#e1e5ea);}
        .drw-artifact-new input,.drw-artifact-new select,.drw-artifact-fields input,.drw-artifact-fields select,.drw-artifact-meta input,.drw-artifact-meta select{width:100%;min-width:0;padding:8px 10px;font:inherit;background:var(--dsw-alias-bg-base,#fff);color:inherit;border:1px solid var(--dsw-alias-border-l3,#d7dce4);border-radius:7px;}
        .drw-artifact-workspace button{font-family:inherit;color:inherit;cursor:pointer;}
        .drw-artifact-workspace button:disabled{opacity:.5;cursor:not-allowed;}
        .drw-artifact-primary{display:inline-flex;align-items:center;justify-content:center;padding:9px 12px;border:1px solid #1e2736;border-radius:7px;background:#1e2736!important;color:#fff!important;text-decoration:none;font-size:12px;font-weight:600;}
        .drw-office-import-note{padding:11px 20px;border-bottom:1px solid var(--dsw-alias-border-l3,#dbe2ea);background:var(--dsw-alias-bg-base,#fff);font-size:12px;line-height:1.7;color:var(--dsw-alias-label-secondary,#64748b);}
        .drw-artifact-import{display:block;text-align:center;padding:9px;border:1px dashed var(--dsw-alias-border-l3,#ced4da);border-radius:7px;cursor:pointer;color:var(--dsw-alias-label-secondary,#607080);font-size:11px;}
        .drw-artifact-import input{display:none;}
        .drw-artifact-projects{overflow:auto;flex:1;padding:12px 9px;min-height:0;}
        .drw-artifact-item{width:100%;display:flex;flex-direction:column;gap:6px;align-items:flex-start;text-align:left;border:1px solid transparent;border-radius:8px;padding:12px 11px;background:transparent;}
        .drw-artifact-item:hover,.drw-artifact-outline-item:hover{background:var(--dsw-alias-interactive-bg-hover,#e9edf2);}
        .drw-artifact-item.active,.drw-artifact-outline-item.active{background:var(--dsw-alias-bg-layer-2,#e8eef7);border-color:var(--dsw-alias-border-l2,#c8d2de);}
        .drw-artifact-item strong{font-size:13px;font-weight:600;line-height:1.4;}
        .drw-artifact-item small,.drw-artifact-muted{font-size:11px;color:var(--dsw-alias-label-secondary,#77808e);line-height:1.5;}
        .drw-artifact-library-footer{padding:12px;border-top:1px solid var(--dsw-alias-border-l3,#e2e5e9);}
        .drw-artifact-library-footer button{padding:9px 11px;border:0;background:transparent;color:inherit;}
        .drw-artifact-main{display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden;}
        .drw-artifact-empty{display:flex;flex:1;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:15px;padding:32px;}
        .drw-artifact-empty h2{margin:0;font-weight:600;font-size:23px;}
        .drw-artifact-empty p{max-width:590px;line-height:1.8;color:var(--dsw-alias-label-secondary,#667085);margin:0;}
        .drw-artifact-empty-icon{display:grid;place-items:center;width:75px;height:75px;border:1px solid var(--dsw-alias-border-l3,#e0e4e8);border-radius:20px;}
        .drw-artifact-editor{display:flex;flex-direction:column;min-height:0;flex:1;}
        .drw-artifact-topbar{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;padding:23px 22px 17px;border-bottom:1px solid var(--dsw-alias-border-l3,#e1e5e9);}
        .drw-artifact-title-group{flex:1;display:flex;flex-direction:column;gap:6px;min-width:230px;}
        .drw-artifact-title{font-family:inherit!important;font-size:20px;font-weight:600;line-height:1.35;background:transparent;border:0;border-bottom:1px solid transparent;padding:6px 0;max-width:550px;color:inherit;}
        .drw-artifact-title:focus{outline:0;border-bottom-color:#3671c9;}
        .drw-artifact-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap;}
        .drw-artifact-actions button,.drw-artifact-actions a{display:inline-flex;align-items:center;text-decoration:none;padding:7px 11px;min-height:32px;border:1px solid var(--dsw-alias-border-l3,#d8dce2);border-radius:7px;background:transparent;color:inherit;font-size:12px;}
        .drw-artifact-actions button:hover,.drw-artifact-actions a:hover{background:var(--dsw-alias-interactive-bg-hover,#f1f3f5);}
        .drw-artifact-danger{color:#aa4141!important;}
        .drw-artifact-meta{display:flex;gap:14px;flex-wrap:wrap;padding:14px 22px;border-bottom:1px solid var(--dsw-alias-border-l3,#e0e5ea);}
        .drw-artifact-meta label{font-size:11px;color:var(--dsw-alias-label-secondary,#667085);display:flex;flex-direction:column;gap:5px;min-width:165px;flex:1;}
        .drw-artifact-meta input,.drw-artifact-meta select{font-size:12px;}
        .drw-artifact-body{display:flex;flex:1;min-height:0;min-width:0;overflow:hidden;}
        .drw-artifact-outline{display:flex;flex-direction:column;flex:0 0 215px;min-height:0;border-right:1px solid var(--dsw-alias-border-l3,#e1e5e9);background:var(--dsw-alias-bg-layer-1,#fafbfd);}
        .drw-artifact-outline-head{display:flex;justify-content:space-between;align-items:center;padding:17px 13px 10px;gap:8px;}
        .drw-artifact-outline-head button,.drw-artifact-small-actions button{border:1px solid var(--dsw-alias-border-l3,#ddd);border-radius:6px;background:transparent;min-height:27px;padding:2px 8px;}
        .drw-artifact-outline-items{overflow-y:auto;padding:0 8px 12px;flex:1;}
        .drw-artifact-outline-item{display:block;width:100%;text-align:left;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;border:1px solid transparent;border-radius:6px;background:transparent;padding:10px 9px;margin-bottom:3px;}
        .drw-artifact-fields{display:flex;flex-direction:column;flex:1;min-height:0;min-width:0;overflow:auto;}
        .drw-artifact-fields-header{display:flex;align-items:center;justify-content:space-between;padding:17px 19px;gap:8px;border-bottom:1px solid var(--dsw-alias-border-l3,#eee);}
        .drw-artifact-small-actions{display:flex;gap:5px;}
        .drw-artifact-fields-content{display:flex;flex:1;flex-direction:column;gap:15px;padding:20px;min-width:0;}
        .drw-artifact-fields-content label{font-size:12px;color:var(--dsw-alias-label-secondary,#666);display:flex;flex-direction:column;gap:7px;}
        .drw-artifact-area-label{flex:1;}
        .drw-artifact-fields textarea{display:block;flex:1;min-height:220px;width:100%;border:1px solid var(--dsw-alias-border-l3,#d7dce4);border-radius:8px;padding:15px;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#111);resize:vertical;font:13px/1.85 ui-monospace,Consolas,'Microsoft YaHei',monospace;}
        .drw-slide-preview-pane{flex:0 0 30%;min-width:270px;display:flex;flex-direction:column;gap:13px;border-left:1px solid var(--dsw-alias-border-l3,#e1e5e9);padding:18px 16px;overflow:auto;}
        .drw-slide-preview{width:100%;aspect-ratio:16/9;position:relative;background:#fff;color:#1b3559;border:1px solid #d8e2ee;box-shadow:0 4px 12px #0000000c;overflow:hidden;}
        .drw-slide-preview[data-theme=dark]{background:#10233d;color:#fff;}
        .drw-slide-preview[data-theme=ink]{color:#222;}
        .drw-slide-accent{position:absolute;top:0;bottom:0;left:0;width:1.2%;background:#3671c9;}
        .drw-slide-preview-inner{position:absolute;top:8%;bottom:7%;left:7%;right:7%;display:flex;flex-direction:column;overflow:hidden;}
        .drw-slide-preview-inner h3{font-size:clamp(11px,1vw,20px);line-height:1.3;margin:0 0 10px;overflow:hidden;}
        .drw-slide-preview-inner[data-layout=cover],.drw-slide-preview-inner[data-layout=closing]{justify-content:center;}
        .drw-slide-preview-inner[data-layout=cover] h3,.drw-slide-preview-inner[data-layout=closing] h3{font-size:clamp(14px,1.4vw,25px);}
        .drw-slide-preview-text{flex:1;overflow:hidden;font-size:clamp(8px,.7vw,14px);line-height:1.45;}
        .drw-slide-preview-text p{margin:0 0 6px;white-space:pre-wrap;}
        .drw-slide-preview-inner small{align-self:flex-end;margin-top:auto;color:#8191a8;font-size:9px;}
        .drw-slide-preview-columns{display:grid;grid-template-columns:1fr 1fr;gap:8px;flex:1;overflow:hidden;}
        .drw-slide-preview-columns p{padding:9px;background:#eff4fa;color:#1b3559;font-size:10px;white-space:pre-wrap;overflow:hidden;}
        @media(max-width:1440px){.drw-slide-preview-pane{display:none;}}
        @media(max-width:1080px){.drw-artifact-workspace{grid-template-columns:220px minmax(0,1fr);}.drw-artifact-outline{flex-basis:170px;}}
        @media(max-width:730px){.drw-artifact-workspace{grid-template-columns:1fr;overflow:auto;}.drw-artifact-library{max-height:210px;}.drw-artifact-body{min-height:480px;}.drw-artifact-outline{flex-basis:125px;}.drw-artifact-topbar{padding:12px;}.drw-artifact-meta{padding:12px;}.drw-artifact-fields-content{padding:12px;}}

        .drw-paper{display:flex;flex-direction:column;width:100%;height:100%;min-height:0;color:var(--dsw-alias-label-primary,#1e2227);background:var(--dsw-alias-bg-base,#fff);font-size:14px;line-height:1.5;font-family:inherit;}
        .drw-paper *{box-sizing:border-box;}
        .drw-paper button,.drw-paper input,.drw-paper textarea{font:inherit;}
        .drw-paper button{cursor:pointer;}
        .drw-paper button:disabled{cursor:not-allowed;opacity:.55;}
        .drw-paper-header{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:25px clamp(16px,3vw,40px) 16px;border-bottom:1px solid var(--dsw-alias-border-l3,#e7e7e7);flex:none;}
        .drw-paper-title{display:flex;align-items:center;gap:12px;min-width:0;}
        .drw-paper-title h1{font-size:20px;line-height:26px;margin:0;font-weight:600;}
        .drw-paper-title p{font-size:12px;color:var(--dsw-alias-label-secondary,#777);margin:3px 0 0;}
        .drw-paper-actions{display:flex;gap:8px;}
        .drw-paper-workspace{display:grid;grid-template-columns:215px minmax(0,1fr);flex:1;min-height:0;overflow:hidden;}
        .drw-paper-library{background:var(--dsw-alias-bg-layer-1,#fafafa);border-right:1px solid var(--dsw-alias-border-l3,#e4e4e4);overflow-y:auto;padding:18px 12px;min-width:0;}
        .drw-paper-group-title{display:flex;justify-content:space-between;gap:6px;font-size:13px;font-weight:600;color:var(--dsw-alias-label-secondary,#59606a);margin:0 4px 9px;}
        .drw-paper-group-title>span{font-weight:400;color:var(--dsw-alias-label-tertiary,#999);}
        .drw-paper-create{display:flex;gap:4px;margin:0 2px 12px;}
        .drw-paper-create input{width:0;min-width:0;flex:1;border:1px solid var(--dsw-alias-border-l3,#ddd);background:var(--dsw-alias-bg-base,#fff);border-radius:7px;padding:7px 8px;font-size:12px;}
        .drw-paper-create button{border-radius:7px;border:1px solid var(--dsw-alias-border-l3,#ccc);background:var(--dsw-alias-bg-base,#fff);padding:6px 9px;font-size:12px;white-space:nowrap;}
        .drw-paper-project-list{display:flex;flex-direction:column;gap:3px;}
        .drw-paper-project{display:flex;flex-direction:column;text-align:left;gap:1px;width:100%;border:0;border-radius:7px;background:transparent;padding:8px 10px;color:inherit;}
        .drw-paper-project:hover,.drw-paper-file:hover{background:var(--dsw-alias-interactive-bg-hover,#e9e9e9);}
        .drw-paper-project.is-active,.drw-paper-file.is-active{background:var(--dsw-alias-interactive-bg-active,#e2e5e9);}
        .drw-paper-project strong{font-weight:500;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;}
        .drw-paper-project small{font-size:10px;color:var(--dsw-alias-label-tertiary,#888);}
        .drw-paper-files{border-top:1px solid var(--dsw-alias-border-l3,#ddd);margin-top:14px;padding-top:14px;}
        .drw-paper-file-actions{display:flex;justify-content:space-between;margin:0 2px 8px;gap:5px;}
        .drw-paper-file-actions button,.drw-paper-project-actions button{background:none;border:0;color:var(--dsw-alias-label-secondary,#5a6471);font-size:12px;padding:5px 3px;}
        .drw-paper-file-list{display:flex;flex-direction:column;gap:3px;}
        .drw-paper-file{display:flex;align-items:center;gap:7px;text-align:left;width:100%;background:transparent;border:0;border-radius:6px;padding:8px 7px;color:inherit;font-size:12px;}
        .drw-paper-file span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .drw-file-ext{font-size:8px;font-weight:700;letter-spacing:.02em;min-width:26px;color:var(--dsw-alias-label-secondary,#666);background:var(--dsw-alias-bg-base,#fff);border:1px solid var(--dsw-alias-border-l3,#ddd);border-radius:3px;text-align:center;padding:2px;}
        .drw-paper-project-actions{display:flex;gap:18px;margin:20px 4px 0;}
        .drw-paper-main{display:flex;flex:1;min-width:0;min-height:0;overflow:hidden;}
        .drw-paper-editor-layout{display:grid;grid-template-columns:minmax(330px,1fr) minmax(290px,1fr);height:100%;width:100%;min-width:0;min-height:0;}
        .drw-paper-source,.drw-paper-preview{display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden;}
        .drw-paper-source{border-right:1px solid var(--dsw-alias-border-l3,#ddd);}
        .drw-paper-toolbar,.drw-paper-preview-header{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:12px 15px;border-bottom:1px solid var(--dsw-alias-border-l3,#eee);min-height:55px;}
        .drw-paper-file-heading{display:flex;align-items:center;gap:8px;min-width:0;font-size:13px;}
        .drw-paper-file-heading strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .drw-paper-muted,.drw-paper-dirty{font-size:11px;white-space:nowrap;color:var(--dsw-alias-label-tertiary,#999);}
        .drw-paper-dirty{color:#bd7030;}
        .drw-paper-buttons{display:flex;flex-wrap:wrap;align-items:center;gap:6px;}
        .drw-paper-button,.drw-paper-primary{display:inline-flex;align-items:center;justify-content:center;min-height:30px;gap:5px;text-decoration:none;font-size:12px;border-radius:7px;padding:5px 10px;white-space:nowrap;}
        .drw-paper-button{border:1px solid var(--dsw-alias-border-l3,#ddd);background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#333);}
        .drw-paper-primary{border:1px solid var(--dsw-alias-label-primary,#222);background:var(--dsw-alias-label-primary,#222);color:var(--dsw-alias-bg-base,#fff);}
        .drw-paper-code{flex:1;width:100%;min-height:180px;resize:none;overflow:auto;border:0;border-radius:0;outline:none;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#222);padding:17px 18px;font:13px/1.75 ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",monospace!important;white-space:pre;tab-size:2;}
        .drw-paper-code:focus-visible{outline:2px solid var(--dsw-focus-ring-color,#6185b4);outline-offset:-2px;}
        .drw-paper-compile-status{display:flex;flex-direction:column;gap:3px;padding:9px 15px;border-bottom:1px solid var(--dsw-alias-border-l3,#ddd);font-size:12px;flex:none;}
        .drw-paper-compile-status strong{font-weight:600;}
        .drw-paper-compile-status span{color:var(--dsw-alias-label-secondary,#666);line-height:1.5;}
        .drw-paper-compile-status[data-status=failed],.drw-paper-compile-status[data-status=interrupted]{border-left:3px solid #b65040;}
        .drw-paper-compile-status[data-status=running]{border-left:3px solid #3671c9;}
        .drw-paper-log-panel{display:flex;flex-direction:column;min-height:100px;max-height:38%;flex:none;overflow:hidden;}
        .drw-paper-history{display:flex;align-items:center;gap:8px;flex:none;padding:7px 14px;font-size:11px;}
        .drw-paper-history select{max-width:100%;min-width:0;flex:1;font:inherit;padding:4px;border:1px solid var(--dsw-alias-border-l3,#ddd);border-radius:4px;background:var(--dsw-alias-bg-base,#fff);color:inherit;}
        .drw-paper-log-panel .drw-paper-log{flex:1;max-height:none;min-height:60px;}
        .drw-paper-editor-layout.has-compile-log .drw-paper-source{overflow-y:auto;}
        .drw-paper-editor-layout.has-compile-log .drw-paper-code{min-height:140px;}
        .drw-paper-bottom{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 14px;border-top:1px solid var(--dsw-alias-border-l3,#ddd);font-size:11px;color:var(--dsw-alias-label-secondary,#777);}
        .drw-paper-bottom>span{overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}
        .drw-paper-link{background:transparent;border:0;color:inherit;text-decoration:underline;white-space:nowrap;font-size:11px;}
        .drw-paper-log{max-height:150px;overflow:auto;padding:10px 14px;font:11px/1.45 Consolas,monospace;white-space:pre-wrap;margin:0;border-top:1px solid var(--dsw-alias-border-l3,#ddd);background:var(--dsw-alias-bg-layer-1,#fafafa);}
        .drw-paper-preview-header{font-size:13px;}
        .drw-paper-preview-header>a{color:var(--dsw-alias-label-secondary,#555);font-size:12px;}
        .drw-paper-pdf{border:0;width:100%;height:100%;flex:1;min-height:0;background:#f3f4f5;}
        .drw-paper-preview-empty,.drw-paper-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:12px;padding:24px;color:var(--dsw-alias-label-secondary,#777);}
        .drw-paper-preview-empty strong,.drw-paper-empty h2{font-size:15px;color:var(--dsw-alias-label-primary,#333);margin:0;}
        .drw-paper-preview-empty p,.drw-paper-empty p{font-size:12px;line-height:1.8;margin:0;max-width:300px;}
        .drw-paper-preview-empty a{font-size:12px;color:var(--dsw-alias-label-primary,#333);text-decoration:underline;}
        .drw-paper-error{padding:10px 24px;border-bottom:1px solid #dbaaa0;background:#fff0eb;color:#a13f30;line-height:1.5;font-size:13px;}
        @media(max-width:1150px){.drw-paper-editor-layout{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(370px,1fr) minmax(300px,1fr);overflow:auto;}.drw-paper-source{border-right:0;border-bottom:1px solid var(--dsw-alias-border-l3,#ddd);}.drw-paper-preview{min-height:320px;}}
        @media(max-width:1150px){.drw-paper-editor-layout.has-compile-log{grid-template-rows:minmax(610px,1fr) minmax(320px,1fr);}}
        @media(max-width:700px){.drw-paper-workspace{grid-template-columns:1fr;overflow:auto;}.drw-paper-library{border-right:0;border-bottom:1px solid var(--dsw-alias-border-l3,#ddd);max-height:230px;}.drw-paper-main{min-height:510px;}.drw-paper-header{padding:16px;}}

        .drw-page { width:100%; height:100%; overflow-x:hidden; overflow-y:auto; box-sizing:border-box; color:var(--dsw-alias-label-primary,inherit); background:var(--dsw-alias-bg-base,transparent); font-family:inherit; font-size:14px; line-height:1.6; }
        .drw-page * {box-sizing:border-box;}
        .drw-content {width:min(100%,1040px); padding:28px clamp(24px,4vw,48px) 56px; margin:0 auto;}
        .drw-header {display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:18px; padding-top:var(--dsh-frame-top-clearance,0px); margin-bottom:32px;}
        .drw-header-heading {display:flex; gap:16px; align-items:center; min-width:0;}
        .drw-heading-icon {width:46px; height:46px; border-radius:12px; flex:none; display:grid; place-items:center; color:var(--dsw-alias-label-primary,inherit); border:1px solid var(--dsw-alias-border-l3,#e2e2e2); background:var(--dsw-alias-bg-layer-1,#f6f7f8);}
        .drw-header h1 {margin:0; font-size:22px; line-height:30px; font-weight:600; letter-spacing:-.02em;}
        .drw-subtitle {margin:4px 0 0; font-size:13px; color:var(--dsw-alias-label-secondary,#6d727a);}
        .drw-return {display:inline-flex; align-items:center; justify-content:center; gap:8px; font:inherit; font-size:13px; color:var(--dsw-alias-label-primary,inherit); background:var(--dsw-alias-bg-layer-1,#f5f5f5); border:1px solid var(--dsw-alias-border-l3,#e0e0e0); border-radius:8px; padding:7px 12px; min-height:34px; cursor:pointer;}
        .drw-return:hover {background:var(--dsw-alias-interactive-bg-hover,#ebebeb);}
        .drw-intro {display:flex; gap:14px; padding:20px 22px; border-radius:12px; background:var(--dsw-alias-bg-layer-1,#f8f8f8); border:1px solid var(--dsw-alias-border-l3,#ebebeb); margin-bottom:32px;}
        .drw-intro-icon {width:30px; height:30px; border:1px solid var(--dsw-alias-border-l2,#d6d6d6); border-radius:50%; flex:none; display:grid; place-items:center; margin-top:2px;}
        .drw-intro strong {font-size:14px; font-weight:600;}
        .drw-intro p {margin:5px 0 0; color:var(--dsw-alias-label-secondary,#727780); font-size:13px; line-height:1.75;}
        .drw-section {margin:0 0 32px;}
        .drw-section-heading {display:flex; justify-content:space-between; align-items:baseline; gap:12px; margin:0 0 14px;}
        .drw-section h2 {margin:0; font-size:16px; line-height:25px; font-weight:600;}
        .drw-muted {font-size:12px; color:var(--dsw-alias-label-tertiary,#8b9098);}
        .drw-feature-grid {display:grid; gap:12px; grid-template-columns:repeat(3,minmax(0,1fr));}
        .drw-feature {min-height:134px; padding:19px 17px; border:1px solid var(--dsw-alias-border-l3,#e4e4e4); background:var(--dsw-alias-bg-base,#fff); border-radius:12px;}
        .drw-feature-heading {display:flex; align-items:flex-start; justify-content:space-between; gap:8px;}
        .drw-feature strong {font-size:14px; line-height:22px; font-weight:600;}
        .drw-feature-status {font-size:11px; white-space:nowrap; color:var(--dsw-alias-label-tertiary,#8a8a8a); background:var(--dsw-alias-bg-layer-1,#f8f8f8); padding:2px 7px; border-radius:20px;}
        .drw-feature p {margin:12px 0 0; line-height:1.7; font-size:13px; color:var(--dsw-alias-label-secondary,#707781);}
        .drw-nav-grid {display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px;}
        .drw-nav-card {appearance:none; min-height:54px; width:100%; display:flex; gap:12px; align-items:center; padding:12px 15px; border-radius:10px; border:1px solid var(--dsw-alias-border-l3,#e5e5e5); background:var(--dsw-alias-bg-base,#fff); color:var(--dsw-alias-label-primary,inherit); font:inherit; text-align:left; cursor:pointer;}
        .drw-nav-card span {flex:1; font-weight:500;}
        .drw-nav-card:hover:not(:disabled) {background:var(--dsw-alias-interactive-bg-hover,#f3f4f5); border-color:var(--dsw-alias-border-l2,#d0d0d0);}
        .drw-nav-card:disabled {cursor:default; color:var(--dsw-alias-label-secondary,#777); background:var(--dsw-alias-bg-layer-1,#f6f6f6);}
        .drw-nav-card:disabled svg:last-child {opacity:0;}
        .drw-return:focus-visible,.drw-nav-card:focus-visible {outline:2px solid var(--dsw-focus-ring-color,#4c75cb); outline-offset:2px;}
        .drw-footer-note {font-size:12px; color:var(--dsw-alias-label-tertiary,#8a8a8a); margin:25px 0 0;}
        @media (max-width:740px) { .drw-content{padding:22px 20px 40px;} .drw-feature-grid{grid-template-columns:1fr;} .drw-nav-grid{grid-template-columns:1fr;} .drw-header{margin-bottom:24px;} }
        /* CCF deadline calendar: same native surface language as the artifact studios. */
        .drw-ccf-page{display:flex;flex-direction:column;min-height:0;height:100%;width:100%;overflow:auto;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#161a22);font-size:13px;}
        .drw-ccf-page *{box-sizing:border-box;}
        .drw-ccf-header{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;padding:26px 26px 18px;}
        .drw-ccf-eyebrow{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary,#8a93a0);margin-bottom:7px;}
        .drw-ccf-header h1{margin:0;font-size:22px;font-weight:600;line-height:1.3;}
        .drw-ccf-header p{margin:8px 0 0;font-size:12.5px;line-height:1.7;color:var(--dsw-alias-label-secondary,#68768a);max-width:620px;}
        .drw-ccf-actions{display:flex;gap:8px;flex-wrap:wrap;}
        .drw-ccf-actions button{font:inherit;font-size:12px;padding:8px 13px;min-height:33px;border-radius:7px;border:1px solid var(--dsw-alias-border-l3,#d7dce4);background:var(--dsw-alias-bg-base,#fff);color:inherit;cursor:pointer;}
        .drw-ccf-actions button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,#f1f3f5);}
        .drw-ccf-actions button:disabled{opacity:.55;cursor:progress;}
        .drw-ccf-actions button:first-child{border-color:#1e2736;background:#1e2736;color:#fff;font-weight:600;}
        .drw-ccf-actions button:first-child:hover:not(:disabled){background:#2b3648;}
        .drw-ccf-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:0 26px 18px;}
        .drw-ccf-stats>div{display:flex;flex-direction:column;gap:3px;padding:13px 15px;border:1px solid var(--dsw-alias-border-l3,#e1e5ea);border-radius:10px;background:var(--dsw-alias-bg-layer-1,#f8f9fb);}
        .drw-ccf-stats strong{font-size:20px;font-weight:600;line-height:1.2;font-variant-numeric:tabular-nums;}
        .drw-ccf-stats span{font-size:11px;color:var(--dsw-alias-label-secondary,#68768a);}
        .drw-ccf-filter{display:grid;grid-template-columns:minmax(180px,1.6fr) repeat(3,minmax(130px,1fr)) auto;gap:10px;align-items:end;padding:0 26px 16px;}
        .drw-ccf-filter label{display:flex;flex-direction:column;gap:5px;font-size:11px;color:var(--dsw-alias-label-secondary,#68768a);min-width:0;}
        .drw-ccf-filter input,.drw-ccf-filter select{width:100%;min-width:0;padding:8px 10px;font:inherit;font-size:12.5px;background:var(--dsw-alias-bg-base,#fff);color:inherit;border:1px solid var(--dsw-alias-border-l3,#d7dce4);border-radius:7px;}
        .drw-ccf-filter input:focus-visible,.drw-ccf-filter select:focus-visible{outline:2px solid var(--dsw-focus-ring-color,#4c75cb);outline-offset:1px;}
        .drw-ccf-filter .drw-ccf-favorite-toggle{flex-direction:row;align-items:center;gap:7px;padding-bottom:9px;font-size:12px;color:var(--dsw-alias-label-primary,inherit);white-space:nowrap;}
        .drw-ccf-favorite-toggle input{width:15px;height:15px;padding:0;accent-color:#1e2736;}
        .drw-ccf-databar{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;padding:11px 26px;border-top:1px solid var(--dsw-alias-border-l3,#e6eaee);border-bottom:1px solid var(--dsw-alias-border-l3,#e6eaee);font-size:11.5px;color:var(--dsw-alias-label-secondary,#68768a);background:var(--dsw-alias-bg-layer-1,#fafbfc);}
        .drw-ccf-databar a{color:var(--dsw-alias-label-link,#2f6fd0);text-decoration:none;}
        .drw-ccf-databar a:hover{text-decoration:underline;}
        .drw-ccf-warning{margin:14px 26px 0;padding:11px 14px;border:1px solid #e8cf9a;border-radius:8px;background:#fdf6e7;color:#7a5a12;font-size:12px;line-height:1.65;}
        .drw-ccf-list{display:flex;flex-direction:column;gap:8px;padding:16px 26px 8px;}
        .drw-ccf-row{display:grid;grid-template-columns:34px minmax(0,1fr) 148px 108px;gap:14px;align-items:center;padding:13px 15px;border:1px solid var(--dsw-alias-border-l3,#e5e9ee);border-radius:10px;background:var(--dsw-alias-bg-base,#fff);}
        .drw-ccf-row:hover{border-color:var(--dsw-alias-border-l2,#cfd8e2);background:var(--dsw-alias-bg-layer-1,#fbfcfd);}
        .drw-ccf-star{width:30px;height:30px;display:grid;place-items:center;padding:0;font-size:15px;line-height:1;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--dsw-alias-label-tertiary,#b3bcc7);cursor:pointer;}
        .drw-ccf-star:hover{background:var(--dsw-alias-interactive-bg-hover,#eef1f5);color:#c08a1e;}
        .drw-ccf-star.active{color:#d99a12;}
        .drw-ccf-main{min-width:0;display:flex;flex-direction:column;gap:4px;}
        .drw-ccf-name{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
        .drw-ccf-name strong{font-size:14px;font-weight:600;letter-spacing:.01em;}
        .drw-ccf-rank{font-size:10px;font-weight:600;letter-spacing:.04em;padding:2px 7px;border-radius:20px;border:1px solid var(--dsw-alias-border-l3,#dde2e8);color:var(--dsw-alias-label-secondary,#5d6a7a);background:var(--dsw-alias-bg-layer-2,#eef1f5);white-space:nowrap;}
        .drw-ccf-main p{margin:0;font-size:12px;line-height:1.55;color:var(--dsw-alias-label-secondary,#68768a);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}
        .drw-ccf-subline{font-size:11px;color:var(--dsw-alias-label-tertiary,#8a93a0);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .drw-ccf-deadline{display:flex;flex-direction:column;gap:3px;text-align:right;}
        .drw-ccf-deadline strong{font-size:13px;font-weight:600;font-variant-numeric:tabular-nums;}
        .drw-ccf-deadline span{font-size:11.5px;font-weight:500;color:var(--dsw-alias-label-secondary,#5d6a7a);}
        .drw-ccf-deadline small{font-size:9.5px;line-height:1.4;color:var(--dsw-alias-label-tertiary,#9aa3ae);}
        .drw-ccf-links{text-align:right;font-size:11.5px;}
        .drw-ccf-links a{color:var(--dsw-alias-label-link,#2f6fd0);text-decoration:none;white-space:nowrap;}
        .drw-ccf-links a:hover{text-decoration:underline;}
        .drw-ccf-links span{color:var(--dsw-alias-label-tertiary,#9aa3ae);}
        .drw-ccf-empty{padding:44px 20px;text-align:center;font-size:12.5px;line-height:1.8;color:var(--dsw-alias-label-secondary,#68768a);}
        .drw-ccf-footnote{display:flex;flex-direction:column;gap:5px;margin-top:auto;padding:16px 26px 26px;font-size:11px;line-height:1.7;color:var(--dsw-alias-label-tertiary,#8a93a0);}
        .drw-ccf-footnote:before{content:"";display:block;height:1px;margin-bottom:9px;background:var(--dsw-alias-border-l3,#e6eaee);}
        @media (max-width:900px){ .drw-ccf-stats{grid-template-columns:repeat(2,minmax(0,1fr));} .drw-ccf-filter{grid-template-columns:1fr 1fr;} .drw-ccf-row{grid-template-columns:34px minmax(0,1fr);} .drw-ccf-deadline{grid-column:2;text-align:left;} .drw-ccf-links{grid-column:2;text-align:left;} }
        @media (max-width:740px){ .drw-ccf-header,.drw-ccf-stats,.drw-ccf-filter,.drw-ccf-databar,.drw-ccf-list,.drw-ccf-footnote{padding-left:18px;padding-right:18px;} .drw-ccf-filter{grid-template-columns:1fr;} .drw-ccf-warning{margin-left:18px;margin-right:18px;} }
      `;

      const UPDATE_CSS = `
        .drw-updates{width:100%;min-width:0;padding:24px 0;border-top:1px solid var(--dsw-alias-border-l3,#ddd);font:14px/1.65 system-ui,sans-serif;color:var(--dsw-alias-label-primary,#202733)}
        .drw-updates *{box-sizing:border-box}.drw-updates h3,.drw-updates p{margin:0 0 10px}.drw-update-heading{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}.drw-update-heading h3{font-size:16px}
        .drw-updates button,.drw-update-reminder button{font:inherit;color:inherit;padding:7px 13px;min-height:36px;border:1px solid var(--dsw-alias-border-l3,#d7dce2);background:var(--dsw-alias-bg-layer-1,#fff);border-radius:8px;cursor:pointer;white-space:normal}.drw-updates button:disabled,.drw-update-reminder button:disabled{opacity:.55;cursor:wait}
        .drw-updates .drw-update-primary{color:#fff;background:#202733;border-color:#202733}.drw-updates button:focus-visible,.drw-update-reminder button:focus-visible,.drw-updates a:focus-visible{outline:2px solid #526de5;outline-offset:3px}
        .drw-update-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.drw-update-muted{color:var(--dsw-alias-label-secondary,#697586)}.drw-update-error{color:var(--dsw-alias-state-error-primary,#b42318);overflow-wrap:anywhere}
        .drw-update-confirm{padding:16px;margin:16px 0;border:1px solid var(--dsw-alias-border-l3,#d7dce2);border-radius:10px;background:var(--dsw-alias-bg-layer-2,#f6f7f9)}.drw-update-confirm p{margin-top:8px}
        .drw-updates pre{max-height:280px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.65 ui-monospace,Consolas,monospace;padding:16px;background:var(--dsw-alias-bg-layer-2,#f6f7f9);border-radius:8px}.drw-updates a{color:#526de5}
        .drw-update-preference{display:flex;gap:8px;align-items:flex-start;margin:16px 0 8px}.drw-update-preference input{margin-top:6px;flex-shrink:0}
        .drw-update-reminder{position:fixed;right:24px;bottom:24px;z-index:100;max-width:min(480px,calc(100vw - 32px));max-height:80vh;overflow:auto;padding:18px 22px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#202733);border:1px solid var(--dsw-alias-border-l3,#d7dce2);border-radius:12px;box-shadow:0 8px 32px #0002;font:14px/1.6 system-ui,sans-serif}
        .drw-update-progress{max-width:min(480px,calc(100vw - 32px));padding:24px;border:1px solid var(--dsw-alias-border-l3,#d7dce2);border-radius:12px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#202733);font:14px/1.65 system-ui,sans-serif}.drw-update-progress::backdrop{background:#0005}
      `;
      const inject = ['slots', 'layout', 'remote', 'remote.settings', 'sessions'];

      function apply(ctx) {
        nativeOfficeClient?.apply(ctx);
        const fileRuntime = fileClient.createRuntime(ctx);
        ctx.effect(() => {
          void updateRequest();
          const timer = setInterval(() => { void updateRequest(); }, 5000);
          const close = () => { void fetch('/api/research-workbench/updates', { method: 'POST', credentials: 'same-origin', keepalive: true, headers: { 'content-type': 'application/json', 'x-research-workbench-updates': '1' }, body: JSON.stringify({ action: 'client-close', client: updateClient() }) }).catch(() => {}); };
          window.addEventListener('pagehide', close);
          return () => { clearInterval(timer); window.removeEventListener('pagehide', close); updateGuards.clear(); };
        });
        ctx.slots.inject('plugins.detail.section', () => ctx.slots.register({ name: 'plugins.detail.section', id: 'research-workbench-updates', order: 1000 }, UpdateFooter));
        ctx.slots.inject('shell.overlay', () => ctx.slots.register({ name: 'shell.overlay', id: 'research-workbench-update-reminder', order: 1000 }, UpdateReminder));
        // Theme-compatible styles, fully removed when this plugin is unloaded.
        ctx.effect(() => {
          const style = document.createElement('style');
          style.setAttribute('data-dsh-research-workbench', 'true');
          style.textContent = CSS + UPDATE_CSS + fileClient.css;
          document.head.appendChild(style);
          return () => { style.remove(); };
        }, 'research-workbench: styles');

        // DSH's root-scoped `main` is keyed; do not replace `conversation`.
        ctx.slots.inject('main', function* registerMainPanels() {
          for (const panel of PANELS) {
            const filePanel = ['proposal', 'slides', 'ip'].includes(panel.kind);
            const conversationKey = panel.id + '.file-conversation';
            yield ctx.slots.register({
              name: 'main',
              key: panel.id,
              ...(filePanel ? { children: { [conversationKey]: { kind: 'single', scope: 'session' } } } : {}),
              inject: () => ({
                panel,
                ...(filePanel ? { runtime: fileRuntime, conversationKey, useUpdateGuard } : {}),
                onReturnChat: () => { ctx.layout.selectPanel(null); },
                onOpenPanel: (id) => { ctx.layout.selectPanel(id); },
              }),
            }, panel.id === 'research-papers' ? PaperPage : panel.id === 'research-ccf' ? DeadlinePage : fileClient.FileWorkspace);
            if (filePanel) ctx.slots.inject(conversationKey, () => ctx.slots.register({ name: conversationKey, inject: () => ({ useUpdateGuard }) }, fileClient.BoundConversation));
          }
        });

        // Side navigation owns the clickable row. This plugin only supplies
        // the entry metadata + icon and respects built-in panel ordering.
        ctx.slots.inject('sidebar.panellist', function* registerSidebarEntries() {
          for (const panel of PANELS) {
            yield ctx.slots.register({
              name: 'sidebar.panellist',
              id: panel.id,
              label: panel.title,
              order: panel.order,
            }, function ResearchSidebarIcon(props) {
              return h(PanelIcon, { icon: panel.icon, size: props.size });
            });
          }
        });
      }

      return { inject, apply };
    },
  });
})();
