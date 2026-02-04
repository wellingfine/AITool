//! 应用配置 Controller
//! 
//! 提供应用配置管理、数据路径设置等功能

use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tauri::Manager;

/// 应用状态
pub struct AppState {
    pub data_path: std::sync::Mutex<PathBuf>,
}

/// 配置文件结构
#[derive(Serialize, Deserialize, Debug)]
pub struct Config {
    pub data_path: PathBuf,
}

/// 获取配置目录路径
/// 
/// # Arguments
/// * `app_handle` - Tauri 应用句柄
/// 
/// # Returns
/// 返回配置目录的 PathBuf
fn get_config_dir(app_handle: &tauri::AppHandle) -> PathBuf {
    app_handle.path().app_config_dir().unwrap_or_else(|_| {
        std::env::current_dir().unwrap_or_default()
    })
}

/// 加载应用配置
/// 
/// 从配置文件中读取配置，如果不存在则返回默认配置
/// 
/// # Arguments
/// * `app_handle` - Tauri 应用句柄
/// 
/// # Returns
/// 返回 Config 配置对象
pub fn load_config(app_handle: &tauri::AppHandle) -> Config {
    let config_path = get_config_dir(app_handle).join("config.json");

    if let Ok(content) = fs::read_to_string(&config_path) {
        if let Ok(config) = serde_json::from_str::<Config>(&content) {
            return config;
        }
    }

    // 默认配置
    let default_data_path = get_config_dir(app_handle).join("data");
    Config {
        data_path: default_data_path,
    }
}

/// 保存应用配置
/// 
/// 将配置对象保存到配置文件
/// 
/// # Arguments
/// * `app_handle` - Tauri 应用句柄
/// * `config` - 要保存的配置对象
/// 
/// # Returns
/// 成功返回 Ok(()), 失败返回错误信息
pub fn save_config(
    app_handle: &tauri::AppHandle, 
    config: &Config
) -> Result<(), String> {
    let config_dir = get_config_dir(app_handle);
    let config_path = config_dir.join("config.json");

    fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;

    let content = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(&config_path, content).map_err(|e| e.to_string())?;

    Ok(())
}

/// 获取当前数据存储路径
/// 
/// # Arguments
/// * `state` - 应用状态
/// 
/// # Returns
/// 返回数据路径字符串
#[tauri::command]
pub fn get_data_path(state: tauri::State<AppState>) -> Result<String, String> {
    let path = state.data_path.lock().map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

/// 设置新的数据存储路径
/// 
/// # Arguments
/// * `app_handle` - Tauri 应用句柄
/// * `state` - 应用状态
/// * `new_path` - 新的数据路径
/// 
/// # Returns
/// 成功返回 Ok(()), 失败返回错误信息
#[tauri::command]
pub fn set_data_path(
    app_handle: tauri::AppHandle,
    state: tauri::State<AppState>,
    new_path: String,
) -> Result<(), String> {
    let new_path_buf = PathBuf::from(new_path);

    // 创建目录
    fs::create_dir_all(&new_path_buf).map_err(|e| e.to_string())?;

    // 更新状态
    {
        let mut path = state.data_path.lock().map_err(|e| e.to_string())?;
        *path = new_path_buf.clone();
    }

    // 保存配置
    let config = Config {
        data_path: new_path_buf,
    };
    save_config(&app_handle, &config)?;

    Ok(())
}
