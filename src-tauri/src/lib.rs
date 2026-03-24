mod commands;

use log::info;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();
    info!("Starting Embedist application");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_prevent_default::init())
        .manage(commands::SerialState::default())
        .manage(commands::AIState::default())
        .manage(commands::BuildState::default())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            window.set_title("Embedist - AI-Native Embedded Development").ok();
            info!("Embedist window initialized");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_platform_info,
            commands::list_serial_ports,
            commands::get_serial_state,
            commands::check_platformio,
            commands::list_connected_boards,
            commands::get_available_boards,
            commands::run_platformio_command,
            commands::build_project,
            commands::upload_firmware,
            commands::stop_build,
            commands::parse_build_errors,
            commands::get_ai_providers,
            commands::add_ai_provider,
            commands::remove_ai_provider,
            commands::set_active_provider,
            commands::chat_completion,
            commands::read_file,
            commands::write_file,
            commands::create_file,
            commands::create_folder,
            commands::delete_path,
            commands::rename_path,
            commands::move_path,
            commands::list_directory,
            commands::get_directory_tree,
            commands::file_exists,
            commands::is_platformio_project,
            commands::read_platformio_board,
            commands::get_home_dir,
            commands::get_parent_dir,
            commands::save_plan_file,
            commands::grep_search,
            commands::run_shell,
            commands::reveal_in_explorer,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
