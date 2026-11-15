# DSH Research Workbench · 科研成果工作台

将 **项目书、PPT、论文、文献、专利与软著、CCF 截稿、科研竞赛和 SSH 服务器** 直接加入 DeepSeek Harness（DSH）左侧导航。插件采用 Cordis + Slots，使用 DSH 现有会话和工作区，不 Fork DSH、不替换品牌和主聊天界面。

**v0.4.0** 将项目书、PPT、专利与软著改为「上传自己的文件或模板 → 实际页面预览 + AI 对话 → 保存下载」，内置 WPS / Office 协作、插件独立更新，并修复论文切换页面后编译状态和日志丢失。原件保留，AI 修改工作副本；模板库和实验室共享文件暂不提供。要求 DSH 0.2.1-rc.3 或兼容新版；本地 Office 文件流程需要 Windows 与可用的 WPS / Office。

## v0.5.0：文献、科研竞赛与 SSH 服务器（2026-11-15）

- **文献**：参考 Mimir 的文献工作流，支持 arXiv 关键词/标题/作者/编号查询、相关性/提交日期/更新日期排序和分页；每页 20 条，搜索结果缓存 24 小时，API 请求间隔至少 3.1 秒。收藏按 arXiv 基础编号去重，保留收藏时的版本和真实元数据，重启后可恢复；可筛选、取消收藏。
- **PDF 阅读**：点击阅读后由宿主后台下载，切换页面不会取消；在内置 PDF.js 阅读器逐页阅读、缩放、复制提取文字或下载 PDF。首次需联网，已缓存 PDF 可离线打开，单篇上限 50 MiB，同时最多下载两篇。宿主退出会中止尚未完成的下载，回来可重试。只获取已搜索文献对应的 arXiv PDF，不代理任意网址。
- **BibTeX**：单篇、本页多选、全部收藏导出 UTF-8 `references.bib`。条目使用真实 arXiv 编号、版本、作者、年份和来源；DOI 仅在源站提供时输出，不推断期刊。当前不含跨站联合搜索、订阅、Zotero 同步或 AI 论文评分。
- 模型可使用 `research_literature_search/library/bibtex` 搜索、收藏和读取引用；无需新增 API Key。UI 与模型共用本地文献库，目录为数据根目录的 `literature/library.json` 和 `literature/pdf/`。PDF 资源随插件打包，不从 CDN 加载阅读器代码。

- **科研竞赛**：从 ML Contests 的公开 JSON 读取国际 AI、数据科学及会议挑战赛，区分报名截止与作品提交截止；可按平台、方向、关联学术会议、未来 30/90/365 天筛选、搜索与本机收藏。显示源文件提交时间和本机获取时间；只有日期的记录不生成精确时刻，异常日期显示待核对。源站失败时明确显示上次缓存，不把缓存当作新数据。此版不接入已停止更新的其他聚合源，也不宣称覆盖所有学科竞赛。
- **服务器**：参考 Mimir 的 Servers 工作流，管理 Linux/POSIX SSH 主机、端口、用户名、远程工作目录和认证方式（SSH Agent、本机私钥、SSH 密码）。首次连接只读取主机指纹；用户向管理员核对并确认后才发送认证信息，指纹变化时拒绝认证。支持 GPU 型号、利用率与显存探测；没有 NVIDIA GPU 不等于 SSH 连接失败。
- 密码/私钥口令只在本机保护保存；Windows 使用当前用户 DPAPI，其他系统使用本机 0600 密钥的 AES-GCM。服务器列表和模型工具不返回保存的密码或私钥内容，模型不能添加凭据或信任主机。修改连接时，密码和口令输入留空保留原值；变更认证方式会清除不再使用的秘密。
- **远程任务**：页面可提交命令，也注册 `research_server_list/check/submit_job/list_jobs/read_log` 供 AI 使用；模型提交命令必须经过原生 DSH approval，缺少 approval 通道会拒绝执行。页面中的提交按钮直接执行用户填写的命令。任务运行权限等于 SSH 账户权限，不提供新的操作系统沙箱。
- 命令在已保存的远程工作目录运行；返回任务 ID 后由宿主后台跟踪。任务状态、退出码、stdout/stderr 落盘；页面切换后可恢复。默认最多跟踪 30 分钟，可选 1～1440 分钟；日志捕获上限 4 MiB，页面展示尾部。只有实际退出码 0 才报告完成。
- 超时、断网、退出宿主、停止本机跟踪均不保证远端进程停止；结果标为未确认，避免自动重复提交。服务不会杀掉未验证的远端 PID。用户需要结束训练时应通过明确的服务器命令或作业调度器核对和停止。另一个存活宿主的任务不会在恢复时误标中断。
- SSH 命令运行期间阻止插件更新。此功能是服务器管理与远程作业，不是通用交互式终端、SFTP 文件管理或完整 `ssh://` 工作区；本机 Office/WPS 文件页继续处理本机工作副本。

