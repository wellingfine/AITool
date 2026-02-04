//! 任务跟进 (WorkTracker) Controller
//! 
//! 提供任务跟进数据的读取和保存功能
//! 
//! 前端对应工具: WorkTracker (任务跟进)

use std::fs;
use std::path::PathBuf;
use serde_json::Value;
use crate::controller::config_controller::AppState;

/// 获取 WorkTracker 数据存储目录
/// 
/// # Arguments
/// * `state` - 应用状态
/// 
/// # Returns
/// 返回数据目录路径
fn get_worktracker_dir(state: &tauri::State<AppState>) -> Result<PathBuf, String> {
    let data_path = state.data_path.lock().map_err(|e| e.to_string())?;
    Ok(data_path.join("worktracker"))
}

/// 读取 WorkTracker 数据
/// 
/// 读取任务跟进的所有数据（标签、项目、记录）
/// 如果数据文件不存在，返回默认的空数据结构
/// 
/// # Arguments
/// * `state` - 应用状态
/// 
/// # Returns
/// 成功返回 JSON 数据对象，失败返回错误信息
/// 
/// # Example
/// 返回数据结构:
/// ```json
/// {
///   "tags": [...],
///   "projects": [...],
///   "records": [...]
/// }
/// ```
#[tauri::command]
pub fn read_worktracker_data(
    state: tauri::State<AppState>
) -> Result<Value, String> {
    let worktracker_dir = get_worktracker_dir(&state)?;
    let data_file = worktracker_dir.join("data.json");

    // 确保目录存在
    fs::create_dir_all(&worktracker_dir).map_err(|e| e.to_string())?;

    // 读取数据文件
    match fs::read_to_string(&data_file) {
        Ok(content) => {
            let data: Value = serde_json::from_str(&content)
                .map_err(|e| e.to_string())?;
            Ok(data)
        }
        Err(_) => {
            // 文件不存在时返回默认数据结构
            Ok(serde_json::json!({
                "tags": [],
                "projects": [],
                "records": []
            }))
        }
    }
}

/// 保存 WorkTracker 数据
/// 
/// 将任务跟进数据保存到本地文件
/// 
/// # Arguments
/// * `state` - 应用状态
/// * `data` - 要保存的 JSON 数据对象
/// 
/// # Returns
/// 成功返回 Ok(()), 失败返回错误信息
/// 
/// # Example
/// 期望的数据结构:
/// ```json
/// {
///   "tags": [...],
///   "projects": [...],
///   "records": [...]
/// }
/// ```
#[tauri::command]
pub fn save_worktracker_data(
    state: tauri::State<AppState>,
    data: Value,
) -> Result<(), String> {
    let worktracker_dir = get_worktracker_dir(&state)?;
    let data_file = worktracker_dir.join("data.json");

    // 确保目录存在
    fs::create_dir_all(&worktracker_dir).map_err(|e| e.to_string())?;

    // 保存数据
    let content = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    fs::write(&data_file, content).map_err(|e| e.to_string())?;

    Ok(())
}
