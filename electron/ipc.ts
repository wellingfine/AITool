import { app, ipcMain, clipboard, dialog } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

// 配置文件路径
const configFilePath = path.join(app.getPath('userData'), 'config.json');

// 默认数据存储路径
let dataPath: string = path.join(app.getPath('userData'), 'data');

// 加载配置
async function loadConfig() {
  try {
    const configData = await fs.readFile(configFilePath, 'utf-8');
    const config = JSON.parse(configData);
    if (config.dataPath) {
      dataPath = config.dataPath;
    }
  } catch (error) {
    // 配置文件不存在，使用默认值
    console.log('配置文件不存在，使用默认数据路径');
  }
}

// 保存配置
async function saveConfig() {
  try {
    const config = { dataPath };
    await fs.writeFile(configFilePath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('保存配置失败:', error);
  }
}

// 初始化时加载配置
loadConfig();

// IPC 通信处理

// 获取平台信息
ipcMain.handle('get-platform', async () => {
  return process.platform;
});

// 选择文件
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

// 保存文件
ipcMain.handle('save-file', async (event, content: string) => {
  const result = await dialog.showSaveDialog({
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return false;
  }

  try {
    await fs.writeFile(result.filePath, content, 'utf-8');
    return true;
  } catch (error) {
    console.error('保存文件失败:', error);
    return false;
  }
});

// 读取剪贴板
ipcMain.handle('read-clipboard', async () => {
  return clipboard.readText();
});

// 写入剪贴板
ipcMain.handle('write-clipboard', async (event, text: string) => {
  clipboard.writeText(text);
});

// 显示通知
ipcMain.handle('show-notification', async (event, title: string, body: string) => {
  if (process.platform === 'win32') {
    const { Notification } = await import('electron');
    new Notification({ title, body }).show();
  }
});

// 获取数据存储路径
ipcMain.handle('get-data-path', async () => {
  return dataPath;
});

// 设置数据存储路径
ipcMain.handle('set-data-path', async (event, newPath: string) => {
  try {
    // 验证路径是否存在，不存在则创建
    try {
      await fs.access(newPath);
    } catch {
      await fs.mkdir(newPath, { recursive: true });
    }
    dataPath = newPath;
    // 保存到配置文件
    await saveConfig();
    return true;
  } catch (error) {
    console.error('设置数据路径失败:', error);
    throw error;
  }
});

// 选择文件夹
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

// 读取 worktracker 数据文件
ipcMain.handle('read-worktracker-data', async () => {
  try {
    // 确保 worktracker 目录存在
    const worktrackerDir = path.join(dataPath, 'worktracker');
    const dataFile = path.join(worktrackerDir, 'data.json');

    // 创建目录（如果不存在）
    try {
      await fs.mkdir(worktrackerDir, { recursive: true });
    } catch (error) {
      // 目录已存在，忽略错误
    }

    // 读取数据文件
    const data = await fs.readFile(dataFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // 文件不存在或其他错误，返回空数据
    console.log('读取 worktracker 数据失败，使用空数据:', error);
    return {
      tags: [],
      projects: [],
      records: []
    };
  }
});

// 保存 worktracker 数据文件
ipcMain.handle('save-worktracker-data', async (event, data: any) => {
  try {
    // 确保 worktracker 目录存在
    const worktrackerDir = path.join(dataPath, 'worktracker');
    await fs.mkdir(worktrackerDir, { recursive: true });

    const dataFile = path.join(worktrackerDir, 'data.json');
    await fs.writeFile(dataFile, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('保存 worktracker 数据失败:', error);
    throw error;
  }
});
