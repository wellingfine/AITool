/**
 * 工作跟进数据存储服务
 */

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
  tags: string[];
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
  createdAt: string;
}

// 数据存储类型
export interface WorkTrackerData {
  tags: Tag[];
  projects: WorkProject[];
  records: WorkRecord[];
}

const STORAGE_KEY = 'workTrackerData';
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
  getData(): WorkTrackerData {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        // 兼容旧版本数据结构（从 items 迁移到 projects 和 records）
        if (parsed.items && !parsed.projects) {
          console.log('检测到旧版本数据结构，正在迁移...');
          // 将旧的 items 转换为项目和记录
          const projects: WorkProject[] = [];
          const records: WorkRecord[] = [];

          parsed.items.forEach((item: any) => {
            // 为每个事项创建一个项目
            const project: WorkProject = {
              id: item.id,
              name: item.title,
              tags: item.tags || [],
              createdAt: item.createdAt,
              updatedAt: item.updatedAt
            };
            projects.push(project);

            // 将事项内容作为记录
            const record: WorkRecord = {
              id: `${item.id}_record`,
              projectId: item.id,
              content: item.content,
              images: item.images || [],
              isTodo: item.isTodo || false,
              isDone: item.isDone || false,
              createdAt: item.createdAt
            };
            records.push(record);
          });

          // 更新数据结构
          parsed.projects = projects;
          parsed.records = records;
          delete parsed.items;

          // 保存迁移后的数据
          this.saveData(parsed);
          console.log('数据迁移完成');
        }

        return parsed;
      }
    } catch (error) {
      console.error('读取工作跟进数据失败:', error);
    }
    return {
      tags: [],
      projects: [],
      records: []
    };
  },

  // 保存数据
  saveData(data: WorkTrackerData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('保存工作跟进数据失败:', error);
    }
  },

  // 添加标签
  addTag(name: string, color: string): Tag {
    const data = this.getData();
    if (data.tags.length >= 10) {
      throw new Error('最多只能添加10个标签');
    }
    const tag: Tag = {
      id: Date.now().toString(),
      name,
      color
    };
    data.tags.push(tag);
    this.saveData(data);
    return tag;
  },

  // 更新标签
  updateTag(id: string, name: string, color: string): void {
    const data = this.getData();
    const index = data.tags.findIndex(t => t.id === id);
    if (index !== -1) {
      data.tags[index] = { ...data.tags[index], name, color };
      this.saveData(data);
    }
  },

  // 删除标签
  deleteTag(id: string): void {
    const data = this.getData();
    data.tags = data.tags.filter(t => t.id !== id);
    // 同时从项目中移除该标签
    if (data.projects) {
      data.projects.forEach(project => {
        project.tags = project.tags.filter(t => t !== id);
      });
    }
    this.saveData(data);
  },

  // 获取所有标签
  getTags(): Tag[] {
    return this.getData().tags;
  },

  // 添加跟进任务
  addProject(name: string, tags: string[]): WorkProject {
    const data = this.getData();
    const project: WorkProject = {
      id: Date.now().toString(),
      name,
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (!data.projects) {
      data.projects = [];
    }
    data.projects.unshift(project);
    this.saveData(data);
    return project;
  },

  // 更新跟进任务
  updateProject(id: string, updates: Partial<WorkProject>): void {
    const data = this.getData();
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
      this.saveData(data);
    }
  },

  // 删除跟进任务
  deleteProject(id: string): void {
    const data = this.getData();
    if (!data.projects) {
      data.projects = [];
    }
    if (!data.records) {
      data.records = [];
    }
    data.projects = data.projects.filter(p => p.id !== id);
    // 同时删除该项目的所有记录
    data.records = data.records.filter(r => r.projectId !== id);
    this.saveData(data);
  },

  // 获取所有跟进任务
  getProjects(): WorkProject[] {
    return this.getData().projects || [];
  },

  // 获取跟进任务详情
  getProject(id: string): WorkProject | undefined {
    return (this.getData().projects || []).find(p => p.id === id);
  },

  // 添加记录
  addRecord(projectId: string, content: string, images: string[], isTodo: boolean): WorkRecord {
    const data = this.getData();
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
      createdAt: new Date().toISOString()
    };
    data.records.push(record);
    // 更新项目的更新时间
    const projectIndex = data.projects.findIndex(p => p.id === projectId);
    if (projectIndex !== -1) {
      data.projects[projectIndex].updatedAt = new Date().toISOString();
    }
    this.saveData(data);
    return record;
  },

  // 更新记录
  updateRecord(id: string, updates: Partial<WorkRecord>): void {
    const data = this.getData();
    if (!data.records) {
      data.records = [];
    }
    const index = data.records.findIndex(r => r.id === id);
    if (index !== -1) {
      data.records[index] = {
        ...data.records[index],
        ...updates
      };
      this.saveData(data);
    }
  },

  // 删除记录
  deleteRecord(id: string): void {
    const data = this.getData();
    if (!data.records) {
      data.records = [];
    }
    data.records = data.records.filter(r => r.id !== id);
    this.saveData(data);
  },

  // 获取项目的所有记录
  getProjectRecords(projectId: string): WorkRecord[] {
    const data = this.getData();
    return (data.records || []).filter(r => r.projectId === projectId);
  },

  // 获取所有记录
  getRecords(): WorkRecord[] {
    return this.getData().records || [];
  },

  // 按标签筛选项目
  getProjectsByTag(tagId: string): WorkProject[] {
    return this.getProjects().filter(p => p.tags.includes(tagId));
  },

  // 获取项目的待办记录
  getProjectTodoRecords(projectId: string): WorkRecord[] {
    return this.getProjectRecords(projectId).filter(r => r.isTodo && !r.isDone);
  },

  // 获取所有待办记录
  getTodoRecords(): WorkRecord[] {
    return this.getRecords().filter(r => r.isTodo && !r.isDone);
  },

  // 获取可用颜色
  getTagColors(): string[] {
    return TAG_COLORS;
  },

  // 导出数据到文件
  async exportToFile(): Promise<void> {
    const data = this.getData();
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
