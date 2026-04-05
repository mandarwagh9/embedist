use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SerialPortInfo {
    pub path: String,
    pub name: Option<String>,
}

pub struct SerialState {
    pub connected: bool,
    pub port_path: Option<String>,
    pub baud_rate: u32,
}

impl Default for SerialState {
    fn default() -> Self {
        Self {
            connected: false,
            port_path: None,
            baud_rate: 115200,
        }
    }
}

#[tauri::command]
pub fn get_platform_info() -> serde_json::Value {
    serde_json::json!({
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
    })
}

#[tauri::command]
pub fn list_serial_ports() -> Result<Vec<SerialPortInfo>, String> {
    #[cfg(windows)]
    {
        let mut ports = Vec::new();
        for i in 1..=32 {
            let port_name = format!("COM{}", i);
            let key_path = format!(r"HKEY_LOCAL_MACHINE\HARDWARE\DEVICEMAP\SERIALCOMM\{}", port_name);
            if let Ok(key) = winreg::RegKey::predef(winreg::enums::HKEY_LOCAL_MACHINE)
                .open_subkey(r"HARDWARE\DEVICEMAP\SERIALCOMM")
            {
                if let Ok(value) = key.get_value::<String, _>(&port_name) {
                    ports.push(SerialPortInfo {
                        path: value,
                        name: Some(port_name),
                    });
                }
            }
            let _ = key_path;
        }
        if ports.is_empty() {
            for i in 1..=16 {
                let port_name = format!("COM{}", i);
                ports.push(SerialPortInfo {
                    path: port_name.clone(),
                    name: Some(port_name),
                });
            }
        }
        Ok(ports)
    }

    #[cfg(not(windows))]
    {
        let mut ports = Vec::new();
        let prefixes = ["/dev/ttyUSB", "/dev/ttyACM", "/dev/tty."];

        if let Ok(entries) = std::fs::read_dir("/dev") {
            for entry in entries.flatten() {
                if let Ok(name) = entry.file_name().into_string() {
                    for prefix in &prefixes {
                        if name.starts_with(prefix) {
                            ports.push(SerialPortInfo {
                                path: format!("/dev/{}", name),
                                name: Some(name),
                            });
                            break;
                        }
                    }
                }
            }
        }

        Ok(ports)
    }
}

#[tauri::command]
pub fn get_serial_state(state: State<'_, SerialState>) -> serde_json::Value {
    serde_json::json!({
        "connected": state.connected,
        "port": state.port_path,
        "baud_rate": state.baud_rate,
    })
}
