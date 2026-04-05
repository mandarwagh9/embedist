use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::{Command as SyncCommand, Stdio};
use tauri::command;
use tauri::Emitter;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::sync::Mutex as AsyncMutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BoardInfo {
    pub id: String,
    pub name: String,
    pub platform: String,
    pub mcu: Option<String>,
    pub frequency: Option<String>,
    pub flash_size: Option<String>,
    pub ram_size: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BuildResult {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub return_code: i32,
    pub duration_ms: u64,
    pub cancelled: bool,
    pub output: String,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PlatformInfo {
    pub version: String,
    pub core_version: String,
    pub installed: bool,
}

pub struct BuildState {
    pub child_id: AsyncMutex<Option<u32>>,
}

impl Default for BuildState {
    fn default() -> Self {
        Self {
            child_id: AsyncMutex::new(None),
        }
    }
}

fn run_sync_command(cmd: &str, args: &[&str]) -> Result<std::process::Output, String> {
    SyncCommand::new(cmd)
        .args(args)
        .output()
        .map_err(|e| format!("Failed to execute command: {}", e))
}

fn run_pio_command_via_python(args: &[&str]) -> Result<std::process::Output, String> {
    let python_cmds = ["python", "python3", "py"];
    for python_cmd in python_cmds {
        let result = SyncCommand::new(python_cmd)
            .args(["-m", "platformio"])
            .args(args)
            .output();
        
        if let Ok(output) = result {
            if output.status.success() || !String::from_utf8_lossy(&output.stderr).contains("No module named") {
                return Ok(output);
            }
        }
    }
    Err("No Python with PlatformIO found".to_string())
}

fn find_pio_in_filesystem() -> Option<String> {
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(parent) = exe_path.parent() {
            let bundled = parent.join("python").join("Scripts").join("pio.exe");
            if bundled.exists() {
                return Some(bundled.to_string_lossy().to_string());
            }
            let bundled_alt = parent.join("platformio").join("pio.exe");
            if bundled_alt.exists() {
                return Some(bundled_alt.to_string_lossy().to_string());
            }
        }
    }
    
    if let Ok(home) = std::env::var("USERPROFILE") {
        let search_paths = vec![
            format!("{}\\AppData\\Local\\Programs\\Python\\Python313\\Scripts\\pio.exe", home),
            format!("{}\\AppData\\Local\\Programs\\Python\\Python312\\Scripts\\pio.exe", home),
            format!("{}\\AppData\\Local\\Programs\\Python\\Python311\\Scripts\\pio.exe", home),
            format!("{}\\AppData\\Local\\Programs\\Python\\Python310\\Scripts\\pio.exe", home),
            format!("{}\\AppData\\Roaming\\Python\\Python313\\Scripts\\pio.exe", home),
            format!("{}\\AppData\\Roaming\\Python\\Python312\\Scripts\\pio.exe", home),
            format!("{}\\AppData\\Roaming\\Python\\Python311\\Scripts\\pio.exe", home),
            format!("{}\\AppData\\Roaming\\Python\\Scripts\\pio.exe", home),
            format!("{}\\miniconda3\\Scripts\\pio.exe", home),
            format!("{}\\miniconda3\\Scripts\\python.exe", home),
            format!("{}\\anaconda3\\Scripts\\pio.exe", home),
            format!("{}\\anaconda3\\Scripts\\python.exe", home),
        ];
        
        for p in search_paths {
            let path = std::path::Path::new(&p);
            if path.exists() {
                return Some(p);
            }
        }
    }
    
    if let Ok(output) = SyncCommand::new("where").arg("pio").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                return Some(path.lines().next().unwrap_or("pio").to_string());
            }
        }
    }
    
    None
}

fn get_pio_command() -> String {
    if let Some(path) = find_pio_in_filesystem() {
        return path;
    }
    "pio".to_string()
}

fn run_pio_command(args: &[&str]) -> Result<std::process::Output, String> {
    if let Some(path) = find_pio_in_filesystem() {
        run_sync_command(&path, args)
    } else {
        run_pio_command_via_python(args)
    }
}

