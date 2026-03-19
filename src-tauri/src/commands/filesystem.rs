use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::command;
use tokio::process::Command as AsyncCommand;

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
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| format!("Failed to write file: {}", e))
}

#[command]
pub fn create_file(parent: String, name: String) -> Result<String, String> {
    let path = PathBuf::from(&parent).join(&name);
    fs::write(&path, "").map_err(|e| format!("Failed to create file: {}", e))?;
    Ok(path.to_string_lossy().to_string())
}

#[command]
pub fn create_folder(parent: String, name: String) -> Result<String, String> {
    let path = PathBuf::from(&parent).join(&name);
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create folder: {}", e))?;
    Ok(path.to_string_lossy().to_string())
}

#[command]
pub fn delete_path(path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if p.is_dir() {
        fs::remove_dir_all(&path).map_err(|e| format!("Failed to delete folder: {}", e))
    } else {
        fs::remove_file(&path).map_err(|e| format!("Failed to delete file: {}", e))
    }
}

#[command]
pub fn rename_path(old_path: String, new_name: String) -> Result<String, String> {
    let old = PathBuf::from(&old_path);
    let parent = old.parent().ok_or("No parent directory")?;
    let new_path = parent.join(&new_name);
    fs::rename(&old, &new_path).map_err(|e| format!("Failed to rename: {}", e))?;
    Ok(new_path.to_string_lossy().to_string())
}

#[command]
pub fn list_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let entries = fs::read_dir(&path).map_err(|e| format!("Failed to read directory: {}", e))?;
    
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
pub fn get_directory_tree(path: String, depth: Option<u32>) -> Result<DirectoryTree, String> {
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
pub fn file_exists(path: String) -> bool {
    PathBuf::from(&path).exists()
}

#[command]
pub fn is_platformio_project(path: String) -> bool {
    let platformio_ini = PathBuf::from(&path).join("platformio.ini");
    platformio_ini.exists()
}

#[command]
pub fn read_platformio_board(path: String) -> Result<String, String> {
    let platformio_ini = PathBuf::from(&path).join("platformio.ini");
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
pub fn save_plan_file(directory: String, name: String, content: String) -> Result<String, String> {
    let path = PathBuf::from(&directory).join(&name);
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
) -> Result<Vec<SearchResult>, String> {
    let max = max_results.unwrap_or(100);
    let pattern_lower = pattern.to_lowercase();
    let file_pat = file_pattern.as_deref();

    fn matches_file(name: &str, pattern: Option<&str>) -> bool {
        match pattern {
            None => true,
            Some(pat) => {
                let pat = pat.to_lowercase();
                if pat.starts_with('*') && pat.ends_with('*') {
                    name.to_lowercase().contains(&pat[1..pat.len()-1])
                } else if pat.starts_with('*') {
                    name.to_lowercase().ends_with(&pat[1..])
                } else if pat.ends_with('*') {
                    name.to_lowercase().starts_with(&pat[..pat.len()-1])
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
                match fs::read_to_string(&path) {
                    Ok(content) => {
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
                    Err(_) => {}
                }
            }
        }
    }

    let mut results = Vec::new();
    search_dir(&root_path, &pattern_lower, file_pat, max, &mut results);
    Ok(results)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ShellResult {
    pub stdout: String,
    pub stderr: String,
    pub return_code: i32,
}

#[command]
pub async fn run_shell(command: String, cwd: Option<String>) -> Result<ShellResult, String> {
    let (cmd, _args) = if cfg!(target_os = "windows") {
        ("cmd".to_string(), vec!["/C".to_string(), command.clone()])
    } else {
        ("sh".to_string(), vec!["-c".to_string(), command.clone()])
    };

    let mut builder = AsyncCommand::new(&cmd);
    if cfg!(target_os = "windows") {
        builder.args(&["/C", &command]);
    } else {
        builder.args(&["sh", "-c", &command]);
    }

    if let Some(dir) = &cwd {
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
