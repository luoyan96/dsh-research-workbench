import * as React from 'react';
import { IconUpload, IconFileText, IconPresentation, IconArrowUp, IconArrowLeft, IconChevronLeft, IconChevronRight, IconRefresh, IconDownload, IconExternalLink, IconHistory, IconPaperclip, IconX } from '@tabler/icons-react';
import css from './file-client.css';
export { css };

const API = '/research-workbench/files';
const ACCEPT = { proposal: '.docx,.dotx', slides: '.pptx,.potx', ip: '.docx,.dotx' };
const TYPES = { proposal: 'DOCX、DOTX', slides: 'PPTX、POTX', ip: 'DOCX、DOTX' };
const STORE = 'research-workbench.files.v1.';
function stored(key, fallback = '') { try { return localStorage.getItem(STORE + key) || fallback; } catch { return fallback; } }
function remember(key, value) { try { if (value) localStorage.setItem(STORE + key, value); else localStorage.removeItem(STORE + key); } catch { /* Persistence may be disabled by browser policy; Host files and sessions still persist. */ } }
async function request(route, options = {}) {
  const response = await fetch(API + route, { credentials: 'same-origin', ...options, headers: { ...(options.body ? { 'content-type': 'application/json' } : {}), 'x-research-workbench-files': '1', ...options.headers } });
  let data;
  try { data = await response.json(); } catch { throw Error(`文件服务不可用（HTTP ${response.status}）`); }
  if (!response.ok || !data?.ok) throw Error(data?.error || '文件操作失败');
  return data;
}
const post = (route, data = {}) => request(route, { method: 'POST', body: JSON.stringify(data) });
const fileRoute = item => '/' + encodeURIComponent(item.id);
const readableDate = value => value ? new Date(value).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

/** Only public DSH Session references and its Conversation Factory cross into the file page. */
export function createRuntime(ctx) {
  const pending = new Map();
  return {
    async ensureSession(item) {
      if (item.sessionId) return item;
      let created = pending.get(item.id);
      if (!created) { created = ctx.sessions.create({ cwd: item.directory }); pending.set(item.id, created); created.catch(() => { pending.delete(item.id); }); }
      const sessionId = await created;
      const result = await post(fileRoute(item) + '/session', { sessionId, revision: item.revision });
      pending.delete(item.id); return result.item;
    },
    async retain(item, signal) {
      const reference = ctx.sessions.retain(item.sessionId, { source: 'research-workbench-file', signal });
      try { await reference.ready; return reference; }
      catch (error) { reference.release(); throw error; }
    },
    seed(reference, draft) {
      if (!draft.trim()) return;
      const scope = ctx.sessions.scope(reference.sessionId), conversation = scope.get('conversation');
      const input = conversation.input.for(scope);
      if (input.draftSnapshot.text.trim()) return;
      input.actions.setDraft(draft); input.actions.persistDraft();
    },
  };
}

export function BoundConversation(props) {
  const session = props.useSession(value => value);
  const input = props.useInput(value => value);
  props.useUpdateGuard('file-session-' + props.sessionId, !!(typeof input?.draft === 'string' ? input.draft : input?.draft?.text), !!session?.running);
  return <div className="drw-file-native-chat">{props.renderFactorySlot('conversation.content', { variant: 'embedded', phase: 'active', hero: false })}</div>;
}

