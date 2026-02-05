/**
 * 天倒计时数据存储服务
 */

import { nativeAPI } from './nativeAPI';

// 倒计时事件类型
export interface CountdownEvent {
  id: string;
  title: string;
  targetDate: string; // ISO 8601 格式日期字符串
  color: string;
  createdAt: string;
}

// 数据存储类型
export interface DayCountdownData {
  events: CountdownEvent[];
}

const DEFAULT_COLORS = [
  '#f5222d', // 红色
  '#fa8c16', // 橙色
  '#faad14', // 金色
  '#52c41a', // 绿色
  '#13c2c2', // 青色
  '#1890ff', // 蓝色
  '#722ed1', // 紫色
  '#eb2f96', // 粉色
];

export const dayCountdownStorage = {
  // 读取数据
  async getData(): Promise<DayCountdownData> {
    try {
      const data = await nativeAPI.daycountdown.readData();
      return data;
    } catch (error) {
      console.error('读取倒计时数据失败:', error);
    }
    return {
      events: []
    };
  },

  // 保存数据
  async saveData(data: DayCountdownData): Promise<void> {
    try {
      await nativeAPI.daycountdown.saveData(data);
    } catch (error) {
      console.error('保存倒计时数据失败:', error);
      throw error;
    }
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
    // 按目标日期排序
    return data.events.sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
  },

  // 计算剩余天数
  calculateDaysLeft(targetDate: string): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  },

  // 获取可用颜色
  getColors(): string[] {
    return DEFAULT_COLORS;
  }
};

export default dayCountdownStorage;
