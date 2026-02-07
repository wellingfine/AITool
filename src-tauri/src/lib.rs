//! AITool 应用主入口
//!
//! 使用 Controller 模式组织代码，按功能模块分类：
//! - common_controller: 通用系统功能（平台、剪贴板、通知）
//! - file_controller: 文件操作（选择、保存）
//! - config_controller: 应用配置（数据路径）
//! - storage_controller: 通用数据存储

use tauri::Manager;

// Controller 模块
mod controller;

use crate::controller::{AppState, config_controller};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .setup(|app| {
            // 加载配置并初始化应用状态
            let config = config_controller::load_config(&app.handle());
            
            app.manage(AppState {
                data_path: std::sync::Mutex::new(config.data_path),
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 通用功能 (common_controller)
            controller::common_controller::get_platform,
            controller::common_controller::read_clipboard,
            controller::common_controller::write_clipboard,
            controller::common_controller::show_notification,
            
            // 文件操作 (file_controller)
            controller::file_controller::select_file,
            controller::file_controller::save_file,
            controller::file_controller::select_folder,
            controller::file_controller::save_base64_image,
            
            // 应用配置 (config_controller)
            controller::config_controller::get_data_path,
            controller::config_controller::set_data_path,
            
            // 通用数据存储 (storage_controller)
            controller::storage_controller::load_data,
            controller::storage_controller::save_data,
            controller::storage_controller::delete_data,
            controller::storage_controller::list_data_files,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