#[command]
pub fn check_platformio() -> PlatformInfo {
    if let Ok(output) = run_pio_command_via_python(&["--version"]) {
        if output.status.success() {
            let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
            return PlatformInfo {
                version,
                core_version: "".to_string(),
                installed: true,
            };
        }
    }
    
    if find_pio_in_filesystem().is_some() {
        return PlatformInfo {
            version: "Installed (version check failed)".to_string(),
            core_version: "".to_string(),
            installed: true,
        };
    }
    
    PlatformInfo {
        version: "Not installed".to_string(),
        core_version: "".to_string(),
        installed: false,
    }
}

#[command]
pub fn list_connected_boards() -> Result<Vec<BoardInfo>, String> {
    let output = run_pio_command(&["device", "list", "--json-output"])?;
    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let boards: Vec<BoardInfo> = serde_json::from_str(&stdout).unwrap_or_default();
        Ok(boards)
    } else {
        Ok(vec![])
    }
}

#[command]
pub fn get_available_boards() -> Vec<BoardInfo> {
    let output = match run_pio_command(&["boards", "--json-output"]) {
        Ok(out) if out.status.success() => String::from_utf8_lossy(&out.stdout).to_string(),
        _ => return vec![],
    };

    let raw: Vec<HashMap<String, serde_json::Value>> = match serde_json::from_str(&output) {
        Ok(v) => v,
        Err(_) => return vec![],
    };

    raw.into_iter()
        .filter_map(|b| {
            let id = b.get("id")?.as_str()?.to_string();
            let name = b.get("name").and_then(|v| v.as_str()).unwrap_or(&id).to_string();
            let platform = b.get("platform").and_then(|v| v.as_str()).unwrap_or("").to_string();
            Some(BoardInfo {
                id,
                name,
                platform,
                mcu: b.get("mcu").and_then(|v| v.as_str()).map(String::from),
                frequency: b.get("frequencies").and_then(|v| {
                    v.as_object()?.values().next().and_then(|f| f.as_str()).map(String::from)
                }),
                flash_size: b.get("flash").and_then(|v| v.as_str()).map(String::from),
                ram_size: b.get("ram").and_then(|v| v.as_str()).map(String::from),
            })
        })
        .collect()
}

#[command]
pub async fn stop_build(state: tauri::State<'_, BuildState>) -> Result<bool, String> {
    let mut guard = state.child_id.lock().await;
    if let Some(pid) = guard.take() {
        #[cfg(windows)]
        {
            let _ = SyncCommand::new("taskkill")
                .args(["/F", "/T", "/PID", &pid.to_string()])
                .spawn()
                .map_err(|e| format!("Failed to spawn taskkill: {}", e))?
                .wait()
                .map_err(|e| format!("Failed to wait on taskkill: {}", e))?;
        }
        #[cfg(not(windows))]
        {
            let _ = SyncCommand::new("kill")
                .args(["-9", &pid.to_string()])
                .spawn()
                .map_err(|e| format!("Failed to spawn kill: {}", e))?
                .wait()
                .map_err(|e| format!("Failed to wait on kill: {}", e))?;
        }
        Ok(true)
    } else {
        Ok(false)
    }
}

