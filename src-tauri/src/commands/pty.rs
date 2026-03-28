use serde::Serialize;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};

#[derive(Default)]
pub struct PtyState {
    pub sessions: Mutex<HashMap<u32, PtySession>>,
}

pub struct PtySession {
    pub child: std::process::Child,
}

#[derive(Clone, Serialize)]
struct PtyDataPayload {
    data: String,
}

#[tauri::command]
pub async fn pty_spawn(
    command: String,
    args: Vec<String>,
    cwd: Option<String>,
    _cols: u16,
    _rows: u16,
    state: State<'_, PtyState>,
    app: AppHandle,
) -> Result<u32, String> {
    use std::process::Command;
    use std::io::Read;

    let mut cmd = Command::new(&command);
    cmd.args(&args);

    if let Some(c) = cwd {
        cmd.current_dir(c);
    }

    cmd.env("TERM", "xterm-256color");

    let child = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn shell: {}", e))?;

    let id = {
        let mut sessions = state.sessions.lock().map_err(|e| e.to_string())?;
        let id = sessions.len() as u32 + 1;
        sessions.insert(id, PtySession { child });
        id
    };

    let app_handle = app.clone();
    let pty_id = id;

    std::thread::spawn(move || {
        let state = app_handle.state::<PtyState>();
        let mut sessions = match state.sessions.lock() {
            Ok(s) => s,
            Err(_) => return,
        };

        if let Some(session) = sessions.get_mut(&pty_id) {
            if let Some(stdout) = session.child.stdout.take() {
                let mut reader = std::io::BufReader::new(stdout);
                let mut buffer = [0u8; 1024];
                loop {
                    match reader.read(&mut buffer) {
                        Ok(0) => break,
                        Ok(n) => {
                            let data = String::from_utf8_lossy(&buffer[..n]).to_string();
                            let _ = app_handle.emit("pty-data", PtyDataPayload { data });
                        }
                        Err(_) => break,
                    }
                }
            }
        }
    });

    Ok(id)
}

#[tauri::command]
pub async fn pty_write(id: u32, data: String, state: State<'_, PtyState>) -> Result<(), String> {
    let mut sessions = state.sessions.lock().map_err(|e| e.to_string())?;

    if let Some(session) = sessions.get_mut(&id) {
        use std::io::Write;
        if let Some(stdin) = session.child.stdin.as_mut() {
            stdin
                .write_all(data.as_bytes())
                .map_err(|e| format!("Failed to write to PTY: {}", e))?;
            stdin.flush().map_err(|e| format!("Failed to flush PTY: {}", e))?;
        }
    } else {
        return Err("PTY session not found".to_string());
    }

    Ok(())
}

#[tauri::command]
pub async fn pty_resize(_id: u32, _cols: u16, _rows: u16, _state: State<'_, PtyState>) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub async fn pty_kill(id: u32, state: State<'_, PtyState>) -> Result<(), String> {
    let mut sessions = state.sessions.lock().map_err(|e| e.to_string())?;

    if let Some(mut session) = sessions.remove(&id) {
        session.child.kill().map_err(|e| format!("Failed to kill PTY: {}", e))?;
    }

    Ok(())
}
