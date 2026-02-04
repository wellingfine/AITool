/**
 * 通用工具函数库
 */

/**
 * 检测是否为 Android 环境
 * @returns 是否为 Android 设备
 */
export const isAndroid = (): boolean => {
  return /Android/i.test(navigator.userAgent);
};

/**
 * 检测是否为 iOS 环境
 * @returns 是否为 iOS 设备
 */
export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/i.test(navigator.userAgent);
};

/**
 * 检测是否为移动端环境
 * @returns 是否为移动设备
 */
export const isMobile = (): boolean => {
  return isAndroid() || isIOS() || /Mobile|webOS/i.test(navigator.userAgent);
};

/**
 * 检测是否为 Tauri 环境
 * @returns 是否在 Tauri 应用中运行
 */
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && !!(window as unknown as { __TAURI__?: unknown }).__TAURI__;
};

/**
 * 检测是否为桌面端环境
 * @returns 是否为桌面设备
 */
export const isDesktop = (): boolean => {
  return !isMobile();
};