export function FileWorkspace(props) {
  const { panel, runtime, SessionProvider } = props;
  const [items, setItems] = React.useState([]), [selected, setSelected] = React.useState(null);
  const [draft, setDraft] = React.useState(() => stored(panel.kind + '.draft'));
  const [busy, setBusy] = React.useState(false), [error, setError] = React.useState(''), [notice, setNotice] = React.useState('');
  const [reference, setReference] = React.useState(null), [chatError, setChatError] = React.useState('');
  const [chatAttempt, setChatAttempt] = React.useState(0);
  const [history, setHistory] = React.useState(false), [zoom, setZoom] = React.useState(90), [loading, setLoading] = React.useState(true), [drag, setDrag] = React.useState(false);
  const uploadRef = React.useRef(null), mounted = React.useRef(true), generation = React.useRef(0), draftRef = React.useRef(draft), selectedRef = React.useRef(null), autoRevision = React.useRef('');
  draftRef.current = draft; selectedRef.current = selected;
  props.useUpdateGuard('file-page-' + panel.kind, !selected && !!draft.trim(), busy);
  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current++; }; }, []);
  React.useEffect(() => { remember(panel.kind + '.draft', draft); }, [panel.kind, draft]);
  function update(item) {
    if (!mounted.current) return;
    setSelected(current => current?.id === item.id ? item : current);
    setItems(current => [item, ...current.filter(value => value.id !== item.id)].sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)));
  }
  async function show(item) {
    const operation = ++generation.current;
    setError(''); setNotice(''); setHistory(false); setSelected(item); setBusy(true);
    setChatAttempt(value => value + 1);
    remember(panel.kind + '.selected', item.id);
    try {
      const bound = await runtime.ensureSession(item);
      if (!mounted.current || generation.current !== operation) return;
      update(bound);
      if (bound.preview.status === 'empty') await refresh(bound, 1);
    } catch (failure) { if (mounted.current && generation.current === operation) setError(failure.message); }
    finally { if (mounted.current && generation.current === operation) setBusy(false); }
  }
  React.useEffect(() => {
    let active = true;
    request('?kind=' + panel.kind).then(data => {
      if (!active) return;
      setItems(data.items); setLoading(false);
      const id = stored(panel.kind + '.selected'), item = data.items.find(value => value.id === id);
      if (item) void show(item);
    }).catch(failure => { if (active) { setError(failure.message); setLoading(false); } });
    return () => { active = false; };
  }, [panel.kind]);
  React.useEffect(() => {
    setReference(null); setChatError('');
    if (!selected?.sessionId) return;
    const controller = new AbortController(); let held;
    runtime.retain(selected, controller.signal).then(value => {
      if (controller.signal.aborted) { value.release(); return; }
      held = value;
      runtime.seed(value, draftRef.current);
      setDraft(''); remember(panel.kind + '.draft', ''); setReference(value);
    }).catch(failure => { if (!controller.signal.aborted) setChatError(failure.message); });
    return () => { controller.abort(); held?.release(); };
  }, [selected?.id, selected?.sessionId, chatAttempt]);
  React.useEffect(() => {
    if (!selected?.id) return;
    let active = true, timer;
    const poll = async () => {
      try {
        const data = await request('/' + selected.id);
        if (active) {
          update(data.item);
          const saved = data.item.events.filter(event => event.type === 'saved').at(-1)?.at;
          const key = saved ? data.item.id + saved : '';
          if (key && key !== autoRevision.current && data.item.preview.status !== 'running') {
            autoRevision.current = key; await refresh(data.item, data.item.preview.page || 1);
          }
        }
      } catch (failure) { if (active) setError(failure.message); }
      if (active) timer = setTimeout(poll, 2000);
    };
    timer = setTimeout(poll, 1200);
    return () => { active = false; clearTimeout(timer); };
  }, [selected?.id]);
  async function upload(file) {
    if (!file || busy) return;
    const extension = '.' + file.name.split('.').at(-1).toLowerCase();
    if (!ACCEPT[panel.kind].split(',').includes(extension)) { setError('请上传 ' + TYPES[panel.kind] + '；旧版文件请先在 WPS 中另存为新版格式'); return; }
    if (file.size > 80 * 1024 * 1024) { setError('单个文件不能超过 80 MiB'); return; }
    const operation = ++generation.current; setBusy(true); setError(''); setNotice('正在上传并保留原件…');
    try {
      const data = await request('/upload?kind=' + panel.kind + '&name=' + encodeURIComponent(file.name), { method: 'POST', body: file, headers: { 'content-type': 'application/octet-stream' } });
      if (mounted.current && operation === generation.current) { setNotice(''); await show(data.item); }
    } catch (failure) { if (mounted.current && operation === generation.current) setError(failure.message); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function refresh(item = selectedRef.current, page = item?.preview.page || 1) {
    if (!item) return;
    try { const data = await post(fileRoute(item) + '/preview', { page }); update(data.item); }
    catch (failure) { if (mounted.current) setError(failure.message); }
  }
  async function action(name) {
    const item = selectedRef.current; if (!item || busy) return;
    setBusy(true); setError('');
    try {
      const data = await post(fileRoute(item) + '/' + name); update(data.item);
      if (name === 'save') {
        const response = await fetch(API + fileRoute(item) + '/download', { credentials: 'same-origin' });
        if (!response.ok) throw Error('下载失败，请重试');
        const url = URL.createObjectURL(await response.blob()), anchor = document.createElement('a');
        anchor.href = url; anchor.download = item.name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
        setNotice('工作副本已保存并开始下载');
      }
    } catch (failure) { if (mounted.current) setError(failure.message); }
    finally { if (mounted.current) setBusy(false); }
  }
  function home() { generation.current++; remember(panel.kind + '.selected', ''); setSelected(null); setReference(null); setError(''); setNotice(''); }
  function dropped(event) {
    event.preventDefault(); setDrag(false);
    if (event.dataTransfer.files.length !== 1) { setError('每次先选择一份要修改的文件'); return; }
    void upload(event.dataTransfer.files[0]);
  }
  const FileIcon = panel.kind === 'slides' ? IconPresentation : IconFileText;
  const preview = selected?.preview;
  return <section className="drw-file-workspace" aria-label={panel.title + '文件工作区'}>
    <input ref={uploadRef} type="file" accept={ACCEPT[panel.kind]} hidden aria-label="上传文件或模板" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void upload(file); }} />
    <header className="drw-file-page-header"><h1>{panel.title}</h1><div>{selected ? <button type="button" onClick={home} disabled={busy}><IconArrowLeft size={17} />返回文件</button> : null}<button type="button" onClick={props.onReturnChat}>返回聊天</button></div></header>
    {error ? <div role="alert" className="drw-file-banner is-error">{error}<button type="button" aria-label="关闭错误提示" onClick={() => setError('')}><IconX size={17} /></button></div> : null}
    {notice ? <div role="status" className="drw-file-banner">{notice}</div> : null}
    {selected?.readOnly ? <div role="alert" className="drw-file-banner is-error"><span>工作副本只读或被其他 Office / WPS 窗口占用。关闭占用窗口后刷新预览，或下载副本重新上传。</span><a href={API + fileRoute(selected) + '/download'} download={selected.name}>下载已保存副本</a></div> : null}
    {!selected ? <main className="drw-file-entry">
      <h2>从你的文件开始</h2><p className="drw-file-intro">上传现有{panel.kind === 'slides' ? 'PPT' : '文档'}或模板，告诉 AI 你想怎么修改。</p>
      <button type="button" className={'drw-file-drop' + (drag ? ' is-dragging' : '')} disabled={busy} onClick={() => uploadRef.current?.click()} onDragOver={event => { event.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={dropped}>
        <IconUpload size={35} stroke={1.6} /><strong>{busy ? '正在上传…' : '上传文件或模板'}</strong><span>支持 {TYPES[panel.kind]} · 最大 80 MiB</span><small>点击选择，或将文件拖到这里</small>
      </button>
      <div className="drw-file-entry-composer"><textarea aria-label="描述文件修改要求" maxLength={12000} placeholder={panel.kind === 'slides' ? '例如：把汇报压缩到 10 页，保留原来的主题和图表…' : '例如：补充研究方案，保留原来的表格和格式…'} value={draft} onChange={event => setDraft(event.target.value)} />
        <div><button type="button" className="drw-file-icon-button" aria-label="添加本地文件" disabled={busy} onClick={() => uploadRef.current?.click()}><IconPaperclip size={22} /></button><span>DSH 对话</span><span className="drw-file-composer-suite">Office / WPS</span><button className="drw-file-send" type="button" disabled aria-label="请先上传文件"><IconArrowUp size={22} /></button></div>
      </div><p className="drw-file-preserved">上传后编辑工作副本，原始文件和模板保留。</p>
      <section className="drw-file-recent" aria-label="最近使用"><h3>最近使用</h3>{loading ? <p className="drw-file-muted">正在读取本地文件…</p> : !items.length ? <p className="drw-file-muted">上传第一份文件后，可以在这里继续修改。</p> : items.slice(0, 8).map(item => <button type="button" key={item.id} disabled={busy} onClick={() => void show(item)}><FileIcon size={24} /><strong>{item.name}</strong><span>工作副本 · {readableDate(item.updatedAt)}</span><IconChevronRight size={17} /></button>)}</section>
    </main> : <main className="drw-file-working">
      <div className="drw-file-toolbar"><div className="drw-file-identity"><FileIcon size={30} /><div><strong>{selected.name}</strong><span title={selected.path}>工作副本 · {selected.path}</span></div></div><div className="drw-file-actions"><button type="button" onClick={() => uploadRef.current?.click()} disabled={busy}>上传另一份</button><button type="button" onClick={() => void action('open')} disabled={busy || !selected.officeAvailable}><IconExternalLink size={17} />在 WPS / Office 中打开</button><button className="drw-file-primary" type="button" onClick={() => void action('save')} disabled={busy || !selected.officeAvailable}><IconDownload size={17} />保存并下载</button></div></div>
      <div className="drw-file-columns"><section className="drw-file-preview" aria-label="文档预览">
        <div className="drw-file-preview-canvas">{preview?.revision > 0 ? <img key={selected.id} src={API + fileRoute(selected) + '/image?v=' + preview.revision} alt={selected.name + '第' + preview.page + '页预览'} style={{ width: zoom + '%' }} /> : <div className="drw-file-preview-empty"><FileIcon size={42} stroke={1.4} /><strong>{preview?.status === 'running' ? '正在生成页面预览…' : '还没有页面预览'}</strong><p>{preview?.error || '预览使用本机 Office / WPS 的实际排版。'}</p>{preview?.status !== 'running' ? <button type="button" onClick={() => void refresh()}>生成预览</button> : null}</div>}</div>
        {preview?.error && preview.revision > 0 ? <p role="alert" className="drw-file-preview-error">{preview.error}</p> : null}
        <footer><button type="button" onClick={() => void refresh()} disabled={preview?.status === 'running'}><IconRefresh size={17} />{preview?.status === 'running' ? '预览生成中…' : '刷新预览'}</button><div><button type="button" aria-label="上一页" disabled={(preview?.page || 1) <= 1 || preview?.status === 'running'} onClick={() => void refresh(selected, preview.page - 1)}><IconChevronLeft size={17} /></button><span>第 {preview?.page || 1}{preview?.total ? ' / ' + preview.total : ''} 页</span><button type="button" aria-label="下一页" disabled={preview?.status === 'running' || !!preview?.total && preview.page >= preview.total} onClick={() => void refresh(selected, (preview?.page || 1) + 1)}><IconChevronRight size={17} /></button></div><select aria-label="预览缩放" value={zoom} onChange={event => setZoom(Number(event.target.value))}><option value={70}>70%</option><option value={90}>90%</option><option value={100}>100%</option></select></footer>
      </section><section className="drw-file-conversation" aria-label="与 AI 一起修改" inert={busy ? '' : undefined} aria-busy={busy || undefined}><header><h2>与 AI 一起修改</h2><p>本次修改：{selected.name}</p></header>
        {chatError ? <div role="alert" className="drw-file-chat-empty"><p>无法打开修改会话：{chatError}</p><button type="button" onClick={() => void show(selected)}>重试会话</button></div> : reference && SessionProvider ? <SessionProvider session={reference}>{props.renderSlot(props.conversationKey, {})}</SessionProvider> : <div className="drw-file-chat-empty"><p>{error ? '文件已经保存；修复上述问题后可继续。' : '正在连接 DSH 修改会话…'}</p>{error ? <button type="button" onClick={() => void show(selected)}>重试连接</button> : null}</div>}
      </section></div>
      <div className="drw-file-status"><span>{selected.events.filter(event => ['saved', 'edited', 'uploaded'].includes(event.type)).at(-1)?.message}</span><button type="button" aria-expanded={history} onClick={() => setHistory(value => !value)}><IconHistory size={16} />文件记录</button><a href={API + fileRoute(selected) + '/original'} download={selected.originalName}>下载上传原件</a></div>
      {history ? <section className="drw-file-history" aria-label="文件记录"><header><strong>文件记录</strong><button type="button" aria-label="关闭文件记录" onClick={() => setHistory(false)}><IconX size={17} /></button></header>{[...selected.events].reverse().map((event, index) => <p key={index} className={event.type === 'error' ? 'is-error' : ''}><time>{readableDate(event.at)}</time>{event.message}</p>)}</section> : null}
    </main>}
  </section>;
}
