use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::{Command as SyncCommand, Stdio};
use std::sync::Arc;
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

#[derive(Clone)]
pub struct BuildState {
    pub child_id: Arc<AsyncMutex<Option<u32>>>,
}

impl Default for BuildState {
    fn default() -> Self {
        Self {
            child_id: Arc::new(AsyncMutex::new(None)),
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
    let python_cmds: &[&str] = if cfg!(windows) {
        &["py", "python", "python3"]
    } else {
        &[
            "/usr/bin/python3",
            "/usr/local/bin/python3",
            "/bin/python3",
            "python3",
            "python",
        ]
    };

    for python_cmd in python_cmds {
        let result = SyncCommand::new(python_cmd)
            .args(["-m", "platformio"])
            .args(args)
            .output();

        if let Ok(output) = result {
            if output.status.success()
                || !String::from_utf8_lossy(&output.stderr).contains("No module named")
            {
                return Ok(output);
            }
        }
    }
    Err("No Python with PlatformIO found".to_string())
}

fn command_exists(command: &str) -> bool {
    let probe = if cfg!(windows) { "where" } else { "which" };
    SyncCommand::new(probe)
        .arg(command)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

fn run_pio_version(command: &str) -> Result<std::process::Output, String> {
    run_sync_command(command, &["--version"])
}

fn normalize_platformio_override(platformio_path: Option<&str>) -> Option<&str> {
    platformio_path
        .map(str::trim)
        .filter(|path| !path.is_empty() && *path != "pio" && *path != "platformio")
}

fn find_pio_in_filesystem() -> Option<String> {
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(parent) = exe_path.parent() {
            #[cfg(windows)]
            {
                let bundled = parent.join("python").join("Scripts").join("pio.exe");
                if bundled.exists() {
                    return Some(bundled.to_string_lossy().to_string());
                }
                let bundled_alt = parent.join("platformio").join("pio.exe");
                if bundled_alt.exists() {
                    return Some(bundled_alt.to_string_lossy().to_string());
                }
            }

            #[cfg(not(windows))]
            {
                let bundled = parent.join("pio");
                if bundled.exists() {
                    return Some(bundled.to_string_lossy().to_string());
                }
                let bundled_alt = parent.join("platformio").join("pio");
                if bundled_alt.exists() {
                    return Some(bundled_alt.to_string_lossy().to_string());
                }
            }
        }
    }

    #[cfg(not(windows))]
    if let Ok(home) = std::env::var("HOME") {
        let local_bin_candidates = [
            format!("{}/.local/share/embedist/platformio-venv/bin/pio", home),
            format!("{}/.local/bin/pio", home),
            format!("{}/.local/bin/platformio", home),
            format!("{}/bin/pio", home),
            format!("{}/bin/platformio", home),
        ];

        for p in local_bin_candidates {
            let path = std::path::Path::new(&p);
            if path.exists() {
                return Some(p);
            }
        }
    }

    #[cfg(windows)]
    if let Ok(home) = std::env::var("USERPROFILE") {
        let search_paths = vec![
            format!(
                "{}\\AppData\\Local\\Programs\\Python\\Python313\\Scripts\\pio.exe",
                home
            ),
            format!(
                "{}\\AppData\\Local\\Programs\\Python\\Python312\\Scripts\\pio.exe",
                home
            ),
            format!(
                "{}\\AppData\\Local\\Programs\\Python\\Python311\\Scripts\\pio.exe",
                home
            ),
            format!(
                "{}\\AppData\\Local\\Programs\\Python\\Python310\\Scripts\\pio.exe",
                home
            ),
            format!(
                "{}\\AppData\\Roaming\\Python\\Python313\\Scripts\\pio.exe",
                home
            ),
            format!(
                "{}\\AppData\\Roaming\\Python\\Python312\\Scripts\\pio.exe",
                home
            ),
            format!(
                "{}\\AppData\\Roaming\\Python\\Python311\\Scripts\\pio.exe",
                home
            ),
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

    let probe_commands = if cfg!(windows) {
        vec!["pio"]
    } else {
        vec!["pio", "platformio"]
    };

    for probe in probe_commands {
        if let Ok(output) = SyncCommand::new(if cfg!(windows) { "where" } else { "which" })
            .arg(probe)
            .output()
        {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !path.is_empty() {
                    return Some(path.lines().next().unwrap_or(probe).to_string());
                }
            }
        }
    }

    if !cfg!(windows) && command_exists("pio") {
        return Some("pio".to_string());
    }

    if !cfg!(windows) && command_exists("platformio") {
        return Some("platformio".to_string());
    }

    if let Ok(output) = SyncCommand::new("which").arg("pio").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                return Some(path.lines().next().unwrap_or("pio").to_string());
            }
        }
    }

