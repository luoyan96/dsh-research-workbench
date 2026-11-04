# 版本发布说明

当前版本：`dsh-research-workbench@0.4.0`。通过 GitHub tag 或 Release 的 tgz 安装；**npm Registry 未发布前，`dsh-research-workbench@latest` 仍不能使用**。v0.4.0 包含论文编译持久化、独立更新、原生 Office 融合和本地文件工作区，保留公开 v0.3.3 及其资产。

发布前 Windows `npm run check`：Node 69 通过 / 1 跳过，上游 Office 34 通过 / 1 跳过，合计 103 通过 / 2 跳过。已在隔离 DSH 0.2.1-rc.3 中用真实 WPS 和本地模拟模型验证 DOCX/PPTX 的原生会话、工具执行、保存和预览；DOTX/POTX 副本的原生编辑保存、原件完整性与只读快速失败另有实测。在线模型复杂任务和微软 Office 全套兼容性不在此验收结论内。

## v0.4.0：论文编译任务与日志恢复（2026-11-04）

编译 POST 返回 202 后由宿主管理任务，GET 可查询实际状态与日志；页面切换/刷新可恢复，支持停止、失败/超时记录、历史日志选择，保留上次成功 PDF。关闭宿主会停止进程，意外退出后的任务按宿主存活状态标为中断；不会把另一个仍运行的 DSH 的任务误标为中断。旧版本未保存的日志无法补回。

本地验证：`npm run check` 为 37 通过 / 1 跳过；9 项新增编译任务测试在 Windows 通过，覆盖真实子进程的后台执行、实时输出、断开请求、失败/超时/取消、宿主停止与恢复、其他宿主和鉴权。既有 Unix 脚本编译测试在 Windows 仍跳过；另用 AcceptCat 安装目录的真实 Tectonic 0.17.0 对隔离合成论文编译成功，PDF 与详细 main.log 均保留。`npm pack --dry-run`、`git diff --check` 通过。

浏览器使用内嵌浏览器、真实 React 插件组件及隔离 HTTP 服务，编译器为可控测试替身：验证切换到聊天再返回、刷新恢复、历史选择、跨论文状态、停止和 1536/1024 宽窗口，未发现浏览器警告或错误。此项不等同于现装 AcceptCat 的升级验收；测试未替换真实 profile 或读取私人论文。

## v0.4.0：本地文件工作区（2026-11-04）

三个成果入口改为「上传本地文件/模板 → 实际 Office 页面预览 + DSH 原生对话」。首版只处理 DOCX/DOTX 与 PPTX/POTX（80 MiB），不包含模板库和实验室共享入口；上传原件备份、工作副本、独立会话绑定和文件操作记录均独立保存。模板复制为普通 Office 工作文件，原版式及媒体部件保留；论文和 CCF 页面不重写。

新增 `/research-workbench/files` API、`research_file_current` 和原生 `conversation.content` Factory 的嵌入。发布包必须包含 `lib/workbench/files.js`、打入客户端的文件页面、Tabler 许可文本，宿主需具备 DSH 0.2.1-rc.3 的 Session reference 与 Conversation Factory API。

实机在独立 DSH_HOME/数据目录中执行，真实 WPS 处理合成文件，本地模拟 LLM 通过实际 Agent loop 调用工具。在线账号的任务理解与修改质量、微软 Office 兼容矩阵仍需另外验收。

## 发布到 GitHub

每个版本使用对应的不可覆盖标签及 tgz 资产。v0.4.0 的安装方式：

```powershell
dsh plugin --profile desktop remove dsh-research-workbench
dsh plugin --profile desktop add "github:luoyan96/dsh-research-workbench#v0.4.0"
```

请在 Windows DSH 安装新版本前完全退出客户端。项目数据位于 `~/.dsh/research-workbench`，不在安装包目录下，升级不会删除已有成果。旧版结构化草稿保留原数据和 API，新界面不自动迁移为 Office 文件。

