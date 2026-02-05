/**
 * AA账单数据存储服务
 */

import { nativeAPI } from './nativeAPI';
import { getToolStoragePath } from './appConfig';

const storageConfig = getToolStoragePath('splitBill')!;
const STORAGE_PATH = storageConfig.subPath;
const STORAGE_FILE = storageConfig.fileName;

// 参与者
export interface Participant {
  id: string;
  name: string;
}

// 账单记录
export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  splitAmong: string[];
  createdAt: number;
}

// 账本
export interface Ledger {
  id: string;
  name: string;
  participants: Participant[];
  expenses: Expense[];
  createdAt: number;
}

// 数据存储类型
export interface SplitBillData {
  ledgers: Ledger[];
  currentLedgerId: string;
}

export const splitBillStorage = {
  // 读取数据
  async getData(): Promise<SplitBillData> {
    return await nativeAPI.storage.load(STORAGE_PATH, STORAGE_FILE, { ledgers: [], currentLedgerId: '' });
  },

  // 保存数据
  async saveData(data: SplitBillData): Promise<void> {
    await nativeAPI.storage.save(STORAGE_PATH, STORAGE_FILE, data);
  },

  // 获取所有账本
  async getLedgers(): Promise<Ledger[]> {
    const data = await this.getData();
    return data.ledgers || [];
  },

  // 获取当前账本ID
  async getCurrentLedgerId(): Promise<string> {
    const data = await this.getData();
    return data.currentLedgerId || '';
  },

  // 保存账本列表
  async saveLedgers(ledgers: Ledger[]): Promise<void> {
    const data = await this.getData();
    data.ledgers = ledgers;
    await this.saveData(data);
  },

  // 保存当前账本ID
  async saveCurrentLedgerId(id: string): Promise<void> {
    const data = await this.getData();
    data.currentLedgerId = id;
    await this.saveData(data);
  },

  // 创建账本
  async createLedger(name: string): Promise<Ledger> {
    const data = await this.getData();
    const ledger: Ledger = {
      id: Date.now().toString(),
      name,
      participants: [],
      expenses: [],
      createdAt: Date.now()
    };
    data.ledgers.push(ledger);
    await this.saveData(data);
    return ledger;
  },

  // 更新账本
  async updateLedger(id: string, updates: Partial<Ledger>): Promise<void> {
    const data = await this.getData();
    const index = data.ledgers.findIndex(l => l.id === id);
    if (index !== -1) {
      data.ledgers[index] = { ...data.ledgers[index], ...updates };
      await this.saveData(data);
    }
  },

  // 删除账本
  async deleteLedger(id: string): Promise<void> {
    const data = await this.getData();
    data.ledgers = data.ledgers.filter(l => l.id !== id);
    if (data.currentLedgerId === id) {
      data.currentLedgerId = data.ledgers.length > 0 ? data.ledgers[0].id : '';
    }
    await this.saveData(data);
  },

  // 重命名账本
  async renameLedger(id: string, name: string): Promise<void> {
    await this.updateLedger(id, { name });
  }
};

export default splitBillStorage;
