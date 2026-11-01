# DSH Research Workbench（科研工作台）

基于 **DeepSeek Harness (DSH)** 的 Cordis + Slots 插件，原生集成「论文管理」「PPT 工作台」「科研实验」「项目进度」四个左侧导航入口，不 Fork DSH，不替换原生聊天 / 工作区 / Logo。

## v0.2.0 — 论文管理可用版本

**论文管理**现在具有真实的后台功能，不再只是导航占位页：

- 新建、重命名、归档论文项目；自动创建 `main.tex` 与 `references.bib`。
- 浏览和编辑 `.tex` / `.bib` / `.sty` / `.cls` / `.txt` 文件；支持自动保存与 `Ctrl+S`、多文件目录、文件 SHA-256 版本冲突保护。
- 导入论文源文件、论文插图和已有 PDF 文件（每个不超过 20 MiB；同名文件不会被静默覆盖）。
- 通过 DSH 后端直接调用本机 **Tectonic**，成功后预览、下载编译出的 `main.pdf`，失败时保留编译日志和上次成功的 PDF。
- 论文项目、源文件和 PDF 保存在 **`~/.dsh/research-workbench/papers/`**（Windows 是 `C:\Users\用户名\.dsh\research-workbench\papers\`），不依赖浏览器 localStorage。

其他三个入口仍是原生页面骨架，PPT 编辑器、真实实验执行和项目任务看板尚未开发。

### 从 GitHub 安装

```powershell
dsh plugin --profile web add "github:luoyan96/dsh-research-workbench#main"
```

如果已安装 v0.1.0，先停止 DSH，再执行：

```powershell
dsh plugin --profile web remove dsh-research-workbench
dsh plugin --profile web add "github:luoyan96/dsh-research-workbench#main"
```

重启 DSH Web 或桌面客户端，必要时 `Ctrl+Shift+R` 硬刷新。**上述 GitHub 命令只有在 v0.2.0 提交实际推送至 main 后才会安装新版本。** 也可以直接安装本项目打包的 `dsh-research-workbench-0.2.0.tgz`。

### LaTeX 编译需要 Tectonic

本版使用本机的 Tectonic 编译器，不会在后台自动下载安装可执行程序。安装并确认以下命令有效：

```powershell
tectonic --version
```

如果不想设置环境变量，Windows 上可将官方 `tectonic.exe` 放在 `C:\Tools\Tectonic\tectonic.exe`。后台也支持管理员设置 `DSH_RWB_TECTONIC_PATH` 指向受信任的编译器绝对路径。修改环境变量后需要重启 DSH。

Tectonic 首次编译可能需要网络获取 TeX 宏包。**只编译你信任的 LaTeX 项目**；TeX 编译器是本地进程，不是安全沙箱。不要把陌生人提供的文档作为受信任代码自动编译。

官方 Tectonic 发布页：<https://github.com/tectonic-typesetting/tectonic/releases>。

### 用户使用流程

1. 点击左侧 **论文管理**，输入论文标题并创建项目。
2. 选择 `main.tex`，编辑论文并保存（支持自动保存）。
3. 点击 **编译 PDF**；若已安装 Tectonic，PDF 将显示在右侧。
4. 可添加 `sections/method.tex` 等子文件，在 `main.tex` 中使用 `\input{sections/method}` 引用。
5. 必要时导入 `.bib` 或论文图片，或将选中的源文件下载备份。

### 功能与限制

| 模块 | v0.2.0 实际状态 |
| --- | --- |
| 论文管理 | 已实现本地项目与文本编辑 |
| Tectonic 编译 | 已实现接口，需本机已安装编译器 |
| PDF 预览 | 已实现，桌面客户端 PDF 显示仍需真实环境验证 |
| PPT 工作台 | 原生页面骨架 |
| 科研实验 | 原生页面骨架 |
| 项目进度 | 原生页面骨架 |
| Agent 可调用的论文工具 | 下一个开发阶段 |
| 在线文献检索 / 模板库 | 下一个开发阶段 |
| 一键安装 Tectonic | 尚未实现 |

### 本地测试与打包

只需要 Node.js >=22，不需要先安装其他 npm 构建依赖：

```powershell
npm ci --ignore-scripts
npm run check
npm pack
```

Host 插件依赖 DSH `webServer` 服务，浏览器使用 DSH 原生 `main` 与 `sidebar.panellist` 插槽。API 仅服务本机回环地址，写操作要求同源；项目和文件路径限制在插件专属目录，保存采用原子写和版本检查。

这版提供了 9 项离线自动测试（包括宿主 API、路径保护、伪 Tectonic 编译测试和 DSH 插槽模拟）。**尚未在实际 DSH Desktop 上验收论文编辑器交互**，因此发布前需要在你当前 Windows DSH 版本上测试。

## 发布

仓库已配置 CI 和 npm Trusted Publishing 工作流；公开 npm `@latest` 命令只在首次发布至 npm Registry 后有效。详情见 [RELEASING.md](RELEASING.md)。

本仓库目前尚未决定开源许可证；`package.json` 的 `license` 暂设为 `UNLICENSED`，请在正式对外分发前确定授权条款。
