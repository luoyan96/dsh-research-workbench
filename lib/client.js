/*
 * DSH Research Workbench v0.1.0 — native sidebar + keyed-main-panel MVP.
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
          subtitle: '将论文源码、文献资料与写作过程集中管理',
          description: '已接入 DSH 原生主页面；文献库、LaTeX 编辑与编译服务将在后续版本连接。',
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
            h('span', { className: 'drw-feature-status' }, '下一阶段')
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
                h('span', { className: 'drw-muted' }, 'v0.1.0 · 第一阶段')
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
              '此版本仅提供原生导航与页面框架；不会创建或更改论文、PPT、实验文件及 DSH 工作区。'
            )
          )
        );
      }

      const CSS = `
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
            }, ResearchPanel);
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