    None
}

#[cfg(not(windows))]
fn platformio_venv_dir() -> Option<PathBuf> {
    let base = std::env::var_os("XDG_DATA_HOME")
        .map(PathBuf::from)
        .or_else(|| {
            std::env::var_os("HOME").map(|home| PathBuf::from(home).join(".local/share"))
        })?;

    Some(base.join("embedist").join("platformio-venv"))
}

#[cfg(not(windows))]
fn platformio_venv_python() -> Option<PathBuf> {
    platformio_venv_dir().map(|dir| dir.join("bin").join("python"))
}

#[cfg(not(windows))]
fn platformio_venv_pio() -> Option<PathBuf> {
    platformio_venv_dir().map(|dir| dir.join("bin").join("pio"))
}

#[cfg(not(windows))]
async fn install_platformio_in_venv() -> Result<String, String> {
    use tokio::process::Command;

    let venv_dir = platformio_venv_dir()
        .ok_or_else(|| "Unable to determine a local PlatformIO install path".to_string())?;
    let venv_python = platformio_venv_python()
        .ok_or_else(|| "Unable to determine the PlatformIO venv Python path".to_string())?;

    if !venv_python.exists() {
        let python_candidates = [
            "/usr/bin/python3",
            "/usr/local/bin/python3",
            "/bin/python3",
            "python3",
        ];
        let mut venv_created = false;
        let mut last_error = String::new();

        for python in python_candidates {
            let output = Command::new(python)
                .args(["-m", "venv"])
                .arg(&venv_dir)
                .output()
                .await;

            match output {
                Ok(out) if out.status.success() => {
                    venv_created = true;
                    break;
                }
                Ok(out) => {
                    let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
                    last_error = if stderr.is_empty() {
                        format!("{} exited with status {}", python, out.status)
                    } else {
                        stderr
                    };
                }
                Err(e) => {
                    last_error = format!("Failed to run {}: {}", python, e);
                }
            }
        }

        if !venv_created {
            return Err(format!(
                "Failed to create a local PlatformIO virtual environment: {}",
                last_error
            ));
        }
    }

    let output = Command::new(&venv_python)
        .args(["-m", "pip", "install", "platformio"])
        .output()
        .await
        .map_err(|e| {
            format!(
                "Failed to install PlatformIO in a local virtual environment: {}",
                e
            )
        })?;

    if output.status.success() {
        Ok(format!(
            "PlatformIO installed successfully in {}",
            venv_dir.display()
        ))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(format!(
            "Failed to install PlatformIO in a local virtual environment: {}",
            if stderr.is_empty() {
                "unknown error".to_string()
            } else {
                stderr
            }
        ))
    }
}

fn get_pio_command(platformio_path: Option<&str>) -> String {
    if let Some(path) = normalize_platformio_override(platformio_path) {
        return path.to_string();
    }

    if let Some(path) = find_pio_in_filesystem() {
        return path;
    }
    "pio".to_string()
}

fn run_pio_command(
    args: &[&str],
    platformio_path: Option<&str>,
) -> Result<std::process::Output, String> {
    if let Some(path) = normalize_platformio_override(platformio_path) {
        return run_sync_command(path, args);
    }

    if let Some(path) = find_pio_in_filesystem() {
        run_sync_command(&path, args)
    } else {
        run_pio_command_via_python(args)
    }
}

#[command]
pub fn check_platformio(platformio_path: Option<String>) -> PlatformInfo {
    let override_path = normalize_platformio_override(platformio_path.as_deref());

    if let Some(path) = override_path {
        if let Ok(output) = run_pio_version(path) {
            if output.status.success() {
                let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
                return PlatformInfo {
                    version,
                    core_version: "".to_string(),
                    installed: true,
                };
            }
        }
    }

    if let Some(path) = find_pio_in_filesystem() {
        if let Ok(output) = run_pio_version(&path) {
            if output.status.success() {
                let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
                return PlatformInfo {
                    version,
                    core_version: "".to_string(),
                    installed: true,
                };
            }
        }
    }

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
pub fn list_connected_boards(platformio_path: Option<String>) -> Result<Vec<BoardInfo>, String> {
    let output = run_pio_command(
        &["device", "list", "--json-output"],
        platformio_path.as_deref(),
    )?;
    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let boards: Vec<BoardInfo> = serde_json::from_str(&stdout).unwrap_or_default();
        Ok(boards)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("not installed") || stderr.contains("command not found") {
            Err("PlatformIO is not installed or not found in PATH. Please install PlatformIO: pip install platformio".to_string())
        } else if stderr.is_empty() {
            Ok(vec![])
        } else {
            Err(format!("Failed to list boards: {}", stderr))
        }
    }
}

