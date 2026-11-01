/*
 * DSH Research Workbench v0.2.0 — native sidebar + keyed-main-panel MVP.
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

      const PANELS = Object.freeze([
        {
          id: 'research-papers',
          order: 20,
          title: '论文管理',
          icon: 'book',
          subtitle: '本地 LaTeX 论文项目、编辑和 PDF 编译',
          description: '已提供本地论文项目、TeX/Bib 编辑、文件导入和 Tectonic 编译；文献检索与 Agent 写作将在后续版本连接。',
          capabilities: [
            ['论文项目', '按项目组织论文源码、模板和图表'],
            ['文献与引用', '检索阅读文献，整理 BibTeX 参考文献'],
            ['LaTeX 工作流', '源码编辑、PDF 编译与错误诊断'],
          ],
        },
        {
          id: 'research-slides',
          order: 30,
          title: 'PPT 工作台',
          icon: 'presentation',
          subtitle: '围绕科研汇报、项目答辩与组会制作演示文稿',
          description: '已接入 DSH 原生主页面；可编辑幻灯片生成、模板与导出将在后续版本连接。',
          capabilities: [
            ['演示项目', '统一管理组会、答辩和汇报材料'],
            ['模板与页面', '复用布局、主题与已整理的科研图表'],
            ['PPTX 交付', '生成与导出可继续编辑的演示文稿'],
          ],
        },
        {
          id: 'research-experiments',
          order: 40,
          title: '科研实验',
          icon: 'flask',
          subtitle: '关联实验设计、运行过程、指标和验证证据',
          description: '已接入 DSH 原生主页面；实验执行、指标记录和可复现图表将在后续版本连接。',
          capabilities: [
            ['实验计划', '记录数据集、基线、指标和随机种子'],
            ['运行与日志', '整理实验任务、环境与执行输出'],
            ['结果与绘图', '对比实验结果并形成论文图表'],
          ],
        },
        {
          id: 'research-projects',
          order: 50,
          title: '项目进度',
          icon: 'checklist',
          subtitle: '围绕研究目标、阶段成果与待办任务持续推进',
          description: '已接入 DSH 原生主页面；任务看板、里程碑和 Agent 协作将在后续版本连接。',
          capabilities: [
            ['研究任务', '把科研目标拆解成可验证的任务'],
            ['里程碑', '追踪论文、实验和项目阶段性成果'],
            ['Agent 协同', '将任务和 DSH 原生会话关联'],
          ],
        },
      ]);

      const SHAPES = Object.freeze({
        book: [
          'M4 19.5A2.5 2.5 0 0 1 6.5 17H20',
          'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z',
        ],
        presentation: [
          'M2 3h20v14H2z',
          'M8 21l4-4 4 4',
          'M12 17v4',
        ],
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

      function CapabilityCard(props) {
        return h('article', { className: 'drw-feature', key: props.title },
          h('div', { className: 'drw-feature-heading' },
            h('strong', null, props.title),
            h('span', { className: 'drw-feature-status' }, '规划中')
          ),
          h('p', null, props.description)
        );
      }

      function ResearchPanel(props) {
        const panel = props.panel;
        return h('section', { className: 'drw-page', 'aria-label': panel.title, 'data-research-panel': panel.id },
          h('div', { className: 'drw-content' },
            h('header', { className: 'drw-header' },
              h('div', { className: 'drw-header-heading' },
                h('span', { className: 'drw-heading-icon' }, h(Icon, { name: panel.icon, size: 22 })),
                h('div', null,
                  h('h1', null, panel.title),
                  h('p', { className: 'drw-subtitle' }, panel.subtitle)
                )
              ),
              h('button', { type: 'button', className: 'drw-return', onClick: props.onReturnChat },
                h(Icon, { name: 'arrowleft', size: 15 }),
                h('span', null, '返回聊天')
              )
            ),
            h('div', { className: 'drw-intro' },
              h('span', { className: 'drw-intro-icon' }, h(Icon, { name: 'check', size: 18 })),
              h('div', null,
                h('strong', null, 'DSH 原生页面已就绪'),
                h('p', null, panel.description)
              )
            ),
            h('section', { className: 'drw-section', 'aria-label': '模块规划' },
              h('div', { className: 'drw-section-heading' },
                h('h2', null, '模块规划'),
                h('span', { className: 'drw-muted' }, 'v0.2.0 · 论文功能已开放')
              ),
              h('div', { className: 'drw-feature-grid' },
                panel.capabilities.map(([title, description]) =>
                  h(CapabilityCard, { key: title, title, description })
                )
              )
            ),
            h('section', { className: 'drw-section', 'aria-label': '工作台快捷导航' },
              h('div', { className: 'drw-section-heading' }, h('h2', null, '快速切换工作台')),
              h('div', { className: 'drw-nav-grid' },
                PANELS.map((entry) =>
                  h('button', {
                    key: entry.id,
                    type: 'button',
                    className: 'drw-nav-card' + (panel.id === entry.id ? ' drw-nav-current' : ''),
                    'aria-current': panel.id === entry.id ? 'page' : undefined,
                    disabled: panel.id === entry.id,
                    onClick: () => props.onOpenPanel(entry.id),
                  },
                    h(Icon, { name: entry.icon, size: 18 }),
                    h('span', null, entry.title),
                    h(Icon, { name: 'arrowright', size: 14 })
                  )
                )
              )
            ),
            h('p', { className: 'drw-footer-note' },
              '论文管理已支持本地文件与 Tectonic；其他三个模块仍处于页面框架阶段。'
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
        const state = React.useRef({});
        const savePending = React.useRef(null);
        const mounted = React.useRef(true);
        const selectionEpoch = React.useRef(0);
        const uploadRef = React.useRef(null);
        state.current = { selected, files, activeFile, editor, saved, sha };

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
            setCompileLog('');
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
              if (list.length > 0) await openProject(list[0].id);
            } catch (e) { if (mounted.current) setError(e.message); }
            finally { if (mounted.current) setLoading(false); }
          })();
          return () => {
            if (state.current.editor !== state.current.saved) void saveCurrent();
            mounted.current = false; ++selectionEpoch.current;
          };
        }, []);
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
          setCompiling(true); setError(''); setNotice('Tectonic 编译中…');
          try {
            const result = await paperRequest(paperEndpoint(id, '/compile'), { method:'POST', body:'{}' });
            if (mounted.current && state.current.selected?.id === id) {
              setHasPdf(true); setPdfRevision(Date.now()); setCompileLog(result.log || '编译成功'); setShowLog(false);
              setNotice('PDF 编译成功');
              await refreshFiles(id);
            }
          } catch(e) {
            if (mounted.current) {
              setError(e.message);
              setCompileLog(e.log || e.message);
              setShowLog(true);
              if (e.code === 'ENGINE_MISSING') setEngine({ available:false,version:null });
            }
          } finally { if (mounted.current) setCompiling(false); }
        }
        const dirty = editor !== saved;
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
              ) : h('div',{className:'drw-paper-editor-layout'},
                h('div',{className:'drw-paper-source'},
                  h('div',{className:'drw-paper-toolbar'},
                    h('div',{className:'drw-paper-file-heading'},
                      h('strong',null,activeFile||'源文件'),
                      h('span',{className:dirty?'drw-paper-dirty':'drw-paper-muted'},dirty?'● 未保存':notice||'已保存')
                    ),
                    h('div',{className:'drw-paper-buttons'},
                      activeFile && h('a',{className:'drw-paper-button',href:PAPER_API+paperEndpoint(selected.id,'/download?path='+encodeURIComponent(activeFile)),download:true,title:'下载磁盘上已保存的文件版本'},'下载源码'),
                      h('button',{type:'button',className:'drw-paper-button',disabled:!dirty||busy,onClick:()=>void saveCurrent()},'保存'),
                      h('button',{type:'button',className:'drw-paper-primary',disabled:compiling||busy,onClick:compileCurrent},compiling?'正在编译…':'编译 PDF')
                    )
                  ),
                  h('textarea',{className:'drw-paper-code',value:editor,spellCheck:false,'aria-label':'LaTeX 源码编辑器',
                    onChange:e=>{state.current.editor=e.target.value;setEditor(e.target.value);},
                    disabled:!activeFile,placeholder:'打开或新建 tex 文件后开始编辑…'}),
                  h('div',{className:'drw-paper-bottom'},
                    h('span',null,engine?.available ? `Tectonic: ${engine.version||'已安装'}` : '未检测到 Tectonic（需要本机安装才能编译）'),
                    h('button',{type:'button',className:'drw-paper-link',onClick:()=>setShowLog(v=>!v)},showLog?'关闭日志':'查看编译日志')
                  ),
                  showLog && h('pre',{className:'drw-paper-log'},compileLog||'暂无编译日志')
                ),
                h('div',{className:'drw-paper-preview'},
                  h('div',{className:'drw-paper-preview-header'},
                    h('strong',null,'PDF 预览',dirty&&hasPdf?'（上次编译）':''),
                    hasPdf && h('div',{className:'drw-paper-buttons'},
                      h('a',{href:pdfUrl,download:'main.pdf'},'下载 PDF'),
                      h('a',{href:pdfUrl,target:'_blank',rel:'noopener noreferrer'},'新窗口打开')
                    )
                  ),
                  hasPdf ? h('iframe',{title:'论文 PDF 预览',src:pdfUrl,className:'drw-paper-pdf'})
                    : h('div',{className:'drw-paper-preview-empty'},
                        h(Icon,{name:'book',size:30}),
                        h('strong',null,'还没有编译结果'),
                        h('p',null,'保存 LaTeX 源码后点击「编译 PDF」，成功后在此预览。'),
                        !engine?.available && h('a',{href:'https://github.com/tectonic-typesetting/tectonic/releases/tag/tectonic%400.17.0',target:'_blank',rel:'noopener noreferrer'},'获取 Tectonic 0.17.0')
                      )
                )
              )
            )
          )
        );
      }

      const CSS = `
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
      `;

      const inject = ['slots', 'layout'];

      function apply(ctx) {
        // Theme-compatible styles, fully removed when this plugin is unloaded.
        ctx.effect(() => {
          const style = document.createElement('style');
          style.setAttribute('data-dsh-research-workbench', 'true');
          style.textContent = CSS;
          document.head.appendChild(style);
          return () => { style.remove(); };
        }, 'research-workbench: styles');

        // DSH's root-scoped `main` is keyed; do not replace `conversation`.
        ctx.slots.inject('main', function* registerMainPanels() {
          for (const panel of PANELS) {
            yield ctx.slots.register({
              name: 'main',
              key: panel.id,
              inject: () => ({
                panel,
                onReturnChat: () => { ctx.layout.selectPanel(null); },
                onOpenPanel: (id) => { ctx.layout.selectPanel(id); },
              }),
            }, panel.id === 'research-papers' ? PaperPage : ResearchPanel);
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
