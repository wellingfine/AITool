# AITool - AI工具箱

一个基于 React + Ant Design + Vite + Electron 的桌面应用程序，集成了多种实用工具。

## 项目简介

AITool 是一个轻量级的桌面工具应用，提供日常开发中常用的工具功能。采用现代化的前端技术栈，支持作为桌面应用或 Web 应用运行。

## 技术栈

- **React 19** - 用户界面框架
- **TypeScript** - 类型安全的 JavaScript
- **Vite** - 快速的前端构建工具
- **Ant Design** - 企业级 UI 组件库
- **Electron** - 跨平台桌面应用框架

## 功能特性

- ✅ 左侧菜单导航，右侧内容展示
- ✅ 时间戳转换工具（支持秒级/毫秒级时间戳互转）
- ✅ 本地能力封装（剪贴板、文件操作、通知等）
- ✅ 支持浏览器独立运行（所有本地能力都有降级处理）

## 项目结构

```
AITool/
├── electron/              # Electron 主进程代码
│   ├── main.ts           # 主进程入口
│   ├── preload.ts        # 预加载脚本
│   └── ipc.ts            # IPC 通信处理
├── src/
│   ├── components/       # React 组件
│   │   └── TimestampConverter.tsx  # 时间戳转换工具
│   ├── services/         # 服务层
│   │   └── nativeAPI.ts  # 本地能力封装接口
│   ├── App.tsx           # 主应用组件
│   ├── main.tsx          # 应用入口
│   └── index.css         # 全局样式
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 安装依赖

```bash
npm install
```

需要安装以下依赖：
- antd - UI 组件库
- @ant-design/icons - 图标库
- electron - 桌面应用框架
- electron-builder - 打包工具
- concurrently - 并发执行命令
- cross-env - 跨平台环境变量
- wait-on - 等待服务就绪

```bash
npm install antd @ant-design/icons electron electron-builder concurrently cross-env wait-on --save-dev
```

## 开发

### 作为 Web 应用运行

```bash
npm run dev
```

访问 http://localhost:5173 查看应用

### 作为 Electron 应用运行

```bash
npm run electron:dev
```

## 构建

### 构建 Web 应用

```bash
npm run build
```

构建产物在 `dist` 目录

### 构建 Electron 应用

```bash
npm run electron:build
```

可执行文件在 `dist-electron` 目录

## 本地能力接口说明

应用封装了统一的本地能力接口，确保应用可以在 Electron 和浏览器环境中运行：

### 剪贴板操作

```typescript
import { nativeAPI } from './services/nativeAPI';

// 读取剪贴板
const text = await nativeAPI.clipboard.read();

// 写入剪贴板
await nativeAPI.clipboard.write('Hello World');
```

### 文件操作

```typescript
// 选择文件
const filePath = await nativeAPI.file.selectFile();

// 保存文件
const success = await nativeAPI.file.saveFile('content', 'filename.txt');
```

### 系统信息

```typescript
// 获取平台信息
const platform = await nativeAPI.system.getPlatform();
```

### 通知

```typescript
// 显示通知
await nativeAPI.notification.show('标题', '内容');
```

## ⚠️ 重要注意事项

### 1. 浏览器兼容性

- 应用设计为可以在浏览器中独立运行
- 所有本地能力调用都提供了浏览器环境的降级处理
- 某些高级功能在浏览器中可能受限（如文件系统访问）

### 2. Electron 开发注意事项

- Electron 使用 `contextIsolation` 确保安全性
- 所有本地能力通过 IPC 通信，不直接暴露 Node.js API
- 预加载脚本中暴露的 API 需要与主进程的 IPC 处理对应

### 3. 添加新功能

- 新增工具组件放在 `src/components/` 目录
- 如需本地能力，优先使用 `nativeAPI` 封装的接口
- 确保新功能在浏览器和 Electron 环境都能正常工作
- 在 `App.tsx` 的菜单配置中添加新的菜单项

### 4. 依赖管理

- 定期更新依赖版本以获取安全补丁
- Electron 版本升级时需要检查兼容性
- 生产环境建议锁定依赖版本

### 5. 构建和打包

- Web 构建产物用于部署到 Web 服务器
- Electron 构建产物生成桌面安装程序
- 不同平台（Windows/Mac/Linux）需要在不同平台分别构建

## 开发计划

- [ ] 更多日常工具（JSON 格式化、Base64 编解码等）
- [ ] 主题切换（深色/浅色模式）
- [ ] 快捷键支持
- [ ] 数据持久化（本地存储）
- [ ] 多语言支持

## 许可证

MIT
