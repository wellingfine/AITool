use tauri::Manager;
use std::path::PathBuf;
use std::fs;
use serde::{Deserialize, Serialize};

// 应用状态
struct AppState {
    data_path: std::sync::Mutex<PathBuf>,
}

// 配置文件结构
#[derive(Serialize, Deserialize, Debug)]
struct Config {
    data_path: PathBuf,
}

// 获取配置目录
fn get_config_dir(app_handle: &tauri::AppHandle) -> PathBuf {
    app_handle.path().app_config_dir().unwrap_or_else(|_| {
        std::env::current_dir().unwrap_or_default()
    })
}

// 读取配置
fn load_config(app_handle: &tauri::AppHandle) -> Config {
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

// 保存配置
fn save_config(app_handle: &tauri::AppHandle, config: &Config) -> Result<(), String> {
    let config_dir = get_config_dir(app_handle);
    let config_path = config_dir.join("config.json");
    
    fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    
    let content = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(&config_path, content).map_err(|e| e.to_string())?;
    
    Ok(())
}

// 获取平台信息
#[tauri::command]
fn get_platform() -> String {
    tauri_plugin_os::platform().to_string()
}

// 选择文件
#[tauri::command]
async fn select_file(app_handle: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let result = app_handle.dialog()
        .file()
        .blocking_pick_file();
    
    Ok(result.map(|path| path.to_string()))
}

// 保存文件
#[tauri::command]
async fn save_file(app_handle: tauri::AppHandle, content: String) -> Result<bool, String> {
    use tauri_plugin_dialog::DialogExt;
    let result = app_handle.dialog()
        .file()
        .blocking_save_file();
    
    if let Some(path) = result {
        let path_str = path.to_string();
        fs::write(&path_str, content).map_err(|e| e.to_string())?;
        Ok(true)
    } else {
        Ok(false)
    }
}

// 选择文件夹
#[tauri::command]
async fn select_folder(app_handle: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let result = app_handle.dialog()
        .file()
        .set_title("选择文件夹")
        .blocking_pick_folder();
    
    Ok(result.map(|path| path.to_string()))
}

// 读取剪贴板
#[tauri::command]
async fn read_clipboard() -> Result<String, String> {
    Ok(String::new())
}

// 写入剪贴板
#[tauri::command]
async fn write_clipboard(_text: String) -> Result<(), String> {
    Ok(())
}

// 显示通知
#[tauri::command]
async fn show_notification(_title: String, _body: String) -> Result<(), String> {
    Ok(())
}

// 获取数据路径
#[tauri::command]
fn get_data_path(state: tauri::State<AppState>) -> Result<String, String> {
    let path = state.data_path.lock().map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

// 设置数据路径
#[tauri::command]
fn set_data_path(
    app_handle: tauri::AppHandle,
    state: tauri::State<AppState>,
    new_path: String
) -> Result<(), String> {
    let new_path_buf = PathBuf::from(new_path);
    
    fs::create_dir_all(&new_path_buf).map_err(|e| e.to_string())?;
    
    {
        let mut path = state.data_path.lock().map_err(|e| e.to_string())?;
        *path = new_path_buf.clone();
    }
    
    let config = Config {
        data_path: new_path_buf,
    };
    save_config(&app_handle, &config)?;
    
    Ok(())
}

// 读取 worktracker 数据
#[tauri::command]
fn read_worktracker_data(state: tauri::State<AppState>) -> Result<serde_json::Value, String> {
    let data_path = state.data_path.lock().map_err(|e| e.to_string())?;
    let worktracker_dir = data_path.join("worktracker");
    let data_file = worktracker_dir.join("data.json");
    
    fs::create_dir_all(&worktracker_dir).map_err(|e| e.to_string())?;
    
    match fs::read_to_string(&data_file) {
        Ok(content) => {
            let data: serde_json::Value = serde_json::from_str(&content)
                .map_err(|e| e.to_string())?;
            Ok(data)
        }
        Err(_) => {
            Ok(serde_json::json!({
                "tags": [],
                "projects": [],
                "records": []
            }))
        }
    }
}

// 保存 worktracker 数据
#[tauri::command]
fn save_worktracker_data(
    state: tauri::State<AppState>,
    data: serde_json::Value
) -> Result<(), String> {
    let data_path = state.data_path.lock().map_err(|e| e.to_string())?;
    let worktracker_dir = data_path.join("worktracker");
    let data_file = worktracker_dir.join("data.json");
    
    fs::create_dir_all(&worktracker_dir).map_err(|e| e.to_string())?;
    
    let content = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    fs::write(&data_file, content).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .setup(|app| {
            let config = load_config(&app.handle());
            
            app.manage(AppState {
                data_path: std::sync::Mutex::new(config.data_path),
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_platform,
            select_file,
            save_file,
            select_folder,
            read_clipboard,
            write_clipboard,
            show_notification,
            get_data_path,
            set_data_path,
            read_worktracker_data,
            save_worktracker_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
