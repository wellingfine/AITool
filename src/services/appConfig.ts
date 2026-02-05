/**
 * 应用配置服务
 * 统一管理所有工具的配置信息
 */

import appConfig from '../../app.config.json';

// 存储配置
export interface StorageConfig {
  path: string;
  file: string;
}

// 工具配置
export interface ToolConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  categoryName: string;
  categoryIcon: string;
  storage: StorageConfig | null;
  component: string;
}

// 应用配置
export interface AppConfig {
  tools: ToolConfig[];
}

// 获取所有工具配置
export const getTools = (): ToolConfig[] => {
  return appConfig.tools;
};

// 根据ID获取工具配置
export const getToolById = (id: string): ToolConfig | undefined => {
  return appConfig.tools.find(tool => tool.id === id);
};

// 获取所有分类
export const getCategories = (): { id: string; name: string; icon: string }[] => {
  const categories = new Map<string, { id: string; name: string; icon: string }>();
  appConfig.tools.forEach(tool => {
    if (!categories.has(tool.category)) {
      categories.set(tool.category, {
        id: tool.category,
        name: tool.categoryName,
        icon: tool.categoryIcon
      });
    }
  });
  return Array.from(categories.values());
};

// 获取分类下的所有工具
export const getToolsByCategory = (categoryId: string): ToolConfig[] => {
  return appConfig.tools.filter(tool => tool.category === categoryId);
};

// 获取需要存储的工具
export const getToolsWithStorage = (): ToolConfig[] => {
  return appConfig.tools.filter(tool => tool.storage !== null);
};

// 获取工具的存储配置
export const getToolStorage = (toolId: string): StorageConfig | null => {
  const tool = getToolById(toolId);
  return tool?.storage ?? null;
};

// 获取工具的存储路径（完整路径）
export const getToolStoragePath = (toolId: string): { subPath: string; fileName: string } | null => {
  const storage = getToolStorage(toolId);
  if (!storage) return null;
  return {
    subPath: storage.path,
    fileName: storage.file
  };
};

export default appConfig as AppConfig;