#[command]
pub async fn run_platformio_command(
    state: tauri::State<'_, BuildState>,
    args: Vec<String>,
    app: tauri::AppHandle,
) -> Result<BuildResult, String> {
    use std::time::Instant;

    let start = Instant::now();
    let pio_cmd = get_pio_command();
    let mut cmd = tokio::process::Command::new(&pio_cmd);
    cmd.args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn pio: {}", e))?;
    let pid = child.id().unwrap_or(0);

    {
        let mut guard = state.child_id.lock().await;
        *guard = Some(pid);
    }

    let stdout = child.stdout.take().expect("stdout not piped");
    let stderr = child.stderr.take().expect("stderr not piped");

    let mut stdout_reader = BufReader::new(stdout).lines();
    let mut stderr_reader = BufReader::new(stderr).lines();

    let app_clone = app.clone();
    let stdout_task = tokio::spawn(async move {
        let mut lines: Vec<String> = Vec::new();
        while let Ok(Some(line)) = stdout_reader.next_line().await {
            let _ = app_clone.emit("build-output", line.clone());
            lines.push(line);
        }
        lines
    });

    let app_clone = app.clone();
    let stderr_task = tokio::spawn(async move {
        let mut lines: Vec<String> = Vec::new();
        while let Ok(Some(line)) = stderr_reader.next_line().await {
            let _ = app_clone.emit("build-output", line.clone());
            lines.push(line);
        }
        lines
    });

    let status = child.wait().await.map_err(|e| format!("Failed to wait on pio: {}", e))?;

    {
        let mut guard = state.child_id.lock().await;
        *guard = None;
    }

    let stdout_result = stdout_task.await.unwrap_or_default();
    let stderr_result = stderr_task.await.unwrap_or_default();

    let mut errors: Vec<String> = Vec::new();
    let mut warnings: Vec<String> = Vec::new();
    for line in stdout_result.iter().chain(stderr_result.iter()) {
        if line.contains("error:") || line.contains("Error:") || line.contains("ERROR:") {
            errors.push(line.trim().to_string());
        }
        if line.contains("warning:") || line.contains("Warning:") {
            warnings.push(line.trim().to_string());
        }
    }

    let duration = start.elapsed();
    let full_output = stdout_result.join("\n");
    let full_stderr = stderr_result.join("\n");

    Ok(BuildResult {
        success: status.success(),
        stdout: full_output.clone(),
        stderr: full_stderr,
        return_code: status.code().unwrap_or(-1),
        duration_ms: duration.as_millis() as u64,
        cancelled: false,
        output: full_output,
        errors,
        warnings,
    })
}

#[command]
pub async fn build_project(
    state: tauri::State<'_, BuildState>,
    project_path: String,
    app: tauri::AppHandle,
) -> Result<BuildResult, String> {
    run_platformio_command(state, vec!["run".to_string(), "-d".to_string(), project_path], app).await
}

#[command]
pub async fn upload_firmware(
    state: tauri::State<'_, BuildState>,
    project_path: String,
    port: Option<String>,
    app: tauri::AppHandle,
) -> Result<BuildResult, String> {
    // First, read platformio.ini to detect ESP boards
    let pio_ini_path = std::path::Path::new(&project_path).join("platformio.ini");
    let pio_ini_content = std::fs::read_to_string(&pio_ini_path).unwrap_or_default();
    let is_esp_board = pio_ini_content.contains("esp8266") || pio_ini_content.contains("esp32")
        || pio_ini_content.contains("espressif8266") || pio_ini_content.contains("espressif32");

    // For ESP boards, erase flash before upload to prevent conflicts with old firmware
    if is_esp_board {
        let _ = app.emit("build-output", "[UPLOAD] Erasing flash before upload (ESP board detected)...".to_string());
        let erase_args = vec![
            "run".to_string(),
            "--target".to_string(),
            "erase".to_string(),
            "-d".to_string(),
            project_path.clone(),
        ];
        let erase_result = run_platformio_command(state.clone(), erase_args, app.clone()).await;
        if let Ok(result) = erase_result {
            if !result.success {
                let _ = app.emit("build-output", format!("[UPLOAD] Flash erase failed, continuing with upload: {}", result.stderr));
            } else {
                let _ = app.emit("build-output", "[UPLOAD] Flash erased successfully".to_string());
            }
        }
    }

    let mut args = vec![
        "run".to_string(),
        "--target".to_string(),
        "upload".to_string(),
        "-d".to_string(),
        project_path,
    ];
    if let Some(p) = port {
        args.push("--upload-port".to_string());
        args.push(p);
    }
    run_platformio_command(state, args, app).await
}

#[command]
pub async fn erase_flash(
    state: tauri::State<'_, BuildState>,
    project_path: String,
    app: tauri::AppHandle,
) -> Result<BuildResult, String> {
    let args = vec![
        "run".to_string(),
        "--target".to_string(),
        "erase".to_string(),
        "-d".to_string(),
        project_path,
    ];
    run_platformio_command(state, args, app).await
}