#[command]
pub fn get_available_boards(platformio_path: Option<String>) -> Vec<BoardInfo> {
    let output = match run_pio_command(&["boards", "--json-output"], platformio_path.as_deref()) {
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
            let name = b
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or(&id)
                .to_string();
            let platform = b
                .get("platform")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            Some(BoardInfo {
                id,
                name,
                platform,
                mcu: b.get("mcu").and_then(|v| v.as_str()).map(String::from),
                frequency: b.get("frequencies").and_then(|v| {
                    v.as_object()?
                        .values()
                        .next()
                        .and_then(|f| f.as_str())
                        .map(String::from)
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
            let pid_str = pid.to_string();
            let _ = SyncCommand::new("kill")
                .args(["-TERM", &pid_str])
                .spawn()
                .map_err(|e| format!("Failed to spawn kill: {}", e))?
                .wait()
                .map_err(|e| format!("Failed to wait on kill: {}", e))?;

            std::thread::sleep(std::time::Duration::from_millis(500));

            let _ = SyncCommand::new("kill")
                .args(["-KILL", &pid_str])
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
    platformio_path: Option<String>,
) -> Result<BuildResult, String> {
    use std::time::Instant;

    let start = Instant::now();
    let pio_cmd = get_pio_command(platformio_path.as_deref());
    let mut cmd = tokio::process::Command::new(&pio_cmd);
    cmd.args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn pio: {}", e))?;
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

    let status = child
        .wait()
        .await
        .map_err(|e| format!("Failed to wait on pio: {}", e))?;

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
    platformio_path: Option<String>,
) -> Result<BuildResult, String> {
    run_platformio_command(
        state,
        vec!["run".to_string(), "-d".to_string(), project_path],
        app,
        platformio_path,
    )
    .await
}

#[command]
pub async fn upload_firmware(
    state: tauri::State<'_, BuildState>,
    project_path: String,
    board: Option<String>,
    port: Option<String>,
    app: tauri::AppHandle,
    platformio_path: Option<String>,
) -> Result<BuildResult, String> {
    // First, read platformio.ini to detect ESP boards
    let pio_ini_path = std::path::Path::new(&project_path).join("platformio.ini");
    let pio_ini_content = std::fs::read_to_string(&pio_ini_path).unwrap_or_default();
    let is_esp_board = pio_ini_content.contains("esp8266")
        || pio_ini_content.contains("esp32")
        || pio_ini_content.contains("espressif8266")
        || pio_ini_content.contains("espressif32");

    // For ESP boards, erase flash before upload to prevent conflicts with old firmware
    if is_esp_board {
        let _ = app.emit(
            "build-output",
            "[UPLOAD] Erasing flash before upload (ESP board detected)...".to_string(),
        );
        let erase_args = vec![
            "run".to_string(),
            "--target".to_string(),
            "erase".to_string(),
            "-d".to_string(),
            project_path.clone(),
        ];
        let erase_result = run_platformio_command(
            state.clone(),
            erase_args,
            app.clone(),
            platformio_path.clone(),
        )
        .await;
        if let Ok(result) = erase_result {
            if !result.success {
                let _ = app.emit(
                    "build-output",
                    format!(
                        "[UPLOAD] Flash erase failed, continuing with upload: {}",
                        result.stderr
                    ),
                );
            } else {
                let _ = app.emit(
                    "build-output",
                    "[UPLOAD] Flash erased successfully".to_string(),
                );
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
    if let Some(b) = board {
        args.push("--environment".to_string());
        args.push(b);
    }
    if let Some(p) = port {
        args.push("--upload-port".to_string());
        args.push(p);
    }
    run_platformio_command(state, args, app, platformio_path).await
}

#[command]
pub async fn erase_flash(
    state: tauri::State<'_, BuildState>,
    project_path: String,
    app: tauri::AppHandle,
    platformio_path: Option<String>,
) -> Result<BuildResult, String> {
    let args = vec![
        "run".to_string(),
        "--target".to_string(),
        "erase".to_string(),
        "-d".to_string(),
        project_path,
    ];
    run_platformio_command(state, args, app, platformio_path).await
}

#[command]
pub fn parse_build_errors(output: String) -> Vec<serde_json::Value> {
    let mut errors = Vec::new();

    for line in output.lines() {
        if line.contains("error:") || line.contains("Error:") || line.contains("ERROR:") {
            let error_type = if line.contains("warning:") || line.contains("Warning:") {
                "warning"
            } else {
                "error"
            };
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
    let colon_pos = line
        .find("error:")
        .or_else(|| line.find("Error:"))
        .or_else(|| line.find("ERROR:"))
        .or_else(|| line.find("warning:"))
        .or_else(|| line.find("Warning:"));

    let colon_pos = colon_pos?;
    let prefix = &line[..colon_pos].trim_end_matches(':');

    let parts: Vec<&str> = prefix.rsplitn(3, ':').collect();

    if parts.len() >= 3 {
        let line_num = parts[0];
        let col_or_file = parts[1];
        let file = parts[2];

        if line_num.parse::<u32>().is_ok()
            && (col_or_file.parse::<u32>().is_ok() || !col_or_file.is_empty())
        {
            let message = line[colon_pos..]
                .trim_start_matches(|c: char| c.is_alphabetic() || c == ':')
                .trim()
                .to_string();
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
            let message = line[colon_pos..]
                .trim_start_matches(|c: char| c.is_alphabetic() || c == ':')
                .trim()
                .to_string();
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
pub async fn install_platformio(platformio_path: Option<String>) -> Result<String, String> {
    use tokio::process::Command;

    let python_cmds = if cfg!(windows) {
        vec![
            "py".to_string(),
            "python".to_string(),
            "python3".to_string(),
        ]
    } else {
        vec![
            "/usr/bin/python3".to_string(),
            "/usr/local/bin/python3".to_string(),
            "/bin/python3".to_string(),
            "python3".to_string(),
            "python".to_string(),
        ]
    };

    let mut installed = false;
    let mut last_error = String::new();

    for python_cmd in python_cmds {
        let mut args = vec!["-m", "pip"];
        if !cfg!(windows) {
            args.push("install");
            args.push("--user");
            args.push("platformio");
        } else {
            args.push("install");
            args.push("platformio");
        }

        let output = Command::new(&python_cmd).args(args).output().await;

        match output {
            Ok(out) => {
                if out.status.success() {
                    installed = true;
                    break;
                } else {
                    let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
                    if !cfg!(windows) && stderr.contains("externally-managed-environment") {
                        return install_platformio_in_venv().await;
                    }

                    last_error = if stderr.is_empty() {
                        format!("{} exited with status {}", python_cmd, out.status)
                    } else {
                        format!("{}: {}", python_cmd, stderr)
                    };
                }
            }
            Err(e) => {
                last_error = format!("Failed to run {}: {}", python_cmd, e);
            }
        }
    }

    if installed {
        if let Some(path) = normalize_platformio_override(platformio_path.as_deref()) {
            if let Ok(out) = run_pio_version(path) {
                if out.status.success() {
                    let version = String::from_utf8_lossy(&out.stdout).trim().to_string();
                    return Ok(format!("PlatformIO installed successfully: {}", version));
                }
            }
        }

        if let Some(path) = platformio_venv_pio().filter(|p| p.exists()) {
            if let Ok(out) = run_pio_version(path.to_string_lossy().as_ref()) {
                if out.status.success() {
                    let version = String::from_utf8_lossy(&out.stdout).trim().to_string();
                    return Ok(format!("PlatformIO installed successfully: {}", version));
                }
            }
        } else if let Some(path) = find_pio_in_filesystem() {
            if let Ok(out) = run_pio_version(&path) {
                if out.status.success() {
                    let version = String::from_utf8_lossy(&out.stdout).trim().to_string();
                    return Ok(format!("PlatformIO installed successfully: {}", version));
                }
            }
        }
        Ok("PlatformIO installed successfully".to_string())
    } else {
        Err(format!("Failed to install PlatformIO: {}", last_error))
    }
}

#[command]
pub async fn install_platform(
    platform: String,
    platformio_path: Option<String>,
) -> Result<String, String> {
    let mut cmd = tokio::process::Command::new(get_pio_command(platformio_path.as_deref()));
    let output = cmd
        .args(["platform", "install", &platform])
        .output()
        .await
        .map_err(|e| format!("Failed to install platform {}: {}", platform, e))?;

    if output.status.success() {
        Ok(format!("Platform {} installed successfully", platform))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!(
            "Failed to install platform {}: {}",
            platform, stderr
        ))
    }
}
