use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Component, Path, PathBuf};
use tauri::command;
use tauri::{Emitter, Manager};
use tokio::process::Command as AsyncCommand;
use parking_lot::Mutex;
use std::sync::Arc;
use notify::{RecommendedWatcher, RecursiveMode, Watcher, EventKind};

fn normalize_lexical(path: &Path) -> PathBuf {
    let mut normalized = PathBuf::new();
    for component in path.components() {
        match component {
            Component::CurDir => {}
            Component::ParentDir => {
                normalized.pop();
            }
            other => normalized.push(other.as_os_str()),
        }
    }
    normalized
}

fn resolve_path_for_validation(path: &Path, canonical_root: &Path) -> Result<PathBuf, String> {
    let candidate = if path.is_absolute() {
        path.to_path_buf()
    } else {
        canonical_root.join(path)
    };

    let normalized = normalize_lexical(&candidate);

    if normalized.exists() {
        return normalized
            .canonicalize()
            .map_err(|e| format!("Cannot resolve path: {}", e));
    }

    let mut pending: Vec<std::ffi::OsString> = Vec::new();
    let mut cursor = normalized.as_path();

    while !cursor.exists() {
        let name = cursor
            .file_name()
            .ok_or_else(|| format!("Cannot resolve path: {}", normalized.display()))?;
        pending.push(name.to_os_string());
        cursor = cursor
            .parent()
            .ok_or_else(|| format!("Cannot resolve path: {}", normalized.display()))?;
    }

    let mut resolved = cursor
        .canonicalize()
        .map_err(|e| format!("Cannot resolve path: {}", e))?;

    for segment in pending.iter().rev() {
        resolved.push(segment);
    }

    Ok(resolved)
}

fn validate_path_buf(path: &Path, allowed_root: &str) -> Result<PathBuf, String> {
    if allowed_root.trim().is_empty() {
        let normalized = normalize_lexical(path);
        if normalized.exists() {
            return normalized
                .canonicalize()
                .map_err(|e| format!("Cannot resolve path: {}", e));
        }
        return Ok(normalized);
    }

    let canonical_root = PathBuf::from(allowed_root)
        .canonicalize()
        .map_err(|e| format!("Invalid project root: {}", e))?;

    let resolved = resolve_path_for_validation(path, &canonical_root)?;

    if resolved.starts_with(&canonical_root) {
        Ok(resolved)
    } else {
        Err("Access denied: path is outside project root".to_string())
    }
}

fn validate_path(path: &str, allowed_root: &str) -> Result<PathBuf, String> {
    validate_path_buf(Path::new(path), allowed_root)
}

