/**
 * 图标映射服务
 * 将配置中的图标名称映射到实际的 Ant Design 图标组件
 */

import {
  AppstoreOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  LockOutlined,
  NumberOutlined,
  PictureOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  SwapOutlined,
  ToolOutlined,
  HeartOutlined,
  DeleteOutlined,
  CalendarOutlined,
  CalculatorOutlined,
  FontColorsOutlined,
  ExperimentOutlined,
  PlusCircleOutlined,
  AimOutlined,
  CustomerServiceOutlined,
  AccountBookOutlined,
  HourglassOutlined,
  BookOutlined,
  FolderOutlined,
  SaveOutlined,
  HistoryOutlined,
  DownOutlined,
  EditOutlined,
  UserAddOutlined,
  DollarOutlined,
  InfoCircleOutlined,
  GithubOutlined,
  CodeOutlined,
} from '@ant-design/icons';

// 图标映射表
const iconMap: Record<string, React.ComponentType<any>> = {
  AppstoreOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  LockOutlined,
  NumberOutlined,
  PictureOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  SwapOutlined,
  ToolOutlined,
  HeartOutlined,
  DeleteOutlined,
  CalendarOutlined,
  CalculatorOutlined,
  FontColorsOutlined,
  ExperimentOutlined,
  PlusCircleOutlined,
  AimOutlined,
  CustomerServiceOutlined,
  AccountBookOutlined,
  HourglassOutlined,
  BookOutlined,
  FolderOutlined,
  SaveOutlined,
  HistoryOutlined,
  DownOutlined,
  EditOutlined,
  UserAddOutlined,
  DollarOutlined,
  InfoCircleOutlined,
  GithubOutlined,
  CodeOutlined,
};

// 根据名称获取图标组件
export const getIconByName = (name: string): React.ComponentType<any> | null => {
  return iconMap[name] || null;
};

// 创建图标元素
export const createIcon = (name: string, props?: any): React.ReactNode => {
  const IconComponent = getIconByName(name);
  if (!IconComponent) return null;
  return React.createElement(IconComponent, props);
};

import React from 'react';

export default iconMap;
