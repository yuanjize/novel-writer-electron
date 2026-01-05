# novel-writer-electron 使用文档

一个基于 Electron + React + Ant Design + SQLite 的本地小说写作应用，支持项目/章节管理，并可选接入 Anthropic Claude 做 AI 续写、润色与情节建议。

## 功能一览

- 项目管理：新建/查看/编辑/删除项目
- 章节管理：新建章节、按章节编号排序、编辑章节内容
- 编辑体验：自动字数统计、一键保存
- AI 辅助（可选）：AI 续写 / AI 优化 / 情节建议
- 本地存储：SQLite（数据存本机，不依赖服务端）

## 快速开始（开发者）

### 1) 安装依赖

```bash
npm i
```

### 2) 启动开发环境

```bash
npm run dev
```

说明：
- `electron-vite` 会启动 renderer dev server；如果 `5173` 被占用，会自动切换到其他端口。
- 主进程会读取 `process.env.ELECTRON_RENDERER_URL` 自动加载正确端口。

### 3) 构建（生成 out/）

```bash
npm run build
```

## 打包发布

项目使用 `electron-builder`：

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

打包所需图标等资源放在 `build/`，见 `build/README.md`。

## 日常使用（写作）

### 1) 创建项目

进入首页「我的项目」：
- 点击「新建项目」
- 按向导填写项目名称、作者、类型、简介、目标字数

### 2) 创建章节

进入项目详情页：
- 点击「新建章节」
- 输入章节标题，系统会自动计算下一章编号

### 3) 编辑章节与保存

进入章节编辑器：
- 编辑标题与正文
- 点击右上角「保存」

## AI 功能配置（可选）

未配置 API Key 时，应用仍可正常写作，只是 AI 按钮会提示不可用。

### 方式 A：使用 `.env`（推荐开发环境）

1. 复制示例文件并填写 Key：

```bash
cp .env.example .env
```

`.env` 示例：

```env
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

2. 重启应用：`npm run dev`

更多说明见 `AI_SETUP.md`。

### 方式 B：写入配置文件（更适合打包后）

应用会在用户数据目录读取 `ai-config.json`：
- Windows（常见路径）：`%APPDATA%/<你的应用名>/ai-config.json`（实际以 Electron `app.getPath('userData')` 为准）

示例内容：

```json
{
  "apiKey": "sk-ant-...",
  "modelName": "claude-3-5-sonnet-20241022",
  "maxRetries": 3,
  "timeout": 60000,
  "debug": false
}
```

## 数据存储位置

应用使用 SQLite，本地数据库文件名为 `novel-writer.db`，存放在 Electron `app.getPath('userData')` 对应目录下。

## 常见问题

### 0) 白屏 / 窗口打不开（开发环境）

如果你的系统环境变量里有 `ELECTRON_RUN_AS_NODE=1`，Electron 会“当作 Node 来跑”，主进程拿不到 `app/BrowserWindow`，通常会直接白屏或启动失败。

本项目的 `npm run dev` 已在启动脚本中自动清理该变量（见 `scripts/electron-vite.js`）。如果你是直接运行 `electron-vite dev`，请改用 `npm run dev`。

### 1) 启动时提示 ANTHROPIC_API_KEY 未配置

这只是 AI 未启用的提示，不影响项目/章节写作功能。
按上面的「AI 功能配置」配置即可。

### 2) 启动时提示端口占用

`electron-vite` 会自动尝试下一个端口（例如 5174/5175/5176），属于正常现象。

### 3) 构建时出现一些依赖 warning（例如 unused import）

这类 warning 通常来自第三方依赖包，一般不影响运行与打包；如需排查请先确认应用功能是否正常。

## 项目结构（读代码用）

- `main/`：Electron 主进程（创建窗口、数据库、IPC）
- `preload/`：preload 脚本（通过 `contextBridge` 暴露 `window.electronAPI`）
- `src/`：renderer（React UI）
- `main/database/`：SQLite 初始化与 DAO
- `main/ipc-handlers.ts`：所有 IPC handler 定义
