use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::Command as SyncCommand;
use tauri::command;
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
    if let Some(_) = find_pio_in_filesystem() {
        return find_pio_in_filesystem().unwrap();
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
    
    if let Some(_) = find_pio_in_filesystem() {
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
                .args(["/F", "/PID", &pid.to_string()])
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
) -> Result<BuildResult, String> {
    use std::time::Instant;

    let start = Instant::now();
    let pio_cmd = get_pio_command();
    let mut cmd = tokio::process::Command::new(&pio_cmd);
    cmd.args(&args);

    let child = cmd.spawn().map_err(|e| format!("Failed to spawn pio: {}", e))?;
    let pid = child.id().unwrap_or(0);

    {
        let mut guard = state.child_id.lock().await;
        *guard = Some(pid);
    }

    let output = child.wait_with_output().await.map_err(|e| format!("Failed to wait on pio: {}", e))?;

    {
        let mut guard = state.child_id.lock().await;
        *guard = None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let duration = start.elapsed();

    let mut errors = Vec::new();
    let mut warnings = Vec::new();
    for line in stdout.lines() {
        if line.contains("error:") || line.contains("Error:") || line.contains("ERROR:") {
            errors.push(line.trim().to_string());
        }
        if line.contains("warning:") || line.contains("Warning:") {
            warnings.push(line.trim().to_string());
        }
    }

    Ok(BuildResult {
        success: output.status.success(),
        stdout: stdout.clone(),
        stderr: stderr.clone(),
        return_code: output.status.code().unwrap_or(-1),
        duration_ms: duration.as_millis() as u64,
        cancelled: false,
        output: stdout,
        errors,
        warnings,
    })
}

#[command]
pub async fn build_project(
    state: tauri::State<'_, BuildState>,
    project_path: String,
) -> Result<BuildResult, String> {
    run_platformio_command(state, vec!["run".to_string(), "-d".to_string(), project_path]).await
}

#[command]
pub async fn upload_firmware(
    state: tauri::State<'_, BuildState>,
    project_path: String,
    port: Option<String>,
) -> Result<BuildResult, String> {
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
    run_platformio_command(state, args).await
}

#[command]
pub fn parse_build_errors(output: String) -> Vec<serde_json::Value> {
    let mut errors = Vec::new();

    for line in output.lines() {
        if line.contains("error:") || line.contains("Error:") || line.contains("ERROR:") {
            let parts: Vec<&str> = line.split(':').collect();

            if parts.len() >= 3 {
                let file = parts.first().copied().unwrap_or_default();
                let line_num = parts.get(1).unwrap_or(&"0");
                let message = parts.get(2..).unwrap_or(&[]).join(":");

                errors.push(serde_json::json!({
                    "type": "error",
                    "file": file,
                    "line": line_num,
                    "message": message.trim(),
                }));
            } else {
                errors.push(serde_json::json!({
                    "type": "error",
                    "file": "",
                    "line": 0,
                    "message": line.trim(),
                }));
            }
        }

        if line.contains("warning:") || line.contains("Warning:") {
            let parts: Vec<&str> = line.split(':').collect();

            if parts.len() >= 3 {
                let file = parts.first().copied().unwrap_or_default();
                let line_num = parts.get(1).unwrap_or(&"0");
                let message = parts.get(2..).unwrap_or(&[]).join(":");

                errors.push(serde_json::json!({
                    "type": "warning",
                    "file": file,
                    "line": line_num,
                    "message": message.trim(),
                }));
            }
        }
    }

    errors
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
    let mut cmd = tokio::process::Command::new(&get_pio_command());
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
