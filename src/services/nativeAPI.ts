/**
 * 本地能力封装接口
 *
 * 注意：此模块为本地能力提供统一接口
 * 在浏览器环境中会自动降级处理，确保应用可以在浏览器中独立运行
 */

import { invoke } from '@tauri-apps/api/core';
import { platform } from '@tauri-apps/plugin-os';
import { open } from '@tauri-apps/plugin-dialog';
import { save } from '@tauri-apps/plugin-dialog';

// 检测运行环境
const isTauri = () => {
  return typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined;
};

// 剪贴板操作
export const clipboardAPI = {
  read: async (): Promise<string> => {
    if (isTauri()) {
      try {
        return await navigator.clipboard.readText();
      } catch (error) {
        console.warn('剪贴板读取失败:', error);
        return '';
      }
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
    if (isTauri()) {
      try {
        await navigator.clipboard.writeText(text);
      } catch (error) {
        console.warn('剪贴板写入失败:', error);
      }
      return;
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
    if (isTauri()) {
      try {
        const result = await open({
          multiple: false,
          directory: false,
        });
        return result as string | null;
      } catch (error) {
        console.warn('选择文件失败:', error);
        return null;
      }
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
      input.click();
    });
  },

  saveFile: async (content: string, filename: string = 'download.txt'): Promise<boolean> => {
    if (isTauri()) {
      try {
        const result = await save({
          defaultPath: filename,
        });
        if (result) {
          // 使用 Tauri 的 fs 插件写入文件
          const { writeTextFile } = await import('@tauri-apps/plugin-fs');
          await writeTextFile(result, content);
          return true;
        }
        return false;
      } catch (error) {
        console.warn('保存文件失败:', error);
        return false;
      }
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
    if (isTauri()) {
      try {
        return platform();
      } catch (error) {
        console.warn('获取平台信息失败:', error);
        return navigator.userAgent;
      }
    }
    // 浏览器环境降级
    return navigator.userAgent;
  }
};

// 通知
export const notificationAPI = {
  show: async (title: string, body: string): Promise<void> => {
    if (isTauri()) {
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
        console.warn('发送通知失败:', error);
      }
      return;
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

// 配置管理
export const configAPI = {
  getDataPath: async (): Promise<string> => {
    if (isTauri()) {
      try {
        return await invoke('get_data_path');
      } catch (error) {
        console.warn('获取数据路径失败:', error);
        return '';
      }
    }
    // 浏览器环境降级 - 使用 localStorage
    const path = localStorage.getItem('dataPath');
    return path || '';
  },

  setDataPath: async (path: string): Promise<void> => {
    if (isTauri()) {
      try {
        await invoke('set_data_path', { newPath: path });
      } catch (error) {
        console.warn('设置数据路径失败:', error);
        throw error;
      }
      return;
    }
    // 浏览器环境降级 - 使用 localStorage
    localStorage.setItem('dataPath', path);
  }
};

// 对话框
export const dialogAPI = {
  selectFolder: async (): Promise<string | null> => {
    if (isTauri()) {
      try {
        const result = await open({
          directory: true,
          multiple: false,
        });
        return result as string | null;
      } catch (error) {
        console.warn('选择文件夹失败:', error);
        return null;
      }
    }
    // 浏览器环境降级
    return null;
  }
};

// worktracker 数据存储
export const worktrackerAPI = {
  readData: async (): Promise<any> => {
    if (isTauri()) {
      try {
        return await invoke('read_worktracker_data');
      } catch (error) {
        console.warn('读取 worktracker 数据失败:', error);
        return {
          tags: [],
          projects: [],
          records: []
        };
      }
    }
    // 浏览器环境降级 - 使用 localStorage
    try {
      const data = localStorage.getItem('workTrackerData');
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('读取数据失败:', error);
    }
    return {
      tags: [],
      projects: [],
      records: []
    };
  },

  saveData: async (data: any): Promise<void> => {
    if (isTauri()) {
      try {
        await invoke('save_worktracker_data', { data });
      } catch (error) {
        console.error('保存 worktracker 数据失败:', error);
        throw error;
      }
      return;
    }
    // 浏览器环境降级 - 使用 localStorage
    try {
      localStorage.setItem('workTrackerData', JSON.stringify(data));
    } catch (error) {
      console.error('保存数据失败:', error);
      throw error;
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
