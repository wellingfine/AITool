/**
 * 本地能力封装接口
 * 
 * 注意：此模块为本地能力提供统一接口
 * 在浏览器环境中会自动降级处理，确保应用可以在浏览器中独立运行
 */

// 检测运行环境
const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
};

// 剪贴板操作
export const clipboardAPI = {
  read: async (): Promise<string> => {
    if (isElectron()) {
      return window.electronAPI.readClipboard();
    }
    // 浏览器环境降级
    try {
      return await navigator.clipboard.readText();
    } catch (error) {
      console.warn('浏览器剪贴板读取失败:', error);
      return '';
    }
  },
  
  write: async (text: string): Promise<void> => {
    if (isElectron()) {
      return window.electronAPI.writeClipboard(text);
    }
    // 浏览器环境降级
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.warn('浏览器剪贴板写入失败:', error);
    }
  }
};

// 文件操作
export const fileAPI = {
  selectFile: async (): Promise<string | null> => {
    if (isElectron()) {
      return window.electronAPI.selectFile();
    }
    // 浏览器环境降级
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '*/*';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        resolve(file ? file.name : null);
      };
      input.oncancel = () => resolve(null);
      input.click();
    });
  },
  
  saveFile: async (content: string, filename: string = 'download.txt'): Promise<boolean> => {
    if (isElectron()) {
      return window.electronAPI.saveFile(content);
    }
    // 浏览器环境降级
    try {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.warn('浏览器文件保存失败:', error);
      return false;
    }
  }
};

// 系统信息
export const systemAPI = {
  getPlatform: async (): Promise<string> => {
    if (isElectron()) {
      return window.electronAPI.getPlatform();
    }
    // 浏览器环境降级
    return navigator.userAgent;
  }
};

// 通知
export const notificationAPI = {
  show: async (title: string, body: string): Promise<void> => {
    if (isElectron()) {
      return window.electronAPI.showNotification(title, body);
    }
    // 浏览器环境降级
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body });
        }
      });
    }
  }
};

// 导出所有 API
export const nativeAPI = {
  clipboard: clipboardAPI,
  file: fileAPI,
  system: systemAPI,
  notification: notificationAPI
};

export default nativeAPI;