fn validate_leaf_name(name: &str, label: &str) -> Result<String, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(format!("Invalid {}: name cannot be empty", label));
    }

    let mut components = Path::new(trimmed).components();
    match (components.next(), components.next()) {
        (Some(Component::Normal(_)), None) => Ok(trimmed.to_string()),
        _ => Err(format!(
            "Invalid {}: must be a single file or folder name",
            label
        )),
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub is_file: bool,
    pub size: u64,
    pub modified: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DirectoryTree {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Vec<DirectoryTree>,
}

#[command]
pub fn read_file(path: String, root: String) -> Result<String, String> {
    let p = validate_path(&path, &root)?;
    fs::read_to_string(&p).map_err(|e| format!("Failed to read file: {}", e))
}

#[command]
pub fn write_file(path: String, content: String, root: String) -> Result<(), String> {
    let p = validate_path(&path, &root)?;
    fs::write(&p, content).map_err(|e| format!("Failed to write file: {}", e))
}

#[command]
pub fn create_file(parent: String, name: String, root: String) -> Result<String, String> {
    let name = validate_leaf_name(&name, "file name")?;
    let parent_path = validate_path(&parent, &root)?;
    let path = validate_path_buf(&parent_path.join(&name), &root)?;
    fs::write(&path, "").map_err(|e| format!("Failed to create file: {}", e))?;
    Ok(path.to_string_lossy().to_string())
}

#[command]
pub fn create_folder(parent: String, name: String, root: String) -> Result<String, String> {
    let name = validate_leaf_name(&name, "folder name")?;
    let parent_path = validate_path(&parent, &root)?;
    let path = validate_path_buf(&parent_path.join(&name), &root)?;
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create folder: {}", e))?;
    Ok(path.to_string_lossy().to_string())
}

#[command]
pub fn delete_path(path: String, root: String) -> Result<(), String> {
    let p = validate_path(&path, &root)?;
    if p.is_dir() {
        fs::remove_dir_all(&p).map_err(|e| format!("Failed to delete folder: {}", e))
    } else {
        fs::remove_file(&p).map_err(|e| format!("Failed to delete file: {}", e))
    }
}

#[command]
pub fn rename_path(old_path: String, new_name: String, root: String) -> Result<String, String> {
    let new_name = validate_leaf_name(&new_name, "new name")?;
    let old = validate_path(&old_path, &root)?;
    let parent = old.parent().ok_or("No parent directory")?;
    let new_path = validate_path_buf(&parent.join(&new_name), &root)?;
    fs::rename(&old, &new_path).map_err(|e| format!("Failed to rename: {}", e))?;
    Ok(new_path.to_string_lossy().to_string())
}

#[command]
pub fn move_path(old_path: String, new_path_str: String, root: String) -> Result<String, String> {
    let old = validate_path(&old_path, &root)?;
    let new_path = validate_path(&new_path_str, &root)?;
    fs::rename(&old, &new_path).map_err(|e| format!("Failed to move: {}", e))?;
    Ok(new_path.to_string_lossy().to_string())
}

#[command]
pub fn list_directory(path: String, root: String) -> Result<Vec<FileEntry>, String> {
    let p = validate_path(&path, &root)?;
    let entries = fs::read_dir(&p).map_err(|e| format!("Failed to read directory: {}", e))?;
    
    let mut files: Vec<FileEntry> = entries
        .filter_map(|entry| entry.ok())
        .map(|entry| {
            let path = entry.path();
            let metadata = entry.metadata().ok();
            let modified = metadata.as_ref().and_then(|m| m.modified().ok())
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs());
            
            FileEntry {
                name: entry.file_name().to_string_lossy().to_string(),
                path: path.to_string_lossy().to_string(),
                is_dir: path.is_dir(),
                is_file: path.is_file(),
                size: metadata.as_ref().map(|m| m.len()).unwrap_or(0),
                modified,
            }
        })
        .collect();
    
    files.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });
    
    Ok(files)
}

#[command]
pub fn get_directory_tree(path: String, depth: Option<u32>, root: String) -> Result<DirectoryTree, String> {
    validate_path(&path, &root)?;
    let max_depth = depth.unwrap_or(3);
    
    fn build_tree(path: &str, current_depth: u32, max_depth: u32) -> Result<DirectoryTree, String> {
        let p = PathBuf::from(path);
        let name = p.file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| path.to_string());
        
        if p.is_file() || current_depth >= max_depth {
            return Ok(DirectoryTree {
                name,
                path: path.to_string(),
                is_dir: false,
                children: vec![],
            });
        }
        
        let entries = fs::read_dir(path).map_err(|e| format!("Failed to read directory: {}", e))?;
        let mut children: Vec<DirectoryTree> = Vec::new();
        
        for entry in entries.filter_map(|e| e.ok()) {
            let child_path = entry.path();
            if let Ok(child) = build_tree(&child_path.to_string_lossy(), current_depth + 1, max_depth) {
                children.push(child);
            }
        }
        
        children.sort_by(|a, b| {
            match (a.is_dir, b.is_dir) {
                (true, false) => std::cmp::Ordering::Less,
                (false, true) => std::cmp::Ordering::Greater,
                _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
            }
        });
        
        Ok(DirectoryTree {
            name,
            path: path.to_string(),
            is_dir: true,
            children,
        })
    }
    
    build_tree(&path, 0, max_depth)
}

