//! 通用存储 Controller
//!
//! 提供统一的数据存储接口，前端指定子目录和文件名

use std::fs;
use std::path::PathBuf;
use serde_json::Value;
use crate::controller::config_controller::AppState;

/// 获取完整的存储路径
///
/// # Arguments
/// * `state` - 应用状态
/// * `sub_path` - 子目录路径（如 "worktracker", "daycountdown"）
///
/// # Returns
/// 返回完整的数据目录路径
fn get_storage_dir(state: &tauri::State<AppState>, sub_path: &str) -> Result<PathBuf, String> {
    let data_path = state.data_path.lock().map_err(|e| e.to_string())?;
    Ok(data_path.join(sub_path))
}

/// 读取数据
///
/// 从指定的子目录和文件中读取 JSON 数据
///
/// # Arguments
/// * `state` - 应用状态
/// * `sub_path` - 子目录路径
/// * `file_name` - 文件名（不含扩展名，自动添加 .json）
/// * `default_value` - 文件不存在时返回的默认值
///
/// # Returns
/// 成功返回 JSON 数据对象，失败返回错误信息
#[tauri::command]
pub fn load_data(
    state: tauri::State<AppState>,
    sub_path: String,
    file_name: String,
    default_value: Option<Value>,
) -> Result<Value, String> {
    let storage_dir = get_storage_dir(&state, &sub_path)?;
    let data_file = storage_dir.join(format!("{}.json", file_name));

    // 确保目录存在
    fs::create_dir_all(&storage_dir).map_err(|e| e.to_string())?;

    // 读取数据文件
    match fs::read_to_string(&data_file) {
        Ok(content) => {
            let data: Value = serde_json::from_str(&content)
                .map_err(|e| e.to_string())?;
            Ok(data)
        }
        Err(_) => {
            // 文件不存在时返回默认值
            Ok(default_value.unwrap_or_else(|| serde_json::json!({})))
        }
    }
}

/// 保存数据
///
/// 将 JSON 数据保存到指定的子目录和文件中
///
/// # Arguments
/// * `state` - 应用状态
/// * `sub_path` - 子目录路径
/// * `file_name` - 文件名（不含扩展名，自动添加 .json）
/// * `data` - 要保存的 JSON 数据对象
///
/// # Returns
/// 成功返回 Ok(()), 失败返回错误信息
#[tauri::command]
pub fn save_data(
    state: tauri::State<AppState>,
    sub_path: String,
    file_name: String,
    data: Value,
) -> Result<(), String> {
    let storage_dir = get_storage_dir(&state, &sub_path)?;
    let data_file = storage_dir.join(format!("{}.json", file_name));

    // 确保目录存在
    fs::create_dir_all(&storage_dir).map_err(|e| e.to_string())?;

    // 保存数据
    let content = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    fs::write(&data_file, content).map_err(|e| e.to_string())?;

    Ok(())
}

/// 删除数据文件
///
/// 删除指定的数据文件
///
/// # Arguments
/// * `state` - 应用状态
/// * `sub_path` - 子目录路径
/// * `file_name` - 文件名（不含扩展名）
///
/// # Returns
/// 成功返回 Ok(()), 失败返回错误信息
#[tauri::command]
pub fn delete_data(
    state: tauri::State<AppState>,
    sub_path: String,
    file_name: String,
) -> Result<(), String> {
    let storage_dir = get_storage_dir(&state, &sub_path)?;
    let data_file = storage_dir.join(format!("{}.json", file_name));

    // 如果文件存在则删除
    if data_file.exists() {
        fs::remove_file(&data_file).map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// 列出数据文件
///
/// 列出指定子目录下的所有 json 文件
///
/// # Arguments
/// * `state` - 应用状态
/// * `sub_path` - 子目录路径
///
/// # Returns
/// 成功返回文件名列表（不含扩展名），失败返回错误信息
#[tauri::command]
pub fn list_data_files(
    state: tauri::State<AppState>,
    sub_path: String,
) -> Result<Vec<String>, String> {
    let storage_dir = get_storage_dir(&state, &sub_path)?;

    // 如果目录不存在，返回空列表
    if !storage_dir.exists() {
        return Ok(vec![]);
    }

    let mut files = vec![];

    for entry in fs::read_dir(&storage_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if path.is_file() {
            if let Some(ext) = path.extension() {
                if ext == "json" {
                    if let Some(stem) = path.file_stem() {
                        files.push(stem.to_string_lossy().to_string());
                    }
                }
            }
        }
    }

    Ok(files)
}
