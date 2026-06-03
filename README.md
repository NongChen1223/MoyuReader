# 墨鱼阅读器 MoyuReader

墨鱼阅读器（MoyuReader）是一个桌面小说阅读器项目，当前默认桌面方案为 `Electron + React + Go`，仓库里仍保留旧桌面入口作为迁移期对照。
现阶段前端界面继续使用 React + TypeScript，桌面壳层以 Electron 为主，小说解析与进度等业务核心继续保留在 Go。
当前主线能力是本地小说书架、TXT / EPUB / PDF 阅读、阅读外观设置、全文搜索、阅读进度持久化，以及阅读页摸鱼模式。

详细功能和设计说明见 [docs/功能需求说明.md](docs/功能需求说明.md)。

## 当前技术栈

### 桌面壳与后端

- Go `1.24.1`
- toolchain `go1.24.4`
- Electron `42.2.0`
- Wails `v2.11.0`（迁移期仅保留旧入口用于对照）

### 前端

- React `18.3.1`
- TypeScript `5.5.2`
- Vite `5.3.1`
- Zustand `4.5.2`
- Ant Design `6.1.0`
- SCSS Modules

### 开发工具

- pnpm
- ESLint
- Sass
- concurrently
- wait-on

## 当前支持情况

### 已实现

- 书架与目录管理（含多选删除）
- 单文件导入、目录创建、目录内继续导入
- TXT 阅读
- EPUB 元数据、封面、章节、正文图片渲染
- PDF 阅读（文本型 PDF；macOS 额外支持图片型 PDF 按页阅读）
- 阅读进度保存与恢复
- 阅读页目录、上一章、下一章
- 全文搜索与命中跳转
- 阅读外观设置
- 快捷键设置
- 摸鱼模式内容透明度调节（文字与图片同步）
- 普通摸鱼模式
- macOS 原生桌面浮窗摸鱼模式（Electron 版本已接入独立浮窗窗口、章节控制、透明度与进度回传，仍需继续对齐旧版细节）

### 未完整实现或仅占位

- MOBI 阅读
- AZW3 阅读
- 格式转换
- 真实阅读统计
- 漫画主线功能

## 平台差异

- macOS：Electron 版本已接入独立透明浮窗式摸鱼阅读；图片型 PDF 按页渲染能力仍沿用 Go 后端
- Electron 迁移中的当前状态：主窗口、文件/目录选择、小说解析、进度保存、搜索和基础桌面浮窗已接入；仍需继续对齐旧版浮窗交互细节
- Windows / 非 darwin：摸鱼模式退化为普通 WebView 隐身模式；PDF 当前仅保证文本型文件阅读

## 开发命令

### 安装依赖

```bash
go mod tidy
pnpm install
pnpm --dir frontend install
```

### 开发模式

```bash
pnpm dev
```

说明：

- `pnpm dev` 会同时启动 Vite、Electron 和 Go API 服务
- 若仍需对照旧桌面壳，可手动运行旧入口开发命令

### 前端构建

```bash
pnpm --dir frontend build
```

### 前端类型检查

```bash
pnpm --dir frontend type-check
```

### 后端编译检查

```bash
go build ./cmd/moyureader-server
```

### 后端测试

```bash
GOCACHE=$(pwd)/.gocache go test ./...
```

### 打包

```bash
pnpm build
```

## 项目结构

```text
moyureader/
├── backend/
│   ├── app/
│   │   └── app.go                      # 旧桌面壳仍复用的配置接口入口
│   ├── models/
│   │   └── models.go                   # 小说、章节、搜索结果等后端模型
│   └── services/
│       ├── novel_service.go            # 文件打开、TXT/EPUB/PDF 解析、章节读取、进度恢复
│       ├── progress_service.go         # 阅读进度持久化
│       ├── search_service.go           # 全文搜索
│       ├── window_service.go           # 置顶、透明度、摸鱼模式控制
│       ├── window_overlay_darwin.go    # macOS 原生桌面浮窗实现
│       └── window_overlay_default.go   # 非 macOS 空实现降级
├── cmd/
│   └── moyureader-server/
│       └── main.go                     # Electron 使用的 Go HTTP API 入口
├── config/
│   ├── config.local.json               # 本地环境配置
│   ├── config.test.json                # 测试环境配置
│   └── config.prod.json                # 生产环境配置
├── electron/
│   ├── main.mjs                        # Electron 主进程与窗口、IPC、Go 服务拉起
│   └── preload.mjs                     # 渲染进程安全桥接
├── frontend/
│   ├── src/
│   │   ├── bridge/                     # 桌面桥接抽象，隔离 Electron / 旧实现差异
│   │   ├── components/
│   │   │   ├── common/                 # 通用按钮、输入、滑块、选择器、Dialog 等
│   │   │   └── features/               # 书籍卡片、侧边栏、阅读外观控件等业务组件
│   │   ├── hooks/                      # 自定义 hooks
│   │   ├── layouts/                    # 页面布局
│   │   ├── pages/
│   │   │   ├── Home/                   # 书架页
│   │   │   ├── Reader/                 # 阅读页
│   │   │   └── Settings/               # 设置页
│   │   ├── router/                     # 路由配置
│   │   ├── services/                   # 小说等业务 service 封装
│   │   ├── stores/                     # Zustand 状态管理
│   │   ├── styles/                     # 主题变量与全局样式资源
│   │   ├── types/                      # 前端类型定义
│   │   ├── utils/                      # 阅读与快捷键相关工具函数
│   ├── package.json
│   └── vite.config.ts
├── docs/
│   └── 功能需求说明.md                 # 详细功能、交互和设计说明
├── main.go                             # 旧桌面壳启动入口
├── wails.json                          # 旧桌面壳构建配置
└── AGENTS.md                           # 仓库级协作约束
```

## 配置与数据

### 环境配置

- 环境变量：`MOYUREADER_ENV`
- 默认配置文件：
- `config/config.local.json`
- `config/config.test.json`
- `config/config.prod.json`

### 本地数据

- 设置页里的“本地存储路径”对应后端 `Config.DataDir`
- 阅读进度存储在 `DataDir/progress.json`
- 书架、阅读设置、主题、快捷键主要保存在前端本地存储
- 导入书籍默认保留原始本地文件路径，不会复制到应用数据目录

## 当前注意点

- `pnpm dev` 默认依赖 `5173` 和本地 `18767` 端口，若被占用需先释放
- `pnpm build` 会顺序构建前端静态资源与 Go API 服务
- 当前仓库仍处于桌面壳收口阶段，旧入口和新入口暂时并存
- Sass 仍有 legacy API / `@import` 警告，但当前不影响构建
- PDF 支持可提取文本的文本型文件；macOS 也支持漫画 / 扫描版等图片型 PDF 按页阅读；加密 PDF 仍不支持
- Electron 骨架当前已覆盖主窗口、文件选择、配置路径、小说解析、搜索、进度和基础桌面浮窗
- 当前环境下 `pnpm exec electron` 仍可能因为 Electron 二进制下载受限而无法直接启动，这属于本地依赖获取问题，不是前端/Go 代码编译错误
- macOS 测试构建若走旧桌面入口，仍可能出现 private API 警告，这不代表当前可直接用于 App Store 审核
