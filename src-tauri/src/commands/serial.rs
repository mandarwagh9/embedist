use serde::{Deserialize, Serialize};
use parking_lot::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SerialPortInfo {
    pub path: String,
    pub name: Option<String>,
}

pub struct SerialState {
    pub connected: Mutex<bool>,
    pub port_path: Mutex<Option<String>>,
    pub baud_rate: Mutex<u32>,
}

impl Default for SerialState {
    fn default() -> Self {
        Self {
            connected: Mutex::new(false),
            port_path: Mutex::new(None),
            baud_rate: Mutex::new(115200),
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
        
        for i in 0..256 {
            let port_name = format!("COM{}", i);
            if std::fs::metadata(&port_name).is_ok() {
                ports.push(SerialPortInfo {
                    path: port_name,
                    name: None,
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
    let connected = *state.connected.lock();
    let port_path = state.port_path.lock().clone();
    let baud_rate = *state.baud_rate.lock();
    
    serde_json::json!({
        "connected": connected,
        "port": port_path,
        "baud_rate": baud_rate,
    })
}