#[command]
pub fn parse_build_errors(output: String) -> Vec<serde_json::Value> {
    let mut errors = Vec::new();

    for line in output.lines() {
        if line.contains("error:") || line.contains("Error:") || line.contains("ERROR:") {
            let error_type = if line.contains("warning:") || line.contains("Warning:") { "warning" } else { "error" };
            if let Some(parsed) = parse_compiler_error_line(line, error_type) {
                errors.push(parsed);
            } else {
                errors.push(serde_json::json!({
                    "type": error_type,
                    "file": "",
                    "line": 0,
                    "message": line.trim(),
                }));
            }
        } else if line.contains("warning:") || line.contains("Warning:") {
            if let Some(parsed) = parse_compiler_error_line(line, "warning") {
                errors.push(parsed);
            }
        }
    }

    errors
}

fn parse_compiler_error_line(line: &str, error_type: &str) -> Option<serde_json::Value> {
    let colon_pos = line.find("error:").or_else(|| line.find("Error:")).or_else(|| line.find("ERROR:"))
        .or_else(|| line.find("warning:")).or_else(|| line.find("Warning:"));

    let colon_pos = colon_pos?;
    let prefix = &line[..colon_pos].trim_end_matches(':');

    let parts: Vec<&str> = prefix.rsplitn(3, ':').collect();

    if parts.len() >= 3 {
        let line_num = parts[0];
        let col_or_file = parts[1];
        let file = parts[2];

        if line_num.parse::<u32>().is_ok() && (col_or_file.parse::<u32>().is_ok() || !col_or_file.is_empty()) {
            let message = line[colon_pos..].trim_start_matches(|c: char| c.is_alphabetic() || c == ':').trim().to_string();
            return Some(serde_json::json!({
                "type": error_type,
                "file": file.trim(),
                "line": line_num,
                "message": message,
            }));
        }
    } else if parts.len() == 2 {
        let line_num = parts[0];
        let file = parts[1];
        if line_num.parse::<u32>().is_ok() {
            let message = line[colon_pos..].trim_start_matches(|c: char| c.is_alphabetic() || c == ':').trim().to_string();
            return Some(serde_json::json!({
                "type": error_type,
                "file": file.trim(),
                "line": line_num,
                "message": message,
            }));
        }
    }

    None
}

#[command]
pub async fn install_platformio() -> Result<String, String> {
    use tokio::process::Command;
    
    let python_cmds = vec![
        "python".to_string(),
    ];
    
    let mut installed = false;
    let mut last_error = String::new();
    
    for python_cmd in python_cmds {
        let output = Command::new(&python_cmd)
            .args(["-m", "pip", "install", "platformio"])
            .output()
            .await;
        
        match output {
            Ok(out) => {
                if out.status.success() {
                    installed = true;
                    break;
                } else {
                    last_error = String::from_utf8_lossy(&out.stderr).to_string();
                }
            }
            Err(e) => {
                last_error = format!("Failed to run {}: {}", python_cmd, e);
            }
        }
    }
    
    if installed {
        if let Ok(out) = run_pio_command_via_python(&["--version"]) {
            if out.status.success() {
                let version = String::from_utf8_lossy(&out.stdout).trim().to_string();
                return Ok(format!("PlatformIO installed successfully: {}", version));
            }
        }
        Ok("PlatformIO installed successfully".to_string())
    } else {
        Err(format!("Failed to install PlatformIO: {}", last_error))
    }
}

#[command]
pub async fn install_platform(platform: String) -> Result<String, String> {
    let mut cmd = tokio::process::Command::new(get_pio_command());
    let output = cmd.args(["platform", "install", &platform])
        .output()
        .await
        .map_err(|e| format!("Failed to install platform {}: {}", platform, e))?;
    
    if output.status.success() {
        Ok(format!("Platform {} installed successfully", platform))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to install platform {}: {}", platform, stderr))
    }
}
