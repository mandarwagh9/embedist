use parking_lot::Mutex;
use serde::Serialize;
use std::collections::HashMap;
use std::io::{BufReader, Read, Write};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicU32, Ordering};
use tauri::{AppHandle, Emitter, Manager, State};

static SESSION_COUNTER: AtomicU32 = AtomicU32::new(0);

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
    let mut cmd = Command::new(&command);
    cmd.args(&args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .env("TERM", "xterm-256color");

    if let Some(c) = cwd {
        cmd.current_dir(c);
    }

    let child = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn shell: {}", e))?;

    let id = SESSION_COUNTER.fetch_add(1, Ordering::Relaxed) + 1;

    {
        let mut sessions = state.sessions.lock();
        sessions.insert(id, PtySession { child });
    }

    let app_handle = app.clone();

    std::thread::spawn(move || {
        let state = app_handle.state::<PtyState>();
        let mut sessions = state.sessions.lock();

        if let Some(session) = sessions.get_mut(&id) {
            if let Some(stdout) = session.child.stdout.take() {
                let mut reader = BufReader::new(stdout);
                let mut buffer = [0u8; 4096];
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
    let mut sessions = state.sessions.lock();

    if let Some(session) = sessions.get_mut(&id) {
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
    let mut sessions = state.sessions.lock();

    if let Some(mut session) = sessions.remove(&id) {
        let _ = session.child.kill();
        let _ = session.child.wait();
    }

    Ok(())
}
