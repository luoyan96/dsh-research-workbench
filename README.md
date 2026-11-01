# DSH Research Workbench（科研工作台）

面向 **DeepSeek Harness（DSH）Web UI** 的原生科研工作台插件。基于 DSH 官方的 Cordis + Slots 机制新增导航和主页面，**不 Fork DSH、不覆盖 DOM、不修改左上角品牌、原生聊天、工作区和已有插件**。

> **当前版本 v0.1.0 是第一阶段的可安装 UI 骨架。** 论文管理、PPT、实验执行和项目管理的完整业务能力尚未实现；本版本重点验证插件安装、原生导航、页面切换与 DSH 兼容性。

## 第一版包含什么

插件会在 DSH 左侧的「插件」（`order: 0`）和「自动化任务」（`order: 10`）后依次增加四个入口：

| 侧栏入口 | 主页面 key | 显示顺序 |
| --- | --- | --- |
| 论文管理 | `research-papers` | 20 |
| PPT 工作台 | `research-slides` | 30 |
| 科研实验 | `research-experiments` | 40 |
| 项目进度 | `research-projects` | 50 |

每个入口对应 DSH **中央主内容区**的一整页，不是弹窗。页面包含说明、后续模块规划、跨模块快捷导航，以及实际生效的「返回聊天」按钮。四个模块页面相互切换时，不会主动变更 DSH 当前的 Session / Workspace。

## Windows：直接安装预构建包（推荐）

无需单独安装 TypeScript、Vite 或 pnpm。下载 `dsh-research-workbench-0.1.0.tgz` 后，在 PowerShell 执行：

```powershell
# 请将路径改为实际下载位置
dsh plugin --profile web add "C:\Users\你\Downloads\dsh-research-workbench-0.1.0.tgz"
dsh web
```

如果此前已打开 `dsh web`，需要先停止、再重新运行。刷新浏览器可使用 `Ctrl+Shift+R`。

卸载插件：

```powershell
dsh plugin --profile web remove dsh-research-workbench
```

## Windows：从源码安装

Node.js 22+ 即可，本阶段 **没有 npm 运行时依赖，也不需要联网安装构建工具**：

```powershell
cd C:\path\to\dsh-research-workbench
npm run check
npm pack

# 生成 dsh-research-workbench-0.1.0.tgz，按上文安装
```

开发者也可以安装本地工作目录：

```powershell
dsh plugin --profile web add "link:$($PWD.Path)"
dsh web
```

## 第一轮验收清单

1. 左侧「插件」「自动化任务」「更多」「工作区」保持原状。
2. 「自动化任务」后依次出现「论文管理」「PPT 工作台」「科研实验」「项目进度」四项，图标尺寸与 DSH 原生导航一致。
3. 点击每个入口，中央区域出现对应独立页面，而不是弹窗或跳转到外部网站。
4. 点击页面右上的「返回聊天」，之前的会话和工作区不应消失。
5. 在页面底部使用「快速切换工作台」按钮，能够切换到其他三个页面。
6. 重启 DSH 后入口仍可用，卸载后入口及附加样式消失。
7. 将截图和浏览器控制台 / DSH 启动错误发回，用于排查实际版本兼容性。

## 代码结构

```text
src/index.js       # Cordis Host 半侧；第一版无后台服务
src/client.js      # 浏览器插件注册、四个原生页面、图标、样式
lib/index.js       # 预构建 Host 工件
lib/client.js      # 预构建浏览器工件
cordis.patch.yml   # 安装后自动激活
scripts/build.mjs  # 从 src 生成 lib（不依赖外部构建工具）
tests/             # Node 自带测试框架的注册 / 生命周期检查
```

实现要点：`sidebar.panellist` 负责新增导航，`main` keyed slot 注册内容页；`ctx.layout.selectPanel(id)` 在 DSH 内部切换主页面，`selectPanel(null)` 返回原生 Conversation。样式由 `ctx.effect` 管理，插件释放时清理，无全局 DOM 强制改写。

## 验证范围与下一阶段

当前已通过离线注册、导航回调、样式清理等单元检查以及 `npm pack` 打包检查；**尚未在用户本机的真实 DSH 版本运行浏览器端验收**。本实现按 2026 年 11 月上游 `master` 的 Web Client Slots 约定制作，DSH 预发布版本可能发生 API 变化。

下一阶段再独立接入：论文 / LaTeX、PPTX 生成编辑、科研实验、项目任务及 Agent 可调用的工具接口。当前页面所列这些能力只是规划，不应视为已实现。

此仓库的最终开源许可证尚待仓库所有者决定，因此包清单暂标记为 `UNLICENSED`。发布之前需要选定许可证。
