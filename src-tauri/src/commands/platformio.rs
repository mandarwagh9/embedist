use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::command;

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
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PlatformInfo {
    pub version: String,
    pub core_version: String,
    pub installed: bool,
}

fn run_command(cmd: &str, args: &[&str]) -> Result<std::process::Output, String> {
    let output = Command::new(cmd)
        .args(args)
        .output()
        .map_err(|e| format!("Failed to execute command: {}", e))?;
    
    Ok(output)
}

#[command]
pub fn check_platformio() -> PlatformInfo {
    let output = run_command("pio", &["--version"]);
    
    match output {
        Ok(out) => {
            let version = String::from_utf8_lossy(&out.stdout).trim().to_string();
            PlatformInfo {
                version: version.clone(),
                core_version: "".to_string(),
                installed: true,
            }
        }
        Err(_) => PlatformInfo {
            version: "Not installed".to_string(),
            core_version: "".to_string(),
            installed: false,
        },
    }
}

#[command]
pub fn list_connected_boards() -> Result<Vec<BoardInfo>, String> {
    let output = run_command("pio", &["device", "list", "--json-output"])?;
    
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
    vec![
        BoardInfo {
            id: "esp32dev".to_string(),
            name: "ESP32 Dev Module".to_string(),
            platform: "espressif32".to_string(),
            mcu: Some("ESP32".to_string()),
            frequency: Some("240MHz".to_string()),
            flash_size: Some("4MB".to_string()),
            ram_size: Some("520KB".to_string()),
        },
        BoardInfo {
            id: "esp32-s3-devkitc-1".to_string(),
            name: "ESP32-S3 DevKitC-1".to_string(),
            platform: "espressif32".to_string(),
            mcu: Some("ESP32-S3".to_string()),
            frequency: Some("240MHz".to_string()),
            flash_size: Some("8MB".to_string()),
            ram_size: Some("512KB".to_string()),
        },
        BoardInfo {
            id: "esp32-c3-devkitm-1".to_string(),
            name: "ESP32-C3 DevKitM-1".to_string(),
            platform: "espressif32".to_string(),
            mcu: Some("ESP32-C3".to_string()),
            frequency: Some("160MHz".to_string()),
            flash_size: Some("4MB".to_string()),
            ram_size: Some("400KB".to_string()),
        },
        BoardInfo {
            id: "esp32-c6-devkitm-1".to_string(),
            name: "ESP32-C6 DevKitM-1".to_string(),
            platform: "espressif32".to_string(),
            mcu: Some("ESP32-C6".to_string()),
            frequency: Some("160MHz".to_string()),
            flash_size: Some("4MB".to_string()),
            ram_size: Some("512KB".to_string()),
        },
        BoardInfo {
            id: "uno".to_string(),
            name: "Arduino Uno".to_string(),
            platform: "atmelavr".to_string(),
            mcu: Some("ATmega328P".to_string()),
            frequency: Some("16MHz".to_string()),
            flash_size: Some("32KB".to_string()),
            ram_size: Some("2KB".to_string()),
        },
        BoardInfo {
            id: "nano".to_string(),
            name: "Arduino Nano".to_string(),
            platform: "atmelavr".to_string(),
            mcu: Some("ATmega328P".to_string()),
            frequency: Some("16MHz".to_string()),
            flash_size: Some("32KB".to_string()),
            ram_size: Some("2KB".to_string()),
        },
        BoardInfo {
            id: "mega2560".to_string(),
            name: "Arduino Mega 2560".to_string(),
            platform: "atmelavr".to_string(),
            mcu: Some("ATmega2560".to_string()),
            frequency: Some("16MHz".to_string()),
            flash_size: Some("256KB".to_string()),
            ram_size: Some("8KB".to_string()),
        },
        BoardInfo {
            id: "due".to_string(),
            name: "Arduino Due".to_string(),
            platform: "atmelavr".to_string(),
            mcu: Some("SAM3X8E".to_string()),
            frequency: Some("84MHz".to_string()),
            flash_size: Some("512KB".to_string()),
            ram_size: Some("96KB".to_string()),
        },
        BoardInfo {
            id: "rpipico".to_string(),
            name: "Raspberry Pi Pico".to_string(),
            platform: "raspberrypi".to_string(),
            mcu: Some("RP2040".to_string()),
            frequency: Some("133MHz".to_string()),
            flash_size: Some("2MB".to_string()),
            ram_size: Some("264KB".to_string()),
        },
    ]
}

#[command]
pub async fn run_platformio_command(args: Vec<String>) -> Result<BuildResult, String> {
    use std::time::Instant;
    
    let start = Instant::now();
    
    let mut cmd = Command::new("pio");
    cmd.args(&args);
    
    let output = cmd.output().map_err(|e| format!("Failed to execute: {}", e))?;
    
    let duration = start.elapsed();
    
    Ok(BuildResult {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        return_code: output.status.code().unwrap_or(-1),
        duration_ms: duration.as_millis() as u64,
    })
}

#[command]
pub async fn build_project(project_path: String) -> Result<BuildResult, String> {
    run_platformio_command(vec![
        "run".to_string(),
        "-d".to_string(),
        project_path,
    ]).await
}

#[command]
pub async fn upload_firmware(project_path: String, port: Option<String>) -> Result<BuildResult, String> {
    let mut args = vec!["run".to_string(), "--target".to_string(), "upload".to_string(), "-d".to_string(), project_path];
    
    if let Some(p) = port {
        args.push("--upload-port".to_string());
        args.push(p);
    }
    
    run_platformio_command(args).await
}

#[command]
pub fn parse_build_errors(output: String) -> Vec<serde_json::Value> {
    let mut errors = Vec::new();
    
    for line in output.lines() {
        if line.contains("error:") || line.contains("Error:") || line.contains("ERROR:") {
            let parts: Vec<&str> = line.split(':').collect();
            
            if parts.len() >= 3 {
                let file = parts.get(0).unwrap_or(&"");
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
                let file = parts.get(0).unwrap_or(&"");
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