主数据目录新增 `ssh/servers.json`（受保护凭据）、`ssh/jobs/<ID>/job.json` 与日志，以及 `competitions-cache.json`。API 为 `/research-workbench/servers` 和 `/research-workbench/competitions`；沿用 DSH 本机认证、Origin 边界，SSH 写入另要求意图请求头。没有替换或导入用户现有 SSH 配置。

## v0.4.0：内置 WPS / Office 协作

完整纳入 [@copylee/dsh-office 1.2.0](https://github.com/copylee711/dsh-office) 的源码、Windows helper、设置页、提示指引、测试及文档。保留原作者 Copy 的 MIT 许可与署名，36 个上游文件逐字节固定；来源及适配说明见 [NOTICE.md](NOTICE.md)。v0.4.0 也包含编译持久化和插件独立更新修复；v0.3.3 及更旧版本没有这些能力。

安装此分支的打包产物后，「科研工作台」和「原生 Office」作为同一 bundle 的两个组件加载，无需另装独立 Office 插件。Windows 上支持在本机 Word / Excel / PowerPoint 或 WPS 文字 / 表格 / 演示中打开、新建、读取、编辑、渲染、保存和关闭自己创建的文档；公式、脚注、模板、图表等能力沿用上游实现。项目书、PPT、专利与软著三个入口已改为下面的本地文件流程；论文和 CCF 界面沿用原有功能。

「设置 → Office / WPS」选择办公套件、静默模式、逐字写入、迷你卡片、视觉检查及图片宽度。设置保存在 `research-native-office`，与独立插件的设置分开；已有独立插件可以共存，融合组件不覆盖其工具或配置。

插件更新会等待 Office 命令以及回合结束后的后台保存/关闭完成；同时有多个办公 Agent 时，全部结束后才统一收尾。后台收尾也会等待文件页面中的预览/保存事务完成，避免中途关闭它正在使用的文档。

融合后的八个工具为 `research_office_open/status/read/edit/help/render/save/close`。示例：

> 使用科研插件的 research_office 工具，在 WPS 中修改 D:\科研\项目书.docx，保留格式并另存为修改版。

原生 Office 文件与工作台里的结构化草稿分别保存。修改一个导出的 Word/PPT，不会自动回写工作台草稿；模型指引明确区分两条路径。LaTeX 论文仍沿用原来的编辑、编译和历史日志，不交给 Office 工具处理。

已验证：DSH 0.2.1-rc.3 隔离 profile 加载、双插件共存、设置写入、未认证状态接口返回 401；真实 WPS 三件套的合成文件创建/编辑/渲染/保存/关闭/重新打开。自动检查包括科研插件、融合适配与完整上游单元测试。在线模型的复杂任务质量和微软 Office 兼容矩阵仍需实际材料验收；隔离验证不会替换用户现用安装。

## v0.4.0：上传文件 → 预览与 AI 对话

项目书、PPT、专利与软著共用文件工作区。首页只保留「上传文件或模板」、需求输入框和最近文件；首版不做内置模板库或实验室共享文件入口。上传后左侧显示 Office/WPS 的实际页面渲染，右侧嵌入 DSH 原生 `conversation.content` Factory，沿用模型选择、工具授权、取消、附件和持久化会话；不是独立的仿聊天窗口。

- 项目书/专利软著接受 DOCX、DOTX；PPT 接受 PPTX、POTX，单个文件上限 80 MiB。DOC/PPT 等旧式格式请先在 WPS 中另存为新版格式。文件包校验保留宏/ActiveX、压缩项和解压规模检查。
- 上传原件保存在 `files/<ID>/original/`，编辑对象在 `files/<ID>/work/`，页面显示实际路径。普通文件初始副本与原件逐字节一致；DOTX/POTX 仅调整 OOXML 主内容类型，复制为 DOCX/PPTX，保留原版式、图片和其他部件。AI 不会把文件拆成固定章节表单。用户本机上传源文件不会被覆盖。
- 每份工作文件绑定独立 DSH 会话，工作目录设为其 `work/`。宿主把目标路径作为可重建的模型上下文提供给这个会话；`research_file_current` 只返回当前会话的工作副本。Office 工具必须使用明确路径，读取后修改并保存。
- 「在 WPS / Office 中打开」支持手动精细编辑；「保存并下载」先保存当前原生文档，再下载工作副本。「下载上传原件」随时可取回备份。
- 预览在宿主后台运行，页面切换不取消；成功/失败记录写入 `file.json`，已有预览在失败时保留。宿主意外退出留下的预览标为中断，可以手动刷新。文件绑定、保存记录和会话历史可在返回或重新加载后恢复；未提交的原生聊天草稿沿用 DSH 的本机保存机制。Office 保存后会自动刷新预览，也可手动刷新和翻页。
- 工作副本只读或被其他 Office 实例占用时显示实际状态；原地保存立即返回错误，不再等待隐藏的另存为对话框。可先关闭占用窗口后刷新，或下载已保存的副本重新上传。不会为了清理占用而杀掉用户的 Office 进程。

本地文件 API 为 `/research-workbench/files`，所有读写都要求已认证的本机 DSH 身份；写请求另需 `x-research-workbench-files: 1`。API 只接受已登记文件 ID，不接受任意本机路径。原先结构化草稿的文件和 API/工具保留，但不再作为这三个入口的默认编辑器。

隔离 Windows DSH/WPS 验收使用合成文件与不联网的本地模拟模型验证真实会话到工具、文件保存和预览的链路；不代表在线模型一定能正确理解复杂任务。复杂格式仍应使用真实模板核对，最终排版可在 WPS 中完成。

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
| **项目书** | 上传 DOCX/DOTX、原版式预览、原生 AI 对话、WPS 中继续编辑、保存下载 | Word `.docx` 与上传原件 |
| **PPT 工作台** | 上传 PPTX/POTX、原版式逐页预览、AI 修改实际文件、保存下载 | **可编辑** `.pptx` 与上传原件 |
| **论文管理** | 多 LaTeX 项目、`.tex/.bib` 及图片导入、编辑、Tectonic 编译、PDF 预览与下载、归档 | `.tex` / `.bib` / `.pdf` |
| **专利与软著** | 上传现有材料或自有 DOCX/DOTX 模板，AI 围绕实际文件修改 | Word `.docx` 与上传原件 |
| **CCF 截稿** | A/B/C 分级、研究方向、30/90/365 天窗口、会议搜索、本地收藏、数据源时间与离线缓存 | 只读日历（无文件导出） |

插件会自动把文档保存在 `~/.dsh/research-workbench/`（Windows：`C:\Users\用户名\.dsh\research-workbench\`）。更新或卸载插件不会自动删除你已有的论文项目和成果文件；v0.2.0 的论文文件继续留在原路径。

### 旧版结构化草稿

此前的章节/幻灯片草稿保留在 `content/`，旧版 API 和带 revision 检查的模型工具仍可读取与修改，数据不会自动搬迁或删除。它们与新上传的原生文件分别保存，不会自动同步。新界面不再强制套用内置的统一科研模板。

### 论文与 LaTeX

论文模块保留 v0.2.0 的本地文件管理和 Tectonic 编译器调用。Tectonic 不是插件自带的：需要已安装并在 `PATH` 中，或设置 `DSH_RWB_TECTONIC_PATH`，或将官方 Windows 程序放在 `C:\Tools\Tectonic\tectonic.exe`。编译本地陌生 TeX 文件有风险，请只运行受信任来源。

**v0.4.0 编译修复**：点击“编译 PDF”后立即建立宿主后台任务，页面显示实际运行时间、实时输出和停止按钮。切换面板、选择其他论文或刷新页面不会取消编译；返回时恢复所选论文的任务状态、日志和已有 PDF。成功、失败、超时和手动停止都保留编译记录，界面可选择最近 20 次记录；失败不覆盖上一次成功的 PDF，预览明确标为“上次成功编译”。

状态和每次记录保存在论文目录 `build/compile.json` 与 `build/compiles/<任务ID>.json`，保留受限长度的输出及 Tectonic `main.log` 尾部。默认编译上限从 120 秒调整为 10 分钟，为首次宏包下载留出时间；没有编造百分比或下载进度。**后台运行依赖 DSH 宿主进程**：关闭/重启 DSH 会停止编译，历史日志保留，进程意外退出后的未完成任务会显示“已中断”，不会自动声称成功或无提示重跑。

## DSH Agent 工具

当宿主 Profile 具备 `ctx.tools` 时，插件注册 `research_file_current` 来解析当前文件会话的目标，原生 Office 编辑使用前述八个 `research_office_*` 工具；同时保留七个旧版草稿/论文工具：

- `research_artifact_list`
- `research_artifact_create`
- `research_artifact_read`
- `research_artifact_edit`
- `research_artifact_append`
- `research_paper_write`
- `research_proposal_to_slides`

这些工具仍走 DSH 的原有工具权限及生命周期，不创建独立 AI Agent。已在隔离的真实 DSH 中用本地模拟模型验证注册、可见性和工具执行链路；在线模型的任务理解与修改质量仍需另外验收。

## 安装

### 安装固定版本 v0.5.0

```powershell
dsh plugin --profile web add "github:luoyan96/dsh-research-workbench#v0.5.0"
dsh web
```

Windows Desktop 使用的是 `desktop` Profile，请把 `--profile web` 换成 `--profile desktop`。

如果之前装过旧版，请先**退出 DSH**，再执行：

```powershell
dsh plugin --profile web remove dsh-research-workbench
dsh plugin --profile web add "github:luoyan96/dsh-research-workbench#v0.5.0"
```

再次启动 DSH，Windows Desktop 建议完全退出并重开。如果浏览器界面未更新，可按 `Ctrl+Shift+R`。

### 从 GitHub Release 的 `.tgz` 安装

在 [v0.5.0 Release](https://github.com/luoyan96/dsh-research-workbench/releases/tag/v0.5.0) 下载 `dsh-research-workbench-0.5.0.tgz`，退出 DSH 后安装：

```powershell
dsh plugin --profile web remove dsh-research-workbench
dsh plugin --profile web add "$env:USERPROFILE\Downloads\dsh-research-workbench-0.5.0.tgz"
```

### npm 正式发布后

```powershell
dsh plugin --profile web add dsh-research-workbench@latest
```

注意 `npm pack` 仅创建安装包，不会把包发布到 npm Registry。目前仓库保留 `.github/workflows/publish.yml`，首次发布需由 npm 包所有者完成身份认证和 Trusted Publisher 配置，详见 [RELEASING.md](RELEASING.md)。

## 使用流程与验收

1. **项目书**：上传现有 DOCX 或 DOTX，确认原版式预览；在右侧选择自己的模型，要求修改一处内容并保留表格。保存下载后在 WPS 中核对，上传原件应保持不变。
2. **PPT**：上传 PPTX 或 POTX，要求修改一页文字，翻页核对其他页面；保存下载后确认文字、图片仍是可编辑的 Office 对象。
3. **论文**：创建 LaTeX 项目，编辑 `main.tex` 并保存，确认 Tectonic 后编译 PDF。
4. **专利与软著**：上传自己的材料或模板，描述修改要求；切换页面再返回，确认同一份文件和原生聊天记录恢复。
5. **CCF 截稿**：进入左侧「CCF 截稿」，切换 A/B/C 与研究方向，确认日期与天数合理；点“更新日期”后数据时间变化；断网时应显示离线缓存提示而不是伪装成新数据；收藏后重启 DSH 仍然保留。
6. 关闭并重启 DSH，确认数据仍在；重新刷新预览，遇到只读/占用应有明确提示。
7. 在 DSH 聊天中检查 `research_file_current`、`research_office_*` 等工具和目标文件路径，确认工具调用遵循原生权限控制。

## 技术与安全边界

### v0.4.0：科研插件独立更新

原生「插件 → dsh-research-workbench」详情页增加「版本与更新」。默认每天检查本仓库的 GitHub 稳定 Release；有新版时显示提醒、版本对照和更新说明，可以选择明天提醒或忽略该版本。自动检查可以关闭；安装始终需要点击并确认，不会静默安装或强制重启。

确认后下载固定仓库的 tgz，核对 GitHub 提供的 SHA-256、大小、包名、版本及 bundle 入口，再交给 DSH 原生 `pluginManager` 安装。安装前保存旧插件包；失败时尝试恢复，并明确报告无法确认的恢复结果。更新期间阻止科研页面继续操作；存在未保存修改、编译或 Agent 任务时拒绝开始。需要重启时只提示手动重启。

检查记录、提醒选项和安装结果保存在当前 profile 的 `research-workbench-updates.json`，安装包与恢复包在 `research-workbench-update-cache/`。科研成果目录独立保存。更新接口是 Connection 认证的精确 POST 路由 `/api/research-workbench/updates`，不向模型开放安装工具。新包使用本地缓存路径登记为 profile 的依赖，该缓存应保留。

旧版 0.3.1 / 0.3.3 本身没有此更新入口，需先手动安装一次 v0.4.0 或更新版本。AcceptCat 启动时还需配套“只补装缺失或较旧插件”的修复，避免下一次启动把独立更新的版本降回安装包内置版。后续版本均使用新版本号和新的 Release，不覆盖旧版资产。

已在独立临时 profile 中用 AcceptCat 内置 DSH 0.2.1-rc.3 验证原生详情页、真实 GitHub 检查和 Connection 未认证 401；用标明合成版本号的旧包执行了真实 v0.3.3 下载、校验和原生安装。失败恢复等边界由隔离管理器测试覆盖，真实账号 profile 尚未执行更新。

- Host：`src/index.js` + `src/papers.js` + `src/workbench/`，浏览器：`src/client.js` + `src/file-client.jsx/css`；预构建文件位于 `lib/`。
- 使用 `sidebar.panellist` 与 `main` keyed slots，保留原有 DSH Session/Workspace。
- 本地科研 Web API：`/research-workbench/files`（上传文件）、`/research-workbench/api`（论文）、`/research-workbench/content`（旧版结构化草稿）及 `/research-workbench/deadlines`（CCF 日历，只读 GET）。仅允许本机 loopback，所有读写请求都必须经过 DSH Connection 有效浏览器会话认证，拒绝显式跨站 Origin；Windows Desktop 认证代理剥离 Origin 后的请求同样受认证保护。科研资料 API 的写入限制在插件数据目录；原生 Office 工具另按指定路径操作本机文档，可位于该目录之外。
- CCF 数据来自第三方公开快照，插件只读取外部 JSON（12 秒超时、3 MB 上限、6 小时缓存），不向会议官网发起请求，也不上传任何本地内容；缓存写入插件数据目录，断网时回退到上一次快照并明确标注“离线缓存”。
- 新文件流程需要 Windows 和可用的 Office/WPS；旧版结构化草稿导出仍使用纯 Node.js Open XML 生成器。正式交付文件应完成最终人工校对。
- 不生成或执行 Office 宏；Patent/Softcopyright 不提供自动官方提交；不自动联网下载陌生代码或执行实验。
- 主测试 `npm run check`；测试使用 Node 自带 test runner，不需要 API Key。本地验证包括 Office 可被 LibreOffice 打开并正常导出 PDF。

## 开发与许可

```bash
npm ci --ignore-scripts
npm run check
npm pack
```

科研工作台未拷贝 Mimir 的代码；仅参考其功能组织方式。原生 Office 部分完整纳入 Copy 的 MIT 源码并保留许可。其他原创部分在所有者选择并发布许可之前，继续沿用既有的 `UNLICENSED` 标识；各部分的许可边界见 [NOTICE.md](NOTICE.md)。

## v0.3.1 Windows Desktop 认证兼容修复

- 修复 Windows DSH Desktop 在创建论文、项目书、PPT 和专利软著材料时可能返回 HTTP 403（“只允许在本机 DSH 界面中访问科研资料”）。
- Desktop 的 `dsh-app://app` 代理先验证来源，再剥离 `Origin` 并附带 DSH 已签发的认证 Cookie。插件不再把缺失 `Origin` 当作必然非法。
- 两条数据 API 均要求 `ctx.connection.requestRejection(req)` 通过 DSH 官方鉴权；无认证 Cookie、显式跨站 Origin、跨站 Fetch Metadata、非本机请求仍被拒绝。
- 保留本地成果目录与文件格式，升级不迁移或删除已有成果。

升级 Windows Desktop 时建议先退出应用，或在插件管理界面卸载旧版本后再安装 `v0.3.1`。
