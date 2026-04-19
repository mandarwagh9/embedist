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
        .plugin(tauri_plugin_pty::init())
        .plugin(tauri_plugin_prevent_default::init())
        .manage(commands::SerialState::default())
        .manage(commands::AIState::default())
        .manage(commands::BuildState::default())
        .manage(commands::PtyState::default())
        .manage(commands::WatchState::default())
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                window.set_title("Embedist - AI-Native Embedded Development").ok();
            }
            info!("Embedist window initialized");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_platform_info,
            commands::list_serial_ports,
            commands::get_serial_state,
            commands::open_serial_port,
            commands::write_serial_port,
            commands::close_serial_port,
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
            commands::install_platformio,
            commands::install_platform,
            commands::pty_spawn,
            commands::pty_write,
            commands::pty_resize,
            commands::pty_kill,
            commands::start_watch,
            commands::stop_watch,
            commands::erase_flash,
            commands::web_search,
        ])
        .run(tauri::generate_context!())
        .unwrap_or_else(|e| {
            eprintln!("Error while running tauri application: {}", e);
            std::process::exit(1);
        });
}
