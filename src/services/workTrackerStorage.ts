/**
 * 任务跟进数据存储服务
 */

import { nativeAPI } from './nativeAPI';

const STORAGE_PATH = 'worktracker';
const STORAGE_FILE = 'data';

// 标签类型
export interface Tag {
  id: string;
  name: string;
  color: string;
}

// 跟进任务（工作项目）类型
export interface WorkProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// 记录类型
export interface WorkRecord {
  id: string;
  projectId: string;
  content: string;
  images: string[];
  isTodo: boolean;
  isDone: boolean;
  tags: string[];
  createdAt: string;
}

// 数据存储类型
export interface WorkTrackerData {
  tags: Tag[];
  projects: WorkProject[];
  records: WorkRecord[];
}

const TAG_COLORS = [
  '#f5222d', // 红色
  '#fa8c16', // 橙色
  '#faad14', // 金色
  '#52c41a', // 绿色
  '#13c2c2', // 青色
  '#1890ff', // 蓝色
  '#722ed1', // 紫色
  '#eb2f96', // 粉色
  '#607d8b', // 灰色
  '#fa541c', // 深橙色
];

export const workTrackerStorage = {
  // 读取数据
  async getData(): Promise<WorkTrackerData> {
    try {
      const data = await nativeAPI.storage.load(STORAGE_PATH, STORAGE_FILE, { tags: [], projects: [], records: [] });

      // 兼容旧版本数据结构（从 items 迁移到 projects 和 records）
      if (data.items && !data.projects) {
        console.log('检测到旧版本数据结构，正在迁移...');
        // 将旧的 items 转换为项目和记录
        const projects: WorkProject[] = [];
        const records: WorkRecord[] = [];

        data.items.forEach((item: any) => {
          // 为每个事项创建一个项目
          const project: WorkProject = {
            id: item.id,
            name: item.title,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt
          };
          projects.push(project);

          // 将事项内容作为记录，tags 从 item 迁移到 record
          const record: WorkRecord = {
            id: `${item.id}_record`,
            projectId: item.id,
            content: item.content,
            images: item.images || [],
            isTodo: item.isTodo || false,
            isDone: item.isDone || false,
            tags: item.tags || [],
            createdAt: item.createdAt
          };
          records.push(record);
        });

        // 更新数据结构
        data.projects = projects;
        data.records = records;
        delete data.items;

        // 保存迁移后的数据
        await this.saveData(data);
        console.log('数据迁移完成');
      }

      // 迁移项目的 tags 到记录（从旧结构迁移到新结构）
      if (data.projects && data.projects.length > 0 && data.projects[0].tags !== undefined) {
        console.log('检测到任务标签，正在迁移到记录...');
        data.projects.forEach((project: any) => {
          if (project.tags && project.tags.length > 0) {
            // 将任务的标签移到该任务的所有记录上
            const projectRecords = data.records.filter((r: WorkRecord) => r.projectId === project.id);
            projectRecords.forEach((record: WorkRecord) => {
              if (!record.tags) record.tags = [];
              // 合并标签，避免重复
              record.tags = [...new Set([...record.tags, ...project.tags])];
            });
            // 清空项目的标签
            delete project.tags;
          }
        });
        await this.saveData(data);
        console.log('任务标签迁移完成');
      }

      return data;
    } catch (error) {
      console.error('读取任务跟进数据失败:', error);
    }
    return {
      tags: [],
      projects: [],
      records: []
    };
  },

  // 保存数据
  async saveData(data: WorkTrackerData): Promise<void> {
    try {
      await nativeAPI.storage.save(STORAGE_PATH, STORAGE_FILE, data);
    } catch (error) {
      console.error('保存任务跟进数据失败:', error);
      throw error;
    }
  },

  // 添加标签
  async addTag(name: string, color: string): Promise<Tag> {
    const data = await this.getData();
    if (data.tags.length >= 10) {
      throw new Error('最多只能添加10个标签');
    }
    const tag: Tag = {
      id: Date.now().toString(),
      name,
      color
    };
    data.tags.push(tag);
    await this.saveData(data);
    return tag;
  },

  // 更新标签
  async updateTag(id: string, name: string, color: string): Promise<void> {
    const data = await this.getData();
    const index = data.tags.findIndex(t => t.id === id);
    if (index !== -1) {
      data.tags[index] = { ...data.tags[index], name, color };
      await this.saveData(data);
    }
  },

  // 删除标签
  async deleteTag(id: string): Promise<void> {
    const data = await this.getData();
    data.tags = data.tags.filter(t => t.id !== id);
    // 同时从记录中移除该标签
    if (data.records) {
      data.records.forEach(record => {
        if (record.tags) {
          record.tags = record.tags.filter(t => t !== id);
        }
      });
    }
    await this.saveData(data);
  },

  // 获取所有标签
  async getTags(): Promise<Tag[]> {
    return (await this.getData()).tags;
  },

  // 添加跟进任务
  async addProject(name: string): Promise<WorkProject> {
    const data = await this.getData();
    const project: WorkProject = {
      id: Date.now().toString(),
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (!data.projects) {
      data.projects = [];
    }
    data.projects.unshift(project);
    await this.saveData(data);
    return project;
  },

  // 更新跟进任务
  async updateProject(id: string, updates: Partial<WorkProject>): Promise<void> {
    const data = await this.getData();
    if (!data.projects) {
      data.projects = [];
    }
    const index = data.projects.findIndex(p => p.id === id);
    if (index !== -1) {
      data.projects[index] = {
        ...data.projects[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      await this.saveData(data);
    }
  },

  // 删除跟进任务
  async deleteProject(id: string): Promise<void> {
    const data = await this.getData();
    if (!data.projects) {
      data.projects = [];
    }
    if (!data.records) {
      data.records = [];
    }
    data.projects = data.projects.filter(p => p.id !== id);
    // 同时删除该项目的所有记录
    data.records = data.records.filter(r => r.projectId !== id);
    await this.saveData(data);
  },

  // 获取所有跟进任务
  async getProjects(): Promise<WorkProject[]> {
    return (await this.getData()).projects || [];
  },

  // 获取跟进任务详情
  async getProject(id: string): Promise<WorkProject | undefined> {
    return ((await this.getData()).projects || []).find(p => p.id === id);
  },

  // 添加记录
  async addRecord(projectId: string, content: string, images: string[], isTodo: boolean, tags: string[] = []): Promise<WorkRecord> {
    const data = await this.getData();
    if (!data.records) {
      data.records = [];
    }
    if (!data.projects) {
      data.projects = [];
    }
    const record: WorkRecord = {
      id: Date.now().toString(),
      projectId,
      content,
      images,
      isTodo,
      isDone: false,
      tags,
      createdAt: new Date().toISOString()
    };
    data.records.push(record);
    // 更新项目的更新时间
    const projectIndex = data.projects.findIndex(p => p.id === projectId);
    if (projectIndex !== -1) {
      data.projects[projectIndex].updatedAt = new Date().toISOString();
    }
    await this.saveData(data);
    return record;
  },

  // 更新记录
  async updateRecord(id: string, updates: Partial<WorkRecord>): Promise<void> {
    const data = await this.getData();
    if (!data.records) {
      data.records = [];
    }
    const index = data.records.findIndex(r => r.id === id);
    if (index !== -1) {
      data.records[index] = {
        ...data.records[index],
        ...updates
      };
      await this.saveData(data);
    }
  },

  // 删除记录
  async deleteRecord(id: string): Promise<void> {
    const data = await this.getData();
    if (!data.records) {
      data.records = [];
    }
    data.records = data.records.filter(r => r.id !== id);
    await this.saveData(data);
  },

  // 获取项目的所有记录
  async getProjectRecords(projectId: string): Promise<WorkRecord[]> {
    const data = await this.getData();
    return (data.records || []).filter(r => r.projectId === projectId);
  },

  // 获取所有记录
  async getRecords(): Promise<WorkRecord[]> {
    return (await this.getData()).records || [];
  },

  // 按标签筛选记录
  async getRecordsByTag(tagId: string): Promise<WorkRecord[]> {
    const records = await this.getRecords();
    return records.filter(r => r.tags && r.tags.includes(tagId));
  },

  // 按标签筛选项目（返回包含该标签记录的项目）
  async getProjectsByTag(tagId: string): Promise<WorkProject[]> {
    const records = await this.getRecordsByTag(tagId);
    const projectIds = [...new Set(records.map(r => r.projectId))];
    const projects = await this.getProjects();
    return projects.filter(p => projectIds.includes(p.id));
  },

  // 获取项目的待办记录
  async getProjectTodoRecords(projectId: string): Promise<WorkRecord[]> {
    return (await this.getProjectRecords(projectId)).filter(r => r.isTodo && !r.isDone);
  },

  // 获取所有待办记录
  async getTodoRecords(): Promise<WorkRecord[]> {
    return (await this.getRecords()).filter(r => r.isTodo && !r.isDone);
  },

  // 获取可用颜色
  getTagColors(): string[] {
    return TAG_COLORS;
  },

  // 导出数据到文件
  async exportToFile(): Promise<void> {
    const data = await this.getData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `work-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

export default workTrackerStorage;
