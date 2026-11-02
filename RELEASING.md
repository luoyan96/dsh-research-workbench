# 版本发布说明

当前版本：`dsh-research-workbench@0.3.2`。`main` 合并后可以通过 GitHub 地址安装；**npm Registry 未发布前，`dsh-research-workbench@latest` 仍不能使用**。

## 发布到 GitHub

本次通过 Git bundle/ZIP 或 GitHub 连接写入更新 `main`。请在 Windows DSH 安装新版本前完全退出客户端，移除旧版再安装。项目数据位于 `~/.dsh/research-workbench`，不在安装包目录下。

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

后续更新版本号、推送 tag，例如 `v0.3.3`，才会触发 `publish.yml`。不要对尚未发布的版本反复推同一个 tag。正式发布之前请确认 npm 项目名称归属及登录信息，**不要在聊天中提供 npm Token**。

## 可靠性和已知限制

目前通过离线自动测试、OOXML 解包和 LibreOffice 渲染，**未执行你当前 Windows DSH 实机的完整 UI/Agent 验证**。在确认工具调用、导出和自动保存符合预期前，暂不建议将此版公开推广给其他用户。
