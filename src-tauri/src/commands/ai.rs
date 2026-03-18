use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{command, State};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AIMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AIResponse {
    pub content: String,
    pub model: String,
    pub usage: Option<TokenUsage>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenUsage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AIProviderConfig {
    pub id: String,
    pub name: String,
    pub api_key: String,
    pub base_url: Option<String>,
    pub default_model: String,
}

#[derive(Default)]
pub struct AIState {
    pub providers: Mutex<HashMap<String, AIProviderConfig>>,
    pub active_provider: Mutex<String>,
}

#[command]
pub fn get_ai_providers(state: State<'_, AIState>) -> Vec<AIProviderConfig> {
    let providers = state.providers.lock().unwrap();
    providers.values().cloned().collect()
}

#[command]
pub fn add_ai_provider(state: State<'_, AIState>, config: AIProviderConfig) -> Result<(), String> {
    let mut providers = state.providers.lock().unwrap();
    providers.insert(config.id.clone(), config);
    Ok(())
}

#[command]
pub fn remove_ai_provider(state: State<'_, AIState>, provider_id: String) -> Result<(), String> {
    let mut providers = state.providers.lock().unwrap();
    providers.remove(&provider_id);
    Ok(())
}

#[command]
pub fn set_active_provider(state: State<'_, AIState>, provider_id: String) -> Result<(), String> {
    let mut active = state.active_provider.lock().unwrap();
    *active = provider_id;
    Ok(())
}

#[command]
pub async fn chat_completion(
    state: State<'_, AIState>,
    messages: Vec<AIMessage>,
    model: Option<String>,
) -> Result<AIResponse, String> {
    let (active, config) = {
        let active = state.active_provider.lock().unwrap().clone();
        let providers = state.providers.lock().unwrap();
        let config = providers.get(&active)
            .ok_or("No active AI provider configured")?
            .clone();
        (active, config)
    };
    
    let model_name = model.unwrap_or_else(|| config.default_model.clone());
    
    match active.as_str() {
        "openai" => chat_openai(&config.api_key, &model_name, &messages).await,
        "anthropic" => chat_anthropic(&config.api_key, &model_name, &messages).await,
        "deepseek" => chat_deepseek(&config.api_key, &model_name, &messages).await,
        "ollama" => {
            let base_url = config.base_url.clone().unwrap_or_else(|| "http://localhost:11434".to_string());
            chat_ollama(&base_url, &model_name, &messages).await
        }
        "google" => chat_google(&config.api_key, &model_name, &messages).await,
        _ => Err("Unknown provider".to_string()),
    }
}

async fn chat_openai(api_key: &str, model: &str, messages: &[AIMessage]) -> Result<AIResponse, String> {
    let client = reqwest::Client::new();
    
    let body = serde_json::json!({
        "model": model,
        "messages": messages,
        "stream": false,
    });
    
    let response = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;
    
    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("API error {}: {}", status, text));
    }
    
    let data: serde_json::Value = response.json().await.map_err(|e| format!("Parse error: {}", e))?;
    
    let content = data["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("")
        .to_string();
    
    let usage = data["usage"].as_object().map(|u| TokenUsage {
        prompt_tokens: u.get("prompt_tokens").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
        completion_tokens: u.get("completion_tokens").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
        total_tokens: u.get("total_tokens").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
    });
    
    Ok(AIResponse {
        content,
        model: model.to_string(),
        usage,
    })
}

async fn chat_anthropic(api_key: &str, model: &str, messages: &[AIMessage]) -> Result<AIResponse, String> {
    let client = reqwest::Client::new();
    
    let system = messages.iter()
        .filter(|m| m.role == "system")
        .map(|m| m.content.clone())
        .collect::<Vec<_>>()
        .join("\n");
    
    let user_messages: Vec<&AIMessage> = messages.iter()
        .filter(|m| m.role != "system")
        .collect();
    
    let formatted_messages: Vec<serde_json::Value> = user_messages.iter().map(|m| {
        serde_json::json!({
            "role": if m.role == "assistant" { "assistant" } else { "user" },
            "content": m.content
        })
    }).collect();
    
    let body = serde_json::json!({
        "model": model,
        "messages": formatted_messages,
        "max_tokens": 4096,
        "system": system,
    });
    
    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;
    
    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("API error {}: {}", status, text));
    }
    
    let data: serde_json::Value = response.json().await.map_err(|e| format!("Parse error: {}", e))?;
    
    let content = data["content"][0]["text"]
        .as_str()
        .unwrap_or("")
        .to_string();
    
    Ok(AIResponse {
        content,
        model: model.to_string(),
        usage: None,
    })
}

async fn chat_deepseek(api_key: &str, model: &str, messages: &[AIMessage]) -> Result<AIResponse, String> {
    let client = reqwest::Client::new();
    
    let body = serde_json::json!({
        "model": model,
        "messages": messages,
        "stream": false,
    });
    
    let response = client
        .post("https://api.deepseek.com/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;
    
    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("API error {}: {}", status, text));
    }
    
    let data: serde_json::Value = response.json().await.map_err(|e| format!("Parse error: {}", e))?;
    
    let content = data["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("")
        .to_string();
    
    Ok(AIResponse {
        content,
        model: model.to_string(),
        usage: None,
    })
}

async fn chat_ollama(base_url: &str, model: &str, messages: &[AIMessage]) -> Result<AIResponse, String> {
    let client = reqwest::Client::new();
    
    let formatted_messages: Vec<serde_json::Value> = messages.iter().map(|m| {
        serde_json::json!({
            "role": m.role,
            "content": m.content
        })
    }).collect();
    
    let body = serde_json::json!({
        "model": model,
        "messages": formatted_messages,
        "stream": false,
    });
    
    let url = format!("{}/api/chat", base_url);
    
    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;
    
    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("API error {}: {}", status, text));
    }
    
    let data: serde_json::Value = response.json().await.map_err(|e| format!("Parse error: {}", e))?;
    
    let content = data["message"]["content"]
        .as_str()
        .unwrap_or("")
        .to_string();
    
    Ok(AIResponse {
        content,
        model: model.to_string(),
        usage: None,
    })
}

async fn chat_google(api_key: &str, model: &str, messages: &[AIMessage]) -> Result<AIResponse, String> {
    let client = reqwest::Client::new();
    
    let contents: Vec<serde_json::Value> = messages.iter()
        .filter(|m| m.role != "system")
        .map(|m| {
            serde_json::json!({
                "role": if m.role == "assistant" { "model" } else { "user" },
                "parts": [{
                    "text": m.content
                }]
            })
        }).collect();
    
    let system_instruction = messages.iter()
        .filter(|m| m.role == "system")
        .map(|m| m.content.clone())
        .collect::<Vec<_>>()
        .join("\n");
    
    let mut body = serde_json::json!({
        "contents": contents,
    });
    
    if !system_instruction.is_empty() {
        body["systemInstruction"] = serde_json::json!({
            "parts": [{
                "text": system_instruction
            }]
        });
    }
    
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
        model, api_key
    );
    
    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;
    
    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("API error {}: {}", status, text));
    }
    
    let data: serde_json::Value = response.json().await.map_err(|e| format!("Parse error: {}", e))?;
    
    let content = data["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .unwrap_or("")
        .to_string();
    
    Ok(AIResponse {
        content,
        model: model.to_string(),
        usage: None,
    })
}
