//! 文件操作 Controller
//! 
//! 提供文件选择、保存、文件夹选择等功能

use std::fs;
use std::sync::mpsc::channel;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};

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
    _app_handle: tauri::AppHandle
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
        _app_handle.dialog()
            .file()
            .set_title("选择文件夹")
            .pick_folder(move |path: Option<FilePath>| {
                let _ = tx.send(path.map(|p| p.to_string()));
            });

        return Ok(rx.recv().map_err(|e| e.to_string())?);
    }
}

/// 保存 Base64 图片
///
/// 打开系统保存文件对话框，将 Base64 编码的图片保存到用户选择的位置
///
/// # Arguments
/// * `app_handle` - Tauri 应用句柄
/// * `base64_data` - Base64 编码的图片数据（支持 data:image/png;base64, 前缀）
/// * `default_name` - 默认文件名
///
/// # Returns
/// 成功保存返回 true，取消返回 false，失败返回错误信息
#[tauri::command]
pub async fn save_base64_image(
    app_handle: tauri::AppHandle,
    base64_data: String,
    default_name: String
) -> Result<bool, String> {
    use tauri_plugin_dialog::DialogExt;

    // 去除 data:image/png;base64, 前缀
    let base64_content = if base64_data.contains(',') {
        base64_data.split(',').last().unwrap_or(&base64_data).to_string()
    } else {
        base64_data
    };

    // 解码 base64
    let image_data = BASE64.decode(&base64_content)
        .map_err(|e| format!("Base64 解码失败: {}", e))?;

    let (tx, rx) = channel();
    app_handle.dialog()
        .file()
        .add_filter("PNG 图片", &["png"])
        .add_filter("所有文件", &["*"])
        .set_file_name(&default_name)
        .save_file(move |path| {
            let _ = tx.send(path.map(|p| p.to_string()));
        });

    if let Some(path_str) = rx.recv().map_err(|e| e.to_string())? {
        fs::write(&path_str, image_data).map_err(|e| e.to_string())?;
        Ok(true)
    } else {
        Ok(false)
    }
}

/// 打开文件对话框（指定默认目录）
///
/// 打开系统文件选择对话框，默认定位到指定目录
///
/// # Arguments
/// * `app_handle` - Tauri 应用句柄
/// * `default_dir` - 默认打开的目录路径
///
/// # Returns
/// 成功返回选中的文件路径，取消返回 None，失败返回错误信息
#[tauri::command]
pub async fn open_file_dialog(
    app_handle: tauri::AppHandle,
    default_dir: Option<String>
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::{DialogExt, FilePath};

    let (tx, rx) = channel();

    let mut dialog = app_handle.dialog()
        .file()
        .add_filter("JSON 文件", &["json"])
        .add_filter("所有文件", &["*"]);

    // 设置起始目录
    if let Some(dir) = default_dir {
        let path = std::path::PathBuf::from(dir);
        dialog = dialog.set_directory(path);
    }

    dialog.pick_file(move |path: Option<FilePath>| {
        let _ = tx.send(path.map(|p| p.to_string()));
    });

    Ok(rx.recv().map_err(|e| e.to_string())?)
}

/// 保存文件对话框（指定默认目录和文件名）
///
/// 打开系统保存文件对话框，默认定位到指定目录并使用默认文件名
///
/// # Arguments
/// * `app_handle` - Tauri 应用句柄
/// * `default_dir` - 默认打开的目录路径
/// * `default_name` - 默认文件名
///
/// # Returns
/// 成功返回保存的文件路径，取消返回 None，失败返回错误信息
#[tauri::command]
pub async fn save_file_dialog(
    app_handle: tauri::AppHandle,
    default_dir: Option<String>,
    default_name: Option<String>
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::{DialogExt, FilePath};

    let (tx, rx) = channel();

    let mut dialog = app_handle.dialog()
        .file()
        .add_filter("JSON 文件", &["json"])
        .add_filter("所有文件", &["*"]);

    // 设置起始目录
    if let Some(dir) = default_dir {
        let path = std::path::PathBuf::from(dir);
        dialog = dialog.set_directory(path);
    }

    // 设置默认文件名
    if let Some(name) = default_name {
        dialog = dialog.set_file_name(&name);
    }

    dialog.save_file(move |path: Option<FilePath>| {
        let _ = tx.send(path.map(|p| p.to_string()));
    });

    Ok(rx.recv().map_err(|e| e.to_string())?)
}

/// 读取文件内容（通过绝对路径）
///
/// # Arguments
/// * `file_path` - 文件的绝对路径
///
/// # Returns
/// 成功返回文件内容字符串，失败返回错误信息
#[tauri::command]
pub async fn read_file_content(file_path: String) -> Result<Option<String>, String> {
    use std::fs;

    match fs::read_to_string(&file_path) {
        Ok(content) => Ok(Some(content)),
        Err(e) => Err(format!("读取文件失败: {}", e)),
    }
}

/// 写入文件内容（通过绝对路径）
///
/// # Arguments
/// * `file_path` - 文件的绝对路径
/// * `content` - 要写入的内容
///
/// # Returns
/// 成功返回 true，失败返回错误信息
#[tauri::command]
pub async fn write_file_content(file_path: String, content: String) -> Result<bool, String> {
    use std::fs;

    match fs::write(&file_path, content) {
        Ok(_) => Ok(true),
        Err(e) => Err(format!("写入文件失败: {}", e)),
    }
}
