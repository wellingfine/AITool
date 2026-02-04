//! 文件操作 Controller
//! 
//! 提供文件选择、保存、文件夹选择等功能

use std::fs;
use std::sync::mpsc::channel;
use tauri::Manager;

/// 选择单个文件
/// 
/// 打开系统文件选择对话框，让用户选择文件
/// 
/// # Arguments
/// * `app_handle` - Tauri 应用句柄
/// 
/// # Returns
/// 成功返回选中的文件路径，取消返回 None，失败返回错误信息
#[tauri::command]
pub async fn select_file(app_handle: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let (tx, rx) = channel();
    app_handle.dialog()
        .file()
        .pick_file(move |path| {
            let _ = tx.send(path.map(|p| p.to_string()));
        });

    Ok(rx.recv().map_err(|e| e.to_string())?)
}

/// 保存文件
/// 
/// 打开系统保存文件对话框，将内容保存到用户选择的文件
/// 
/// # Arguments
/// * `app_handle` - Tauri 应用句柄
/// * `content` - 要保存的文件内容
/// 
/// # Returns
/// 成功保存返回 true，取消返回 false，失败返回错误信息
#[tauri::command]
pub async fn save_file(
    app_handle: tauri::AppHandle, 
    content: String
) -> Result<bool, String> {
    use tauri_plugin_dialog::DialogExt;

    let (tx, rx) = channel();
    app_handle.dialog()
        .file()
        .save_file(move |path| {
            let _ = tx.send(path.map(|p| p.to_string()));
        });

    if let Some(path_str) = rx.recv().map_err(|e| e.to_string())? {
        fs::write(&path_str, content).map_err(|e| e.to_string())?;
        Ok(true)
    } else {
        Ok(false)
    }
}

/// 选择文件夹
/// 
/// 打开系统文件夹选择对话框
/// 注意：移动端（Android/iOS）不支持此功能
/// 
/// # Arguments
/// * `app_handle` - Tauri 应用句柄
/// 
/// # Returns
/// 成功返回选中的文件夹路径，取消返回 None，失败返回错误信息
#[tauri::command]
pub async fn select_folder(
    app_handle: tauri::AppHandle
) -> Result<Option<String>, String> {
    // 移动端处理：Android 不支持 pick_folder
    #[cfg(mobile)]
    {
        return Err("移动端暂不支持选择文件夹功能，请选择具体文件".to_string());
    }

    // 仅在桌面端编译这段代码
    #[cfg(desktop)]
    {
        use tauri_plugin_dialog::{DialogExt, FilePath};

        let (tx, rx) = channel();
        app_handle.dialog()
            .file()
            .set_title("选择文件夹")
            .pick_folder(move |path: Option<FilePath>| {
                let _ = tx.send(path.map(|p| p.to_string()));
            });

        return Ok(rx.recv().map_err(|e| e.to_string())?);
    }
}
