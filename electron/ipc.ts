import { app, ipcMain, clipboard, dialog } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

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