发布顺序：更新 package.json/package-lock 与说明 → 完整检查及打包校验 → PR CI 通过并合并 main → 在合并提交创建 `v0.4.0` → 创建 GitHub Release 并上传 `dsh-research-workbench-0.4.0.tgz` → 确认 GitHub 资产的 SHA-256 digest、大小与本地一致。GitHub Release 与 npm 发布分别执行；仓库当前的 npm Trusted Publisher 仍需包所有者配置，不因 GitHub 发版而触发。

## 第一次 npm 发布（仅包所有者操作）

在项目目录中运行：

```bash
npm ci --ignore-scripts
npm run check
npm pack --dry-run
npm login
npm publish --access public
```

发布前确认 `license: UNLICENSED` 是否符合你的分发意图。确认模块在 Windows DSH 上真正可用后，再发布到公共 npm。

在 npm 官网的包 Settings → Trusted Publishing 页面选择 GitHub Actions，填入：

- Owner: `luoyan96`
- Repository: `dsh-research-workbench`
- Workflow: `publish.yml`

后续更新版本号、推送 tag，例如 `v0.3.3`，不会自动触发发布：`publish.yml` 已改为 `workflow_dispatch` 手动触发，避免在 npm 未配置时每个 tag 都产生一次失败运行。配置好 Trusted Publisher 后，可在 Actions 页面手动运行该工作流。正式发布之前请确认 npm 项目名称归属及登录信息，**不要在聊天中提供 npm Token**。

## 可靠性和已知限制

`feat/integrate-native-office` 已完整纳入 @copylee/dsh-office 1.2.0（固定提交 2069af2），作为科研 bundle 的第二个原生组件；源码与许可证位于 vendor/copylee-office。发布前检查根 NOTICE、打包后的 SDK 许可文本、helper/OfficeHelper.cs、lib/native-office.js 和客户端模块均包含在 tgz 中；不要去执行或改动快照里的上游发布工作流。新增 npm devDependencies 仅用于构建/验证，运行所需库已打入 bundle，独立 Office 包不是运行依赖。

v0.4.0 已为本批编译、更新、Office 融合和文件工作区分配新版本号，不覆盖 v0.3.3。SDK/适配以 DSH 0.2.1-rc.3 为实测基线；原生 Office 仅在 Windows 上加载。Office/WPS 应用兼容限制沿用上游说明；微软 Office 完整三件套及带模型的真实账号长流程尚未验收。

v0.4.0 增加 GitHub Release 更新入口。后续每版须上传与标签版本一致的 tgz，确保 GitHub API 返回 `sha256:` digest。安装包大小上限 16 MiB；检查成功、下载成功、安装成功与重启后生效是不同状态。旧版须先手动安装一次带更新入口的版本；AcceptCat 自动补装仍需配套避免降级的客户端修复。

Windows 隔离实测：AcceptCat 自带 DSH 0.2.1-rc.3、全新 DSH_HOME 和科研数据目录；用包含更新代码且仅版本号为合成 0.3.2 的测试包，确认后下载公开 v0.3.3（59586 字节，SHA256 a7b0d4ac36b8c84d5b0e9ada056bc0569480a47adce9e8a53ed53cf248dc4ac1），DSH 原生安装实际成功，磁盘记录 `restart-required`。目标公开旧包尚无更新 UI，因此热加载后入口消失属此测试目标的预期限制；后续正式新版必须保留更新代码。自动恢复、摘要不匹配、双重确认、忙碌保护和状态持久化另有离线测试。不得把上述合成旧版本当作公开 0.3.2 的完整升级验收。

v0.4.0 已通过自动测试、OOXML 解包，以及隔离 Windows DSH/WPS 的实际预览、原生会话、保存下载和模拟模型工具链验收；模板副本另外验证原生编辑保存。只读工作副本会立即报错，后台收尾等待预览/保存事务完成。测试未替换实际账号 profile；用户应使用常用材料复核模型修改效果和最终版式。
