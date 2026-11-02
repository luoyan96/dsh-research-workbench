# DSH Research Workbench · 科研成果工作台

将 **项目书、PPT、论文、专利与软著、CCF 截稿日历** 五个原生工作台直接加入 DeepSeek Harness（DSH）左侧导航。插件采用 Cordis + Slots，使用 DSH 现有会话和工作区，不 Fork DSH、不替换品牌和主聊天界面。

**v0.3.3** 在 Office 导入（`.docx` / `.pptx`，保留原件与受限的原版式文字修改）之上，新增 CCF 投稿截止日历。已通过离线测试与 Office 文件解析/渲染验证；**Windows DSH 实机验收仍需要使用者运行本版测试**。

## v0.3.3：CCF 投稿截止日历

- 左侧栏增加「CCF 截稿」入口；在简体中文与英文版 DSH 中，通过有限范围的 CSS 将重复的原生「更多」按钮隐藏，原「插件」管理功能仍在「插件」页。若 DSH 更换 DOM 或语言，该隐藏可能不再生效，但日历入口仍可使用。
- 会议信息来自 [Conference Partner](https://github.com/sundou82/conference-partner-mcp) 每日更新的 CCF 目录：展示 A/B/C 级别、未来 30/90/365 天、研究方向、搜索和本地收藏；服务器保存缓存供离线阅读。
- 该汇总仅包含**日期**，不包含可验证的最终时刻或 AoE 时区；必须在投稿前核对官方 CFP。过期日期默认隐藏，未公布则显示待公布，绝不自行推算。
- DSH Host API: `/research-workbench/deadlines`，复用现有 DSH Session 身份验证，不需要 API Key。

## v0.3.2：直接导入 Word 与 PowerPoint

- **项目书、专利软著**：导入 Word `.docx`（最大 12 MiB）；自动识别章节、标题及段落文字。旧版 `.doc` 请先在 Word 另存为 `.docx`。
- **PPT**：导入 PowerPoint `.pptx`（最大 12 MiB），按幻灯片原始顺序提取标题、文本框和正文。旧版 `.ppt` 请先转换成 `.pptx`。
- **原件保留**：原始文件单独保存在项目数据目录，可在工作台点击“原件下载”。未经修改时导出完全一致的原始文件字节；仅修改已有文本且原结构未变时，优先在原 OOXML 中修改文字，以保留原图片、图表、版式和其它对象。
- **限制**：编辑器仍是结构化文本编辑，而非完整所见即所得 Office 编辑器。新增/删除章节、增删幻灯片、修改段落数量/布局，或无法安全映射的文本修改，导出为简化格式（原件不被覆盖）。对于排版敏感的正式材料，应在 Word / PowerPoint 中核对并完成最后调整。
- Markdown / TXT 导入仍保留。**PDF、旧式二进制 `.doc/.ppt`、扫描件 OCR 暂不支持直接导入**。

## 已完成的功能

| 左侧入口 | 可操作能力 | 文件 / 交付 |
|---|---|---|
| **项目书** | 新建、导入 DOCX / Markdown、按章节编辑、自动保存、版本冲突保护、排序、增删章节、归档、**项目书 → PPT 草稿** | Word `.docx` / `.md` |
| **PPT 工作台** | 导入 PPTX、科研答辩、组会、方案等模板；添加/删除/重排幻灯片、4 种布局、3 种配色、逐页预览、自动保存 | **可编辑** `.pptx` / `.md` |
| **论文管理** | 多 LaTeX 项目、`.tex/.bib` 及图片导入、编辑、Tectonic 编译、PDF 预览与下载、归档 | `.tex` / `.bib` / `.pdf` |
| **专利与软著** | 发明专利技术交底书和软件著作权材料模板、章节编辑、导入 Markdown、自动保存及归档 | Word `.docx` / `.md` |
| **CCF 截稿** | A/B/C 分级、研究方向、30/90/365 天窗口、会议搜索、本地收藏、数据源时间与离线缓存 | 只读日历（无文件导出） |

插件会自动把文档保存在 `~/.dsh/research-workbench/`（Windows：`C:\Users\用户名\.dsh\research-workbench\`）。更新或卸载插件不会自动删除你已有的论文项目和成果文件；v0.2.0 的论文文件继续留在原路径。

### 项目书与知识产权

- 项目书模板：**科研项目申报书**、**技术项目可行性研究报告**、**中试平台建设方案**、**通用项目书**。
- 知识产权模板：**发明专利技术交底书**、**软件著作权申请材料**。
- 支持章节自由新增、删除、上下移动、正文修改、Markdown/TXT 文本导入和 Word 导出。
- Word 中的标题和正文是原生段落，可继续编辑；保存时使用版本检查。历史版本备份在对应项目 `history/` 下。
- **重要**：模板仅辅助撰写。专利权利要求、软著提交格式、权属证明和其他正式申报要求，仍需由经办人按主管部门最新规则核查；此插件不会自动提交官方申请。

### PPT

- 可选“科研项目答辩”“论文组会报告”“项目方案汇报”“空白演示文稿”等模板。
- 每页支持**封面、标题正文、双栏、结束页**，并支持蓝白、黑白、深蓝主题。
- 导出为标准 PowerPoint OOXML `.pptx`，文字和形状均为**原生可编辑对象**，不是整页截图。
- Markdown/TXT 可以导入为演示文稿；项目书可以一键转换成 PPT 草稿（过长内容会提示后续精简）。
- 当前编辑器定位为**结构化 PPT 草稿工作台**：尚未提供 PowerPoint 级拖拽排版、图片裁剪、动画、图表编辑或现有 PPTX 无损导入。需要复杂科研图时，可以导出后在 PowerPoint 继续编辑。

### 论文与 LaTeX

论文模块保留 v0.2.0 的本地文件管理和 Tectonic 编译器调用。Tectonic 不是插件自带的：需要已安装并在 `PATH` 中，或设置 `DSH_RWB_TECTONIC_PATH`，或将官方 Windows 程序放在 `C:\Tools\Tectonic\tectonic.exe`。编译本地陌生 TeX 文件有风险，请只运行受信任来源。

## DSH Agent 工具

当宿主 Profile 具备 `ctx.tools` 时，插件**尝试自动注册**七个科研工具，便于 Agent 在原生聊天中列出、创建、读取、修改章节、追加章节、生成项目书对应 PPT，以及按乐观版本规则修改论文源码：

- `research_artifact_list`
- `research_artifact_create`
- `research_artifact_read`
- `research_artifact_edit`
- `research_artifact_append`
- `research_paper_write`
- `research_proposal_to_slides`

这些工具仍走 DSH 的原有工具权限及生命周期，不创建独立 AI Agent。真实 DSH 中工具注册及模型可见性还需要实机验证，切勿将自动测试等同于端到端安全审计。

## 安装

### 直接安装 GitHub main（v0.3.3 已推送）

```powershell
dsh plugin --profile web add "github:luoyan96/dsh-research-workbench#main"
dsh web
```

Windows Desktop 使用的是 `desktop` Profile，请把 `--profile web` 换成 `--profile desktop`。

如果之前装过旧版，请先**退出 DSH**，再执行：

```powershell
dsh plugin --profile web remove dsh-research-workbench
dsh plugin --profile web add "github:luoyan96/dsh-research-workbench#main"
```

再次启动 DSH，Windows Desktop 建议完全退出并重开。如果浏览器界面未更新，可按 `Ctrl+Shift+R`。

### 从 `.tgz` 安装（不依赖 GitHub 或 npm 首发）

```powershell
dsh plugin --profile web remove dsh-research-workbench
dsh plugin --profile web add "$env:USERPROFILE\Downloads\dsh-research-workbench-0.3.3.tgz"
```

### npm 正式发布后

```powershell
dsh plugin --profile web add dsh-research-workbench@latest
```

注意 `npm pack` 仅创建安装包，不会把包发布到 npm Registry。目前仓库保留 `.github/workflows/publish.yml`，首次发布需由 npm 包所有者完成身份认证和 Trusted Publisher 配置，详见 [RELEASING.md](RELEASING.md)。

## 使用流程与验收

1. **项目书**：新建“科研项目申报书”，改一节内容，点击保存并导出 `.docx`；点击“转换成 PPT”，在 PPT 工作台查找生成的草稿。
2. **PPT**：从“科研答辩”模板创建，修改页面正文、新增/删除/重排页面，选择蓝白主题，下载 `.pptx` 并确认 PowerPoint 中可编辑文字。
3. **论文**：创建 LaTeX 项目，编辑 `main.tex` 并保存，确认 Tectonic 后编译 PDF。
4. **专利与软著**：分别新建“发明专利技术交底书”和“软件著作权申请材料”，填写一节，导出 `.docx`。
5. **CCF 截稿**：进入左侧「CCF 截稿」，切换 A/B/C 与研究方向，确认日期与天数合理；点“更新日期”后数据时间变化；断网时应显示离线缓存提示而不是伪装成新数据；收藏后重启 DSH 仍然保留。
6. 关闭并重启 DSH，确认数据仍在。跨窗口编辑同一文档时应提示版本冲突，不应静默覆盖。
7. 在 DSH 聊天中检查 `research_artifact_list` 等 Agent 工具是否可见，确认工具调用遵循当前权限控制。

## 技术与安全边界

- Host：`src/index.js` + `src/papers.js` + `src/workbench/`，浏览器：`src/client.js`；预构建文件位于 `lib/`。
- 使用 `sidebar.panellist` 与 `main` keyed slots，保留原有 DSH Session/Workspace。
- 本地 Web API：`/research-workbench/api`（论文）、`/research-workbench/content`（项目书/PPT/知识产权）及 `/research-workbench/deadlines`（CCF 日历，只读 GET）。仅允许本机 loopback，所有读写请求都必须经过 DSH Connection 有效浏览器会话认证，拒绝显式跨站 Origin；Windows Desktop 认证代理剥离 Origin 后的请求同样受认证保护。所有文件写入限制在插件数据目录。
- CCF 数据来自第三方公开快照，插件只读取外部 JSON（12 秒超时、3 MB 上限、6 小时缓存），不向会议官网发起请求，也不上传任何本地内容；缓存写入插件数据目录，断网时回退到上一次快照并明确标注“离线缓存”。
- Office 文件导出使用纯 Node.js Open XML 生成器，无外部运行时依赖、无 Word/PowerPoint 安装要求。DOCX/PPTX 在 Word/PowerPoint 中仍需完成最终人工校对。
- 不生成或执行 Office 宏；Patent/Softcopyright 不提供自动官方提交；不自动联网下载陌生代码或执行实验。
- 主测试 `npm run check`；测试使用 Node 自带 test runner，不需要 API Key。本地验证包括 Office 可被 LibreOffice 打开并正常导出 PDF。

## 开发与许可

```bash
npm ci --ignore-scripts
npm run check
npm pack
```

源码未拷贝 Mimir 的代码；仅参考其科研插件的功能组织方式。该仓库在所有者选择并发布许可之前，继续沿用既有的 `UNLICENSED` 标识。

## v0.3.1 Windows Desktop 认证兼容修复

- 修复 Windows DSH Desktop 在创建论文、项目书、PPT 和专利软著材料时可能返回 HTTP 403（“只允许在本机 DSH 界面中访问科研资料”）。
- Desktop 的 `dsh-app://app` 代理先验证来源，再剥离 `Origin` 并附带 DSH 已签发的认证 Cookie。插件不再把缺失 `Origin` 当作必然非法。
- 两条数据 API 均要求 `ctx.connection.requestRejection(req)` 通过 DSH 官方鉴权；无认证 Cookie、显式跨站 Origin、跨站 Fetch Metadata、非本机请求仍被拒绝。
- 保留本地成果目录与文件格式，升级不迁移或删除已有成果。

升级 Windows Desktop 时建议先退出应用，或在插件管理界面卸载旧版本后再安装 `v0.3.1`。
