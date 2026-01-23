import { contextBridge, ipcRenderer } from 'electron';

// 暴露本地能力接口，为后续可能运行在浏览器做准备
// 在浏览器环境中，这些接口会提供降级处理
contextBridge.exposeInMainWorld('electronAPI', {
  // 系统信息
  getPlatform: () => ipcRenderer.invoke('get-platform'),

  // 文件操作
  selectFile: () => ipcRenderer.invoke('select-file'),
  saveFile: (content: string) => ipcRenderer.invoke('save-file', content),
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // 剪贴板
  readClipboard: () => ipcRenderer.invoke('read-clipboard'),
  writeClipboard: (text: string) => ipcRenderer.invoke('write-clipboard', text),

  // 通知
  showNotification: (title: string, body: string) => ipcRenderer.invoke('show-notification', title, body),

  // 配置
  getDataPath: () => ipcRenderer.invoke('get-data-path'),
  setDataPath: (path: string) => ipcRenderer.invoke('set-data-path', path)
});

// 导出类型定义供 TypeScript 使用
declare global {
  interface Window {
    electronAPI: {
      getPlatform: () => Promise<string>;
      selectFile: () => Promise<string | null>;
      saveFile: (content: string) => Promise<boolean>;
      selectFolder: () => Promise<string | null>;
      readClipboard: () => Promise<string>;
      writeClipboard: (text: string) => Promise<void>;
      showNotification: (title: string, body: string) => Promise<void>;
      getDataPath: () => Promise<string>;
      setDataPath: (path: string) => Promise<void>;
    };
  }
}
