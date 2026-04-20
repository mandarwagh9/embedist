use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use serial2::{CharSize, FlowControl, Parity, SerialPort, Settings, StopBits};
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, State};

static SESSION_COUNTER: AtomicU32 = AtomicU32::new(0);

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SerialPortInfo {
    pub path: String,
    pub name: Option<String>,
}

struct SerialSession {
    session_id: u32,
    port_path: String,
    baud_rate: u32,
    port: Arc<SerialPort>,
    cancel: Arc<AtomicBool>,
}

#[derive(Default)]
pub struct SerialState {
    session: Mutex<Option<SerialSession>>,
}

#[derive(Debug, Clone, Serialize)]
struct SerialDataPayload {
    session_id: u32,
    data: Vec<u8>,
}

#[derive(Debug, Clone, Serialize)]
struct SerialDisconnectPayload {
    session_id: u32,
    port_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SerialOpenRequest {
    pub port_path: String,
    pub baud_rate: u32,
    pub data_bits: u8,
    pub stop_bits: u8,
    pub parity: String,
    pub dtr: bool,
    pub rts: bool,
}

fn map_char_size(data_bits: u8) -> Result<CharSize, String> {
    match data_bits {
        5 => Ok(CharSize::Bits5),
        6 => Ok(CharSize::Bits6),
        7 => Ok(CharSize::Bits7),
        8 => Ok(CharSize::Bits8),
        other => Err(format!("Unsupported data bits: {}", other)),
    }
}

fn map_stop_bits(stop_bits: u8) -> Result<StopBits, String> {
    match stop_bits {
        1 => Ok(StopBits::One),
        2 => Ok(StopBits::Two),
        other => Err(format!("Unsupported stop bits: {}", other)),
    }
}

fn map_parity(parity: &str) -> Result<Parity, String> {
    match parity.to_lowercase().as_str() {
        "none" => Ok(Parity::None),
        "even" => Ok(Parity::Even),
        "odd" => Ok(Parity::Odd),
        other => Err(format!("Unsupported parity: {}", other)),
    }
}

fn collect_available_ports() -> Vec<SerialPortInfo> {
    let from_serial2 = SerialPort::available_ports()
        .ok()
        .map(|ports| {
            ports
                .into_iter()
                .map(|path| {
                    let name = path.file_name().map(|n| n.to_string_lossy().to_string());
                    SerialPortInfo {
                        path: path.to_string_lossy().to_string(),
                        name,
                    }
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    let mut ports = from_serial2;
    let prefixes = [
        "/dev/ttyUSB",
        "/dev/ttyACM",
        "/dev/ttyS",
        "/dev/ttyAMA",
        "/dev/ttyXRUSB",
        "/dev/tty.",
    ];

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

    #[cfg(target_os = "linux")]
    {
        for dir in ["/dev/serial/by-id", "/dev/serial/by-path"] {
            if let Ok(entries) = std::fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.exists() {
                        let name = path.file_name().map(|n| n.to_string_lossy().to_string());
                        ports.push(SerialPortInfo {
                            path: path.to_string_lossy().to_string(),
                            name,
                        });
                    }
                }
            }
        }
    }

    ports.sort_by(|a, b| a.path.cmp(&b.path));
    ports.dedup_by(|a, b| a.path == b.path);
    ports
}

fn clear_current_session(state: &SerialState) -> Option<SerialSession> {
    state.session.lock().take()
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
    Ok(collect_available_ports())
}

#[tauri::command]
pub fn get_serial_state(state: State<'_, SerialState>) -> serde_json::Value {
    let session = state.session.lock();
    if let Some(session) = session.as_ref() {
        serde_json::json!({
            "connected": true,
            "port": session.port_path,
            "baud_rate": session.baud_rate,
            "session_id": session.session_id,
        })
    } else {
        serde_json::json!({
            "connected": false,
            "port": null,
            "baud_rate": 0,
            "session_id": null,
        })
    }
}

#[tauri::command]
pub async fn open_serial_port(
    app: AppHandle,
    state: State<'_, SerialState>,
    request: SerialOpenRequest,
) -> Result<u32, String> {
    let char_size = map_char_size(request.data_bits)?;
    let stop_bits = map_stop_bits(request.stop_bits)?;
    let parity = map_parity(&request.parity)?;

    let mut session_guard = state.session.lock();
    if let Some(existing) = session_guard.take() {
        existing.cancel.store(true, Ordering::SeqCst);
    }

    let mut port = SerialPort::open(&request.port_path, |mut settings: Settings| {
        settings.set_raw();
        settings.set_baud_rate(request.baud_rate)?;
        settings.set_char_size(char_size);
        settings.set_stop_bits(stop_bits);
        settings.set_parity(parity);
        settings.set_flow_control(FlowControl::None);
        Ok(settings)
    })
    .map_err(|e| format!("Failed to open serial port {}: {}", request.port_path, e))?;

    port.set_read_timeout(Duration::from_millis(100))
        .map_err(|e| format!("Failed to configure read timeout: {}", e))?;
    port.set_write_timeout(Duration::from_millis(1000))
        .map_err(|e| format!("Failed to configure write timeout: {}", e))?;

    if let Err(err) = port.set_dtr(request.dtr) {
        return Err(format!("Failed to set DTR: {}", err));
    }
    if let Err(err) = port.set_rts(request.rts) {
        return Err(format!("Failed to set RTS: {}", err));
    }

    let port = Arc::new(port);

    let session_id = SESSION_COUNTER.fetch_add(1, Ordering::Relaxed) + 1;
    let cancel = Arc::new(AtomicBool::new(false));
    let session = SerialSession {
        session_id,
        port_path: request.port_path.clone(),
        baud_rate: request.baud_rate,
        port: port.clone(),
        cancel: cancel.clone(),
    };

    session_guard.replace(session);
    drop(session_guard);

    let app_handle = app.clone();
    let port_path = request.port_path.clone();

    std::thread::spawn(move || {
        let mut buffer = [0u8; 4096];

        loop {
            if cancel.load(Ordering::SeqCst) {
                break;
            }

            match port.as_ref().read(&mut buffer) {
                Ok(0) => break,
                Ok(n) => {
                    let data = buffer[..n].to_vec();
                    let _ = app_handle.emit("serial-data", SerialDataPayload { session_id, data });
                }
                Err(err) if err.kind() == std::io::ErrorKind::TimedOut => continue,
                Err(err) => {
                    let _ = app_handle.emit(
                        "serial-error",
                        serde_json::json!({
                            "session_id": session_id,
                            "port_path": port_path,
                            "error": err.to_string(),
                        }),
                    );
                    break;
                }
            }
        }

        let _ = app_handle.emit(
            "serial-disconnected",
            SerialDisconnectPayload {
                session_id,
                port_path,
            },
        );

        let state = app_handle.state::<SerialState>();
        let mut guard = state.session.lock();
        if guard
            .as_ref()
            .is_some_and(|current| current.session_id == session_id)
        {
            guard.take();
        }
    });

    Ok(session_id)
}

#[tauri::command]
pub async fn write_serial_port(
    session_id: u32,
    data: String,
    state: State<'_, SerialState>,
) -> Result<(), String> {
    let guard = state.session.lock();
    let session = guard.as_ref().ok_or("No active serial session")?;
    if session.session_id != session_id {
        return Err("Serial session is no longer active".to_string());
    }

    session
        .port
        .as_ref()
        .write_all(data.as_bytes())
        .map_err(|e| format!("Failed to write to serial port: {}", e))?;
    session
        .port
        .as_ref()
        .flush()
        .map_err(|e| format!("Failed to flush serial port: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn close_serial_port(
    session_id: u32,
    state: State<'_, SerialState>,
) -> Result<(), String> {
    let session = clear_current_session(&state);
    if let Some(session) = session {
        if session.session_id == session_id {
            session.cancel.store(true, Ordering::SeqCst);
        } else {
            state.session.lock().replace(session);
            return Err("Serial session is no longer active".to_string());
        }
    }
    Ok(())
}
