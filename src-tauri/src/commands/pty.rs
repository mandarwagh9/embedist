use parking_lot::Mutex;
use serde::Serialize;
use std::collections::HashMap;
use std::io::{BufReader, Read, Write};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, State};

static SESSION_COUNTER: AtomicU32 = AtomicU32::new(0);

#[derive(Default)]
pub struct PtyState {
    pub sessions: Mutex<HashMap<u32, Arc<Mutex<PtySession>>>>,
}

pub struct PtySession {
    pub child: Child,
    pub cols: u16,
    pub rows: u16,
}

#[derive(Clone, Serialize)]
struct PtyDataPayload {
    session_id: u32,
    data: String,
}

#[tauri::command]
pub async fn pty_spawn(
    command: String,
    args: Vec<String>,
    cwd: Option<String>,
    cols: u16,
    rows: u16,
    state: State<'_, PtyState>,
    app: AppHandle,
) -> Result<u32, String> {
    let home = dirs::home_dir().unwrap_or_default();
    let default_cwd = if home.to_string_lossy().is_empty() {
        ".".to_string()
    } else {
        home.to_string_lossy().to_string()
    };
    let effective_cwd = cwd.as_deref().unwrap_or(&default_cwd);

    let mut cmd = Command::new(&command);
    cmd.args(&args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .env("TERM", "xterm-256color")
        .current_dir(effective_cwd);

    let child = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn shell: {}", e))?;

    let id = SESSION_COUNTER.fetch_add(1, Ordering::Relaxed) + 1;

    let session = Arc::new(Mutex::new(PtySession { child, cols, rows }));

    {
        let mut sessions = state.sessions.lock();
        sessions.insert(id, session.clone());
    }

    let app_handle = app.clone();

    std::thread::spawn(move || {
        let mut sess = session.lock();
        let stdout = sess.child.stdout.take();
        let stderr = sess.child.stderr.take();
        drop(sess);

        let mut handles = vec![];

        if let Some(stdout) = stdout {
            let app_h = app_handle.clone();
            let sid = id;
            handles.push(std::thread::spawn(move || {
                let mut reader = BufReader::new(stdout);
                let mut buffer = [0u8; 4096];
                loop {
                    match reader.read(&mut buffer) {
                        Ok(0) => break,
                        Ok(n) => {
                            let data = String::from_utf8_lossy(&buffer[..n]).to_string();
                            let _ = app_h.emit("pty-data", PtyDataPayload { session_id: sid, data });
                        }
                        Err(_) => break,
                    }
                }
            }));
        }

        if let Some(stderr) = stderr {
            let app_h = app_handle.clone();
            let sid = id;
            handles.push(std::thread::spawn(move || {
                let mut reader = BufReader::new(stderr);
                let mut buffer = [0u8; 4096];
                loop {
                    match reader.read(&mut buffer) {
                        Ok(0) => break,
                        Ok(n) => {
                            let data = String::from_utf8_lossy(&buffer[..n]).to_string();
                            let _ = app_h.emit("pty-data", PtyDataPayload { session_id: sid, data });
                        }
                        Err(_) => break,
                    }
                }
            }));
        }

        for h in handles {
            let _ = h.join();
        }

        let pty_state = app_handle.state::<PtyState>();
        pty_state.sessions.lock().remove(&id);
    });

    Ok(id)
}

#[tauri::command]
pub async fn pty_write(id: u32, data: String, state: State<'_, PtyState>) -> Result<(), String> {
    let sessions = state.sessions.lock();
    let session = sessions.get(&id).ok_or("PTY session not found")?;
    let mut sess = session.lock();

    if let Some(stdin) = sess.child.stdin.as_mut() {
        stdin
            .write_all(data.as_bytes())
            .map_err(|e| format!("Failed to write to PTY: {}", e))?;
        stdin.flush().map_err(|e| format!("Failed to flush PTY: {}", e))?;
        Ok(())
    } else {
        Err("PTY stdin is not available".to_string())
    }
}

#[tauri::command]
pub async fn pty_resize(id: u32, cols: u16, rows: u16, state: State<'_, PtyState>) -> Result<(), String> {
    let sessions = state.sessions.lock();
    let session = sessions.get(&id).ok_or("PTY session not found")?;
    let mut sess = session.lock();
    sess.cols = cols;
    sess.rows = rows;

    #[cfg(windows)]
    {
        let _ = sess.child.stdin.as_ref().map(|_| ());
    }

    #[cfg(not(windows))]
    {
        use std::os::unix::process::CommandExt;
        let _ = unsafe {
            libc::ioctl(
                sess.child.stdout.as_ref().map(|s| s.as_raw_fd()).unwrap_or(-1),
                libc::TIOCSWINSZ as _,
                &libc::winsize {
                    ws_row: rows,
                    ws_col: cols,
                    ws_xpixel: 0,
                    ws_ypixel: 0,
                },
            )
        };
    }

    Ok(())
}

#[tauri::command]
pub async fn pty_kill(id: u32, state: State<'_, PtyState>) -> Result<(), String> {
    let mut sessions = state.sessions.lock();

    if let Some(session) = sessions.remove(&id) {
        let mut sess = session.lock();
        let _ = sess.child.kill();
        let _ = sess.child.wait();
    }

    Ok(())
}
