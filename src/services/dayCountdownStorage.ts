/**
 * 天倒计时数据存储服务
 */

import { nativeAPI } from './nativeAPI';

const STORAGE_PATH = 'daycountdown';
const STORAGE_FILE = 'data';

// 倒计时事件类型
export interface CountdownEvent {
  id: string;
  title: string;
  targetDate: string;
  color: string;
  createdAt: string;
}

// 数据存储类型
export interface DayCountdownData {
  events: CountdownEvent[];
}

const DEFAULT_COLORS = [
  '#f5222d', '#fa8c16', '#faad14', '#52c41a',
  '#13c2c2', '#1890ff', '#722ed1', '#eb2f96',
];

export const dayCountdownStorage = {
  // 读取数据
  async getData(): Promise<DayCountdownData> {
    return await nativeAPI.storage.load(STORAGE_PATH, STORAGE_FILE, { events: [] });
  },

  // 保存数据
  async saveData(data: DayCountdownData): Promise<void> {
    await nativeAPI.storage.save(STORAGE_PATH, STORAGE_FILE, data);
  },

  // 添加倒计时事件
  async addEvent(title: string, targetDate: string, color?: string): Promise<CountdownEvent> {
    const data = await this.getData();
    const event: CountdownEvent = {
      id: Date.now().toString(),
      title,
      targetDate,
      color: color || DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
      createdAt: new Date().toISOString()
    };
    data.events.push(event);
    await this.saveData(data);
    return event;
  },

  // 更新倒计时事件
  async updateEvent(id: string, updates: Partial<Omit<CountdownEvent, 'id' | 'createdAt'>>): Promise<void> {
    const data = await this.getData();
    const index = data.events.findIndex(e => e.id === id);
    if (index !== -1) {
      data.events[index] = { ...data.events[index], ...updates };
      await this.saveData(data);
    }
  },

  // 删除倒计时事件
  async deleteEvent(id: string): Promise<void> {
    const data = await this.getData();
    data.events = data.events.filter(e => e.id !== id);
    await this.saveData(data);
  },

  // 获取所有事件
  async getEvents(): Promise<CountdownEvent[]> {
    const data = await this.getData();
    return data.events.sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
  },

  // 计算剩余天数
  calculateDaysLeft(targetDate: string): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  // 获取可用颜色
  getColors(): string[] {
    return DEFAULT_COLORS;
  }
};

export default dayCountdownStorage;