#[command]
pub fn file_exists(path: String, root: String) -> bool {
    validate_path(&path, &root).map(|p| p.exists()).unwrap_or(false)
}

#[command]
pub fn is_platformio_project(path: String, root: String) -> bool {
    validate_path(&path, &root).map(|p| {
        let platformio_ini = p.join("platformio.ini");
        platformio_ini.exists()
    }).unwrap_or(false)
}

#[command]
pub fn read_platformio_board(path: String, root: String) -> Result<String, String> {
    let p = validate_path(&path, &root)?;
    let platformio_ini = p.join("platformio.ini");
    let content = fs::read_to_string(&platformio_ini)
        .map_err(|e| format!("Failed to read platformio.ini: {}", e))?;
    
    let mut board = String::new();
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("board = ") {
            board = trimmed.trim_start_matches("board = ").to_string();
            break;
        }
    }
    
    if board.is_empty() {
        return Err("No board specified in platformio.ini".to_string());
    }
    
    Ok(board)
}

fn platformio_board_platform(board: &str) -> Option<(&'static str, &'static str)> {
    match board {
        "arduino_nano" | "arduino_mega2560" | "arduino_uno" | "atmega328p" => Some(("atmelavr", "arduino")),
        "nano33ble" => Some(("nordicnrf52", "arduino")),
        "esp32dev" | "esp32-s3-devkitc-1" | "esp32-c3-devkitm-1" => Some(("espressif32", "arduino")),
        "esp01_1m" | "esp01_512k" | "esp01_256k" => Some(("espressif8266", "arduino")),
        "rpipico" => Some(("raspberrypi", "arduino")),
        _ => None,
    }
}

#[command]
pub fn initialize_platformio_project(path: String, root: String, board: String) -> Result<String, String> {
    let project_root = validate_path(&path, &root)?;
    if !project_root.is_dir() {
        return Err("Project path must be a folder".to_string());
    }

    let platformio_ini = project_root.join("platformio.ini");
    if platformio_ini.exists() {
        return Err("platformio.ini already exists in this folder".to_string());
    }

    let (platform, framework) = platformio_board_platform(&board)
        .ok_or_else(|| format!("Unsupported board '{}'", board))?;

    let project_name = project_root
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("embedist");

    let ini = format!(
        "[env:{board}]\nplatform = {platform}\nboard = {board}\nframework = {framework}\nmonitor_speed = 115200\n\n",
        board = board,
        platform = platform,
        framework = framework
    );

    fs::write(&platformio_ini, ini).map_err(|e| format!("Failed to create platformio.ini: {}", e))?;

    let src_dir = project_root.join("src");
    fs::create_dir_all(&src_dir).map_err(|e| format!("Failed to create src directory: {}", e))?;

    let main_cpp = src_dir.join("main.cpp");
    if !main_cpp.exists() {
        let sketch = format!(
            "#include <Arduino.h>\n\nvoid setup() {{\n  Serial.begin(115200);\n  delay(1000);\n  Serial.println(\"{project_name} ready\");\n}}\n\nvoid loop() {{\n  delay(1000);\n}}\n",
            project_name = project_name
        );
        fs::write(&main_cpp, sketch).map_err(|e| format!("Failed to create src/main.cpp: {}", e))?;
    }

    Ok(project_root.to_string_lossy().to_string())
}

#[command]
pub fn get_home_dir() -> Result<String, String> {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Could not determine home directory".to_string())
}

#[command]
pub fn get_parent_dir(path: String) -> Option<String> {
    PathBuf::from(&path)
        .parent()
        .map(|p| p.to_string_lossy().to_string())
}

