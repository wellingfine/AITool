//! 通用系统功能 Controller
//! 
//! 提供系统平台信息、剪贴板操作、通知等通用功能

use serde::{Deserialize, Serialize};

/// 获取当前系统平台信息
/// 
/// # Returns
/// 返回系统平台名称，如 "windows", "macos", "linux", "android", "ios"
#[tauri::command]
pub fn get_platform() -> String {
    tauri_plugin_os::platform().to_string()
}

/// 剪贴板内容结构
#[derive(Serialize, Deserialize, Debug)]
pub struct ClipboardContent {
    pub text: String,
}

/// 读取系统剪贴板文本内容
/// 
/// # Returns
/// 返回剪贴板中的文本内容，如果失败返回错误信息
#[tauri::command]
pub async fn read_clipboard() -> Result<String, String> {
    // TODO: 实现剪贴板读取功能
    // 目前返回空字符串作为占位
    Ok(String::new())
}

/// 写入文本到系统剪贴板
/// 
/// # Arguments
/// * `text` - 要写入剪贴板的文本
/// 
/// # Returns
/// 成功返回 Ok(()), 失败返回错误信息
#[tauri::command]
pub async fn write_clipboard(text: String) -> Result<(), String> {
    // TODO: 实现剪贴板写入功能
    // 目前仅返回成功作为占位
    let _ = text;
    Ok(())
}

/// 显示系统通知
/// 
/// # Arguments
/// * `title` - 通知标题
/// * `body` - 通知内容
/// 
/// # Returns
/// 成功返回 Ok(()), 失败返回错误信息
#[tauri::command]
pub async fn show_notification(title: String, body: String) -> Result<(), String> {
    // TODO: 实现通知功能
    // 目前仅返回成功作为占位
    let _ = (title, body);
    Ok(())
}
