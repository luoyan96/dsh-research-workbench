# 版本发布说明

当前版本：`dsh-research-workbench@0.3.3`。`main` 合并后可以通过 GitHub 地址安装；**npm Registry 未发布前，`dsh-research-workbench@latest` 仍不能使用**。

## 未发布：论文编译任务与日志恢复（2026-11-04）

开发分支 `fix/persistent-paper-compilation`：编译 POST 返回 202 后由宿主管理任务，GET 可查询实际状态与日志；页面切换/刷新可恢复，支持停止、失败/超时记录、历史日志选择，保留上次成功 PDF。关闭宿主会停止进程，意外退出后的任务按宿主存活状态标为中断；不会把另一个仍运行的 DSH 的任务误标为中断。旧版本未保存的日志无法补回。

本地验证：`npm run check` 为 37 通过 / 1 跳过；9 项新增编译任务测试在 Windows 通过，覆盖真实子进程的后台执行、实时输出、断开请求、失败/超时/取消、宿主停止与恢复、其他宿主和鉴权。既有 Unix 脚本编译测试在 Windows 仍跳过；另用 AcceptCat 安装目录的真实 Tectonic 0.17.0 对隔离合成论文编译成功，PDF 与详细 main.log 均保留。`npm pack --dry-run`、`git diff --check` 通过。

浏览器使用内嵌浏览器、真实 React 插件组件及隔离 HTTP 服务，编译器为可控测试替身：验证切换到聊天再返回、刷新恢复、历史选择、跨论文状态、停止和 1536/1024 宽窗口，未发现浏览器警告或错误。此项不等同于现装 AcceptCat 的升级验收；未替换真实 profile、读取私人论文、发布 Release 或更新 npm。项目书/PPT 界面的编辑器选型仍待比较现有 DSH 插件，本批不做大规模重写。

## 发布到 GitHub

`main` 上的 v0.3.3 已提交并打了 `v0.3.3` 标签，可直接安装：

```powershell
dsh plugin --profile desktop remove dsh-research-workbench
dsh plugin --profile desktop add "github:luoyan96/dsh-research-workbench#main"
```

请在 Windows DSH 安装新版本前完全退出客户端。项目数据位于 `~/.dsh/research-workbench`，不在安装包目录下，升级不会删除已有成果。

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

目前通过离线自动测试、OOXML 解包和 LibreOffice 渲染，**未执行你当前 Windows DSH 实机的完整 UI/Agent 验证**。在确认工具调用、导出和自动保存符合预期前，暂不建议将此版公开推广给其他用户。
