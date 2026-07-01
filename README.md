# 简单笔记

一个基于 Electron + React + TypeScript 的跨平台桌面 Markdown 笔记应用，支持实时预览、昼夜主题、分类管理、多格式导入导出。

## 功能特点

- **Markdown 实时预览** — 编辑区语法高亮，预览区实时渲染，双向滚动同步
- **可拖拽分栏布局** — 分屏/仅编辑/仅预览三种视图模式，分隔条自由拖拽调整比例
- **Markdown 快捷工具栏** — 零基础友好，按功能分组，支持快速插入标题、列表、代码块、链接等
- **昼夜主题切换** — 一键切换浅色/深色主题，设置自动持久化
- **分类与标签管理** — 可折叠分类树，标签系统支持内容中 `#标签` 自动提取
- **回收站机制** — 软删除笔记 30 天内可恢复，支持还原与彻底删除
- **全局搜索** — 内容 + 标签 + 时间范围组合检索
- **多格式导入导出** — 支持 `.md` / `.txt` / `.docx` 文件导入与导出
- **拖拽打开文件** — 将文件拖拽到窗口即可直接打开
- **手动保存 + 自动保存** — `Ctrl+S` 手动保存，编辑时自动防抖保存
- **外部文件保存到笔记** — 从外部打开的文件可一键保存到笔记列表
- **配置备份** — 支持导出/导入 JSON 数据备份
- **本地存储** — 所有数据存储在本地，无需联网

## 技术栈

| 技术 | 用途 |
|------|------|
| Electron 35 | 跨平台桌面框架 |
| React 18 | 渲染层 UI |
| TypeScript 5 | 类型安全 |
| electron-vite 3 | 构建工具 |
| Marked + Highlight.js | Markdown 解析与语法高亮 |
| DOMPurify | XSS 防护 |
| docx + mammoth | Word 文档导入导出 |
| Vitest + Playwright | 单元测试与 E2E 测试 |

## 下载安装

前往 [GitHub Releases](https://github.com/ohhhss/simple-notes/releases) 页面下载最新版本：

| 文件 | 说明 |
|------|------|
| `简单笔记-x.x.x-win-x64.exe` | Windows 一键安装包（推荐普通用户下载） |
| `简单笔记-x.x.x-Portable.exe` | Windows 便携版，免安装，双击即用 |
| `简单笔记-x.x.x.dmg` | macOS 安装镜像 |
| `简单笔记-x.x.x.AppImage` | Linux 便携包 |

**用户使用方式：**
- **普通用户**：下载 `win-x64.exe` 安装包，双击一键安装，自动创建桌面快捷方式
- **便携使用**：下载 `Portable.exe`，无需安装，放到 U 盘或任意位置双击即可运行
- **macOS 用户**：下载 `.dmg` 文件，打开后拖拽到应用程序文件夹
- **Linux 用户**：下载 `.AppImage` 文件，添加执行权限后双击运行

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装与运行

```bash
# 安装依赖
npm install

# 开发模式启动
npm run dev

# 构建
npm run build

# 打包（Windows）
npm run dist:win

# 打包（macOS）
npm run dist:mac

# 打包（Linux）
npm run dist:linux
```

### 测试

```bash
# 单元测试
npm run test:unit

# E2E 测试
npm run test:e2e

# 完整测试
npm test
```

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+N` | 新建笔记 |
| `Ctrl+O` | 打开文件 |
| `Ctrl+S` | 保存笔记 |
| `Ctrl+Shift+F` | 全局搜索 |
| `Ctrl+Shift+L` | 切换昼夜主题 |
| `Ctrl+Shift+M` | 导出为 Markdown |
| `Ctrl+Shift+T` | 导出为纯文本 |
| `Ctrl+Shift+W` | 导出为 Word 文档 |
| `Ctrl+Alt+S` | 分屏模式 |
| `Ctrl+Alt+E` | 仅编辑模式 |
| `Ctrl+Alt+P` | 仅预览模式 |
| `Ctrl+B` | 粗体 |
| `Ctrl+I` | 斜体 |
| `Ctrl+E` | 行内代码 |
| `Ctrl+K` | 插入链接 |
| `Ctrl+1/2/3` | 一/二/三级标题 |

## 项目结构

```
简单笔记/
├── src/
│   ├── main/              # Electron 主进程
│   │   ├── index.ts       # 应用入口、窗口管理
│   │   ├── ipc.ts         # IPC 处理器、文件操作
│   │   ├── menu.ts        # 应用菜单
│   │   ├── logger.ts      # 日志系统
│   │   └── window-state.ts # 窗口状态记忆
│   ├── preload/           # 预加载脚本（安全桥接）
│   ├── renderer/          # React 渲染进程
│   │   └── src/
│   │       ├── components/  # UI 组件
│   │       ├── hooks/       # 自定义 Hooks
│   │       ├── utils/      # 工具函数
│   │       └── App.tsx     # 主应用
│   └── shared/            # 共享类型与常量
├── e2e/                  # E2E 测试
├── electron.vite.config.ts
└── package.json
```

## 安全特性

- 渲染进程沙箱隔离（`sandbox: true`）
- 上下文隔离（`contextIsolation: true`）
- 禁用 Node 集成（`nodeIntegration: false`）
- IPC 通道输入校验（字符串长度、路径白名单、枚举校验）
- DOMPurify 消毒防 XSS
- IPC 调用超时机制
- 全局异常捕获与崩溃恢复

## 许可证

[MIT License](LICENSE)

## 开发者

**ohhhss** — [GitHub](https://github.com/ohhhss)
