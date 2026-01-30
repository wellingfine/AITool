/**
 * 本地能力封装接口
 * 提供统一的本地 API 调用，支持 Tauri 桌面端和浏览器降级方案
 */

import { invoke } from '@tauri-apps/api/core';

// 剪贴板操作
export const clipboardAPI = {
  read: async (): Promise<string> => {
    try {
      return await navigator.clipboard.readText();
    } catch (error) {
      console.warn('剪贴板读取失败:', error);
      return '';
    }
  },

  write: async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.warn('剪贴板写入失败:', error);
    }
  }
};

// 文件操作
export const fileAPI = {
  selectFile: async (): Promise<string | null> => {
    try {
      return await invoke<string | null>('select_file');
    } catch (error) {
      console.error('选择文件失败:', error);
      // 浏览器环境降级
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '*/*';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          resolve(file ? file.name : null);
        };
        input.click();
      });
    }
  },

  saveFile: async (content: string, filename: string = 'download.txt'): Promise<boolean> => {
    try {
      return await invoke<boolean>('save_file', { content });
    } catch (error) {
      console.error('保存文件失败:', error);
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
      } catch (e) {
        console.warn('浏览器文件保存失败:', e);
        return false;
      }
    }
  }
};

// 系统信息
export const systemAPI = {
  getPlatform: async (): Promise<string> => {
    try {
      return await invoke('get_platform');
    } catch (error) {
      return navigator.userAgent;
    }
  }
};

// 通知
export const notificationAPI = {
  show: async (title: string, body: string): Promise<void> => {
    try {
      const { isPermissionGranted, requestPermission, sendNotification } = await import('@tauri-apps/plugin-notification');
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }
      if (permissionGranted) {
        sendNotification({ title, body });
      }
    } catch (error) {
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
  }
};

// 配置管理
export const configAPI = {
  getDataPath: async (): Promise<string> => {
    try {
      return await invoke<string>('get_data_path');
    } catch (error) {
      // 降级到 localStorage
      return localStorage.getItem('dataPath') || '';
    }
  },

  setDataPath: async (path: string): Promise<void> => {
    try {
      await invoke('set_data_path', { newPath: path });
    } catch (error) {
      // 降级到 localStorage
      localStorage.setItem('dataPath', path);
    }
  }
};

// 对话框
export const dialogAPI = {
  selectFolder: async (): Promise<string | null> => {
    try {
      return await invoke<string | null>('select_folder');
    } catch (error) {
      console.error('选择文件夹失败:', error);
      return null;
    }
  }
};

// worktracker 数据存储
export const worktrackerAPI = {
  readData: async (): Promise<any> => {
    try {
      return await invoke('read_worktracker_data');
    } catch (error) {
      // 降级到 localStorage
      try {
        const data = localStorage.getItem('workTrackerData');
        if (data) return JSON.parse(data);
      } catch (e) {
        console.error('读取 localStorage 失败:', e);
      }
      return { tags: [], projects: [], records: [] };
    }
  },

  saveData: async (data: any): Promise<void> => {
    try {
      await invoke('save_worktracker_data', { data });
    } catch (error) {
      // 降级到 localStorage
      try {
        localStorage.setItem('workTrackerData', JSON.stringify(data));
      } catch (e) {
        console.error('保存到 localStorage 失败:', e);
        throw e;
      }
    }
  }
};

// 导出所有 API
export const nativeAPI = {
  clipboard: clipboardAPI,
  file: fileAPI,
  system: systemAPI,
  notification: notificationAPI,
  config: configAPI,
  dialog: dialogAPI,
  worktracker: worktrackerAPI
};

export default nativeAPI;