#[command]
pub fn save_plan_file(directory: String, name: String, content: String, root: String) -> Result<String, String> {
    let path = if root.is_empty() {
        PathBuf::from(&name)
    } else {
        let parent = validate_path(&directory, &root)?;
        parent.join(&name)
    };
    fs::write(&path, content).map_err(|e| format!("Failed to save plan: {}", e))?;
    Ok(path.to_string_lossy().to_string())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub path: String,
    pub line_number: usize,
    pub content: String,
}

#[command]
pub fn grep_search(
    root_path: String,
    pattern: String,
    file_pattern: Option<String>,
    max_results: Option<usize>,
    root: Option<String>,
) -> Result<Vec<SearchResult>, String> {
    let validated_root = if let Some(r) = root.as_ref() {
        if !r.trim().is_empty() {
            Some(validate_path(r, r)?)
        } else {
            None
        }
    } else {
        None
    };

    let search_root = if let Some(project_root) = validated_root.as_ref() {
        validate_path_buf(Path::new(&root_path), &project_root.to_string_lossy())?
    } else {
        PathBuf::from(&root_path)
    };

    let max = max_results.unwrap_or(100);
    let pattern_lower = pattern.to_lowercase();
    let file_pat = file_pattern.as_deref();

    fn matches_file(name: &str, pattern: Option<&str>) -> bool {
        match pattern {
            None => true,
            Some(pat) => {
                let pat = pat.to_lowercase();
                if pat.starts_with('*') && pat.ends_with('*') {
                    let inner = pat.strip_prefix('*').and_then(|s| s.strip_suffix('*')).unwrap_or(&pat);
                    name.to_lowercase().contains(inner)
                } else if pat.starts_with('*') {
                    let stripped = pat.strip_prefix('*').unwrap_or(&pat);
                    name.to_lowercase().ends_with(stripped)
                } else if pat.ends_with('*') {
                    let stripped = pat.strip_suffix('*').unwrap_or(&pat);
                    name.to_lowercase().starts_with(stripped)
                } else {
                    name.to_lowercase() == pat
                }
            }
        }
    }

    fn search_dir(dir: &str, pat: &str, file_pat: Option<&str>, max: usize, results: &mut Vec<SearchResult>) {
        if results.len() >= max { return; }
        let entries = match fs::read_dir(dir) {
            Ok(e) => e,
            Err(_) => return,
        };
        for entry in entries.filter_map(|e| e.ok()) {
            if results.len() >= max { break; }
            let path = entry.path();
            if path.is_dir() {
                let dirs_to_skip = ["target", ".git", ".pio", "node_modules"];
                let name = path.file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();
                if !dirs_to_skip.contains(&name.as_str()) {
                    search_dir(&path.to_string_lossy(), pat, file_pat, max, results);
                }
            } else if path.is_file() {
                let name = path.file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();
                if !matches_file(&name, file_pat) { continue; }
                if let Ok(content) = fs::read_to_string(&path) {
                    for (line_num, line) in content.lines().enumerate() {
                        if line.to_lowercase().contains(pat) {
                            results.push(SearchResult {
                                path: path.to_string_lossy().to_string(),
                                line_number: line_num + 1,
                                content: line.trim_end().to_string(),
                            });
                            if results.len() >= max { break; }
                        }
                    }
                }
            }
        }
    }

    let mut results = Vec::new();
    search_dir(&search_root.to_string_lossy(), &pattern_lower, file_pat, max, &mut results);
    Ok(results)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ShellResult {
    pub stdout: String,
    pub stderr: String,
    pub return_code: i32,
}

#[command]
pub fn reveal_in_explorer(path: String, root: Option<String>) -> Result<(), String> {
    let safe_path = if let Some(r) = root.as_ref() {
        if r.trim().is_empty() {
            PathBuf::from(&path)
        } else {
            validate_path(&path, r)?
        }
    } else {
        PathBuf::from(&path)
    };

    let _target = if safe_path.is_file() || safe_path.is_dir() {
        safe_path.to_string_lossy().to_string()
    } else {
        return Err(format!("Path does not exist: {}", safe_path.to_string_lossy()));
    };

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(format!("/select,{}", _target))
            .spawn()
            .map_err(|e| format!("Failed to open explorer: {}", e))?
            .wait()
            .map_err(|e| format!("Failed to wait on explorer: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", &_target])
            .spawn()
            .map_err(|e| format!("Failed to open finder: {}", e))?
            .wait()
            .map_err(|e| format!("Failed to wait on finder: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        let dir = safe_path.parent().unwrap_or(&safe_path);
        std::process::Command::new("xdg-open")
            .arg(dir)
            .spawn()
            .map_err(|e| format!("Failed to open file manager: {}", e))?
            .wait()
            .map_err(|e| format!("Failed to wait on file manager: {}", e))?;
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        let _ = path;
        return Err("Unsupported platform".to_string());
    }

    Ok(())
}

pub struct WatchState {
    watcher: Mutex<Option<Arc<Mutex<RecommendedWatcher>>>>,
    watched_path: Mutex<Option<String>>,
}

impl Default for WatchState {
    fn default() -> Self {
        Self {
            watcher: Mutex::new(None),
            watched_path: Mutex::new(None),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileChangeEvent {
    pub path: String,
    pub change_type: String,
}

#[command]
pub fn start_watch(app: tauri::AppHandle, path: String, root: String) -> Result<(), String> {
    let watch_path = validate_path(&path, &root)?;
    if !watch_path.exists() {
        return Err("Watch path does not exist".to_string());
    }

    let app_clone = app.clone();
    let (tx, rx) = std::sync::mpsc::channel();

    let mut watcher = RecommendedWatcher::new(tx, notify::Config::default())
        .map_err(|e| format!("Failed to create watcher: {}", e))?;

    watcher.watch(&watch_path, RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to watch path: {}", e))?;

    let watcher = Arc::new(Mutex::new(watcher));

    let watch_state = app.state::<WatchState>();
    watch_state.watcher.lock().replace(watcher.clone());
    watch_state.watched_path.lock().replace(watch_path.to_string_lossy().to_string());

    std::thread::spawn(move || {
        for event in rx {
            match event {
                Ok(notify::Event { kind, paths, .. }) => {
                    let change_type = match kind {
                        EventKind::Create(_) => "created",
                        EventKind::Remove(_) => "deleted",
                        EventKind::Modify(_) => "modified",
                        _ => continue,
                    };

                    for file_path in paths {
                        let _ = app_clone.emit("file-changed", FileChangeEvent {
                            path: file_path.to_string_lossy().to_string(),
                            change_type: change_type.to_string(),
                        });
                    }
                }
                Err(e) => {
                    eprintln!("Watch error: {}", e);
                }
            }
        }
    });

    Ok(())
}

#[command]
pub fn stop_watch(app: tauri::AppHandle) -> Result<(), String> {
    let state = app.state::<WatchState>();
    state.watcher.lock().take();
    state.watched_path.lock().take();
    Ok(())
}

#[command]
pub async fn run_shell(command: String, cwd: Option<String>, root: Option<String>) -> Result<ShellResult, String> {
    if command.contains(&['&', '|', ';', '\n', '\r', '$', '`', '(', ')', '{', '}', '<', '>', '!', '~', '*', '?', '[', ']'][..]) {
        return Err("Shell metacharacters are not allowed.".to_string());
    }

    let mut builder = AsyncCommand::new(if cfg!(target_os = "windows") { "cmd" } else { "sh" });
    if cfg!(target_os = "windows") {
        builder.args(["/C", &command]);
    } else {
        builder.args(["-c", &command]);
    }

    if let Some(dir) = &cwd {
        if let Some(r) = &root {
            validate_path(dir, r)?;
        }
        builder.current_dir(dir);
    }

    let output = builder
        .output()
        .await
        .map_err(|e| format!("Failed to execute shell command: {}", e))?;

    Ok(ShellResult {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        return_code: output.status.code().unwrap_or(-1),
    })
}
