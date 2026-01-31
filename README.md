# AITool - AI工具箱

## 项目简介

这是一个AI做的工具箱，不是AI的工具箱。灵感来自日常工作中遇到的问题，使用AI制作成这个软件。

## 技术栈

- **React 19** - 用户界面框架
- **TypeScript** - 类型安全的 JavaScript
- **Vite** - 快速的前端构建工具
- **Ant Design** - 企业级 UI 组件库
- **Tauri 2** - 跨平台桌面应用框架（Rust）

## 开发

### 安装依赖&运行

先安装好 Node.js 和 Rust 环境：

```bash
# 安装 Node.js 依赖
npm install

# 运行 Tauri 开发模式
npm run dev
```

### 构建和打包

```bash
# 构建 Tauri 桌面应用
npm run build

```

### 构建Android

如果只要构建debug 版本，不需要签名，但生成的apk比较大 300M+
```bash
npm run android:init
npm run android:debug
```

如果要构建release 版本，需要先配置好签名文件，参考 https://tauri.app/zh-cn/distribute/sign/android/#configure-gradle-to-use-the-signing-key 生成jks文件用于签名。复制 `template-keystore.properties` 到 `keystore.properties`，然后修改 `keystore.properties` 中的 `storePassword` 和 `keyPassword` 为你自己的密码，最后指定一个jks文件路径。 生成的apk大概40M

```bash
npm run android:init-release
npm run android:release
```

不同平台（Windows/Mac/Linux）需要在对应平台分别构建。

## 开发计划

更多功能开发中...

## 许可证

MIT
