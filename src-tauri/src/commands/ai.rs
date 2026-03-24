use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use parking_lot::Mutex;
use tauri::{command, State};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ToolParamProperty {
    #[serde(rename = "type")]
    pub param_type: String,
    pub description: Option<String>,
    #[serde(default)]
    pub enum_values: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ToolParams {
    #[serde(rename = "type")]
    pub params_type: String,
    pub properties: HashMap<String, ToolParamProperty>,
    #[serde(default)]
    pub required: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ToolDefinition {
    #[serde(rename = "type")]
    pub tool_type: String,
    #[serde(rename = "function")]
    pub function: ToolFunction,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ToolFunction {
    pub name: String,
    pub description: String,
    pub parameters: ToolParams,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ToolCall {
    pub id: String,
    pub name: String,
    pub arguments: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AIMessage {
    pub role: String,
    pub content: String,
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default)]
    pub name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AIResponse {
    pub content: String,
    pub model: String,
    pub usage: Option<TokenUsage>,
    #[serde(default)]
    pub tool_calls: Vec<ToolCall>,
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
    let providers = state.providers.lock();
    providers.values().cloned().collect()
}

#[command]
pub fn add_ai_provider(state: State<'_, AIState>, config: AIProviderConfig) -> Result<(), String> {
    let mut providers = state.providers.lock();
    providers.insert(config.id.clone(), config);
    Ok(())
}

#[command]
pub fn remove_ai_provider(state: State<'_, AIState>, provider_id: String) -> Result<(), String> {
    let mut providers = state.providers.lock();
    providers.remove(&provider_id);
    Ok(())
}

#[command]
pub fn set_active_provider(state: State<'_, AIState>, provider_id: String) -> Result<(), String> {
    let mut active = state.active_provider.lock();
    *active = provider_id;
    Ok(())
}

#[command]
pub async fn chat_completion(
    state: State<'_, AIState>,
    messages: Vec<AIMessage>,
    model: Option<String>,
    provider: Option<String>,
    api_key: Option<String>,
    base_url: Option<String>,
    tools: Option<Vec<ToolDefinition>>,
    temperature: Option<f64>,
    max_tokens: Option<u32>,
    top_p: Option<f64>,
) -> Result<AIResponse, String> {
    let (active, config, use_direct_config) = {
        let active = state.active_provider.lock().clone();
        let providers = state.providers.lock();
        
        if api_key.is_some() || base_url.is_some() {
            let model_name = model.clone().unwrap_or_default();
            let api_key_val = api_key.clone().unwrap_or_default();
            let base_url_val = base_url.clone();
            (
                active,
                AIProviderConfig {
                    id: provider.clone().unwrap_or_else(|| "direct".to_string()),
                    name: "Direct".to_string(),
                    api_key: api_key_val,
                    base_url: base_url_val,
                    default_model: model_name,
                },
                true,
            )
        } else if let Some(ref p) = provider {
            if let Some(cfg) = providers.get(p) {
                (p.clone(), cfg.clone(), false)
            } else {
                return Err(format!("Provider '{}' not found. Please add it in Settings.", p));
            }
        } else {
            let config = providers.get(&active)
                .ok_or("No active AI provider configured. Please add one in Settings.")?
                .clone();
            (active, config, false)
        }
    };
    
    let model_name = model.unwrap_or_else(|| config.default_model.clone());
    let api_key = api_key.unwrap_or_else(|| config.api_key.clone());
    let base_url = base_url.or(config.base_url.clone());
    
    if use_direct_config {
        let url = base_url.ok_or("Direct endpoint requires a base URL")?;
        if url.contains("api.openai.com") {
            chat_openai(&api_key, &model_name, &messages, tools.as_ref(), temperature, max_tokens, top_p).await
        } else {
            chat_custom(&url, &api_key, &model_name, &messages, tools.as_ref(), temperature, max_tokens, top_p).await
        }
    } else {
        match active.as_str() {
            "openai" => chat_openai(&api_key, &model_name, &messages, tools.as_ref(), temperature, max_tokens, top_p).await,
            "anthropic" => chat_anthropic(&api_key, &model_name, &messages, tools.as_ref(), temperature, max_tokens, top_p).await,
            "deepseek" => chat_deepseek(&api_key, &model_name, &messages, tools.as_ref()).await,
            "ollama" => {
                let url = base_url.unwrap_or_else(|| "http://localhost:11434".to_string());
                chat_ollama(&url, &model_name, &messages).await
            }
            "google" => chat_google(&api_key, &model_name, &messages).await,
            _ if active.starts_with("custom-") => {
                let url = base_url.ok_or("Custom endpoint requires a base URL")?;
                chat_custom(&url, &api_key, &model_name, &messages, tools.as_ref(), temperature, max_tokens, top_p).await
            }
            _ => Err(format!("Unknown provider '{}'. Please add it in Settings.", active)),
        }
    }
}

async fn chat_openai(api_key: &str, model: &str, messages: &[AIMessage], tools: Option<&Vec<ToolDefinition>>, temperature: Option<f64>, max_tokens: Option<u32>, top_p: Option<f64>) -> Result<AIResponse, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| format!("Failed to create client: {}", e))?;
    
    let mut body = serde_json::json!({
        "model": model,
        "messages": messages,
        "stream": false,
    });
    
    if let Some(t) = tools {
        body["tools"] = serde_json::json!(t);
    }
    
    if let Some(temp) = temperature {
        body["temperature"] = temp.into();
    }
    
    if let Some(mt) = max_tokens {
        body["max_tokens"] = mt.into();
    }
    
    if let Some(tp) = top_p {
        body["top_p"] = tp.into();
    }
    
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
    
    let tool_calls: Vec<ToolCall> = data["choices"][0]["message"]["tool_calls"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|tc| {
                    let id = tc["id"].as_str()?.to_string();
                    let name = tc["function"]["name"].as_str()?.to_string();
                    let args = tc["function"]["arguments"].as_str().unwrap_or("{}").to_string();
                    Some(ToolCall { id, name, arguments: args })
                })
                .collect()
        })
        .unwrap_or_default();
    
    let usage = data["usage"].as_object().map(|u| TokenUsage {
        prompt_tokens: u.get("prompt_tokens").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
        completion_tokens: u.get("completion_tokens").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
        total_tokens: u.get("total_tokens").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
    });
    
    Ok(AIResponse {
        content,
        model: model.to_string(),
        usage,
        tool_calls,
    })
}

async fn chat_anthropic(api_key: &str, model: &str, messages: &[AIMessage], tools: Option<&Vec<ToolDefinition>>, temperature: Option<f64>, max_tokens: Option<u32>, _top_p: Option<f64>) -> Result<AIResponse, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| format!("Failed to create client: {}", e))?;
    
    let system = messages.iter()
        .filter(|m| m.role == "system")
        .map(|m| m.content.clone())
        .collect::<Vec<_>>()
        .join("\n");
    
    let mut formatted_messages: Vec<serde_json::Value> = Vec::new();
    for m in messages.iter() {
        if m.role == "system" {
            continue;
        }
        if m.role == "tool" {
            let tool_use_id = m.id.as_ref()
                .and_then(|id| id.strip_prefix("tool-"))
                .map(|s| s.to_string())
                .unwrap_or_else(|| m.id.clone().unwrap_or_default());
            let content_blocks = serde_json::json!([{
                "type": "tool_result",
                "tool_use_id": tool_use_id,
                "content": m.content
            }]);
            formatted_messages.push(serde_json::json!({
                "role": "user",
                "content": content_blocks
            }));
        } else {
            let role = if m.role == "assistant" { "assistant" } else { "user" };
            let content_blocks: Vec<serde_json::Value> = if m.content.is_empty() {
                Vec::new()
            } else {
                vec![serde_json::json!({"type": "text", "text": m.content})]
            };
            formatted_messages.push(serde_json::json!({
                "role": role,
                "content": content_blocks
            }));
        }
    }
    
    let mut body = serde_json::json!({
        "model": model,
        "messages": formatted_messages,
        "max_tokens": max_tokens.unwrap_or(4096),
    });
    
    if !system.is_empty() {
        body["system"] = serde_json::json!(system);
    }
    
    if let Some(t) = tools {
        body["tools"] = serde_json::json!(t);
    }
    
    if let Some(temp) = temperature {
        body["temperature"] = temp.into();
    }
    
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
    
    let mut content = String::new();
    let mut tool_calls: Vec<ToolCall> = Vec::new();
    
    if let Some(arr) = data["content"].as_array() {
        for block in arr {
            let block_type = block["type"].as_str().unwrap_or("");
            if block_type == "text" {
                if let Some(text) = block["text"].as_str() {
                    if !text.is_empty() {
                        if !content.is_empty() {
                            content.push('\n');
                        }
                        content.push_str(text);
                    }
                }
            } else if block_type == "tool_use" {
                if let (Some(id), Some(name)) = (
                    block["id"].as_str(),
                    block["name"].as_str()
                ) {
                    let input = serde_json::to_string(&block["input"]).unwrap_or_else(|_| "{}".to_string());
                    tool_calls.push(ToolCall {
                        id: id.to_string(),
                        name: name.to_string(),
                        arguments: input,
                    });
                }
            }
        }
    }
    
    Ok(AIResponse {
        content,
        model: model.to_string(),
        usage: None,
        tool_calls,
    })
}

async fn chat_deepseek(api_key: &str, model: &str, messages: &[AIMessage], tools: Option<&Vec<ToolDefinition>>) -> Result<AIResponse, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| format!("Failed to create client: {}", e))?;
    
    let mut body = serde_json::json!({
        "model": model,
        "messages": messages,
        "stream": false,
    });
    
    if let Some(t) = tools {
        body["tools"] = serde_json::json!(t);
    }
    
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
    
    let tool_calls: Vec<ToolCall> = data["choices"][0]["message"]["tool_calls"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|tc| {
                    let id = tc["id"].as_str()?.to_string();
                    let name = tc["function"]["name"].as_str()?.to_string();
                    let args = tc["function"]["arguments"].as_str().unwrap_or("{}").to_string();
                    Some(ToolCall { id, name, arguments: args })
                })
                .collect()
        })
        .unwrap_or_default();
    
    Ok(AIResponse {
        content,
        model: model.to_string(),
        usage: None,
        tool_calls,
    })
}

async fn chat_ollama(base_url: &str, model: &str, messages: &[AIMessage]) -> Result<AIResponse, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| format!("Failed to create client: {}", e))?;
    
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
        tool_calls: vec![],
    })
}

async fn chat_google(api_key: &str, model: &str, messages: &[AIMessage]) -> Result<AIResponse, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| format!("Failed to create client: {}", e))?;
    
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
        tool_calls: vec![],
    })
}

async fn chat_custom(base_url: &str, api_key: &str, model: &str, messages: &[AIMessage], tools: Option<&Vec<ToolDefinition>>, temperature: Option<f64>, max_tokens: Option<u32>, top_p: Option<f64>) -> Result<AIResponse, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| format!("Failed to create client: {}", e))?;

    let formatted_messages: Vec<serde_json::Value> = messages.iter().map(|m| {
        let mut msg = serde_json::Map::new();
        match m.role.as_str() {
            "system" => {
                msg.insert("role".to_string(), serde_json::json!("system"));
                if !m.content.is_empty() {
                    msg.insert("content".to_string(), serde_json::json!([{
                        "type": "text",
                        "text": m.content
                    }]));
                } else {
                    msg.insert("content".to_string(), serde_json::json!([]));
                }
            }
            "user" => {
                msg.insert("role".to_string(), serde_json::json!("user"));
                if !m.content.is_empty() {
                    msg.insert("content".to_string(), serde_json::json!([{
                        "type": "text",
                        "text": m.content
                    }]));
                } else {
                    msg.insert("content".to_string(), serde_json::json!([]));
                }
            }
            "assistant" => {
                msg.insert("role".to_string(), serde_json::json!("assistant"));
                if !m.content.is_empty() {
                    msg.insert("content".to_string(), serde_json::json!([{
                        "type": "text",
                        "text": m.content
                    }]));
                } else {
                    msg.insert("content".to_string(), serde_json::json!([]));
                }
            }
            "tool" => {
                msg.insert("role".to_string(), serde_json::json!("tool"));
                let tool_id = m.id.as_ref()
                    .and_then(|id| id.strip_prefix("tool-"))
                    .map(|s| s.to_string())
                    .unwrap_or_else(|| m.id.clone().unwrap_or_default());
                msg.insert("tool_call_id".to_string(), serde_json::json!(tool_id));
                if !m.content.is_empty() {
                    msg.insert("content".to_string(), serde_json::json!([{
                        "type": "text",
                        "text": m.content
                    }]));
                } else {
                    msg.insert("content".to_string(), serde_json::json!([]));
                }
            }
            _ => {
                msg.insert("role".to_string(), serde_json::json!(m.role));
                msg.insert("content".to_string(), serde_json::json!([{
                    "type": "text",
                    "text": m.content
                }]));
            }
        }
        serde_json::Value::Object(msg)
    }).collect();

    let mut body = serde_json::json!({
        "model": model,
        "messages": formatted_messages,
        "stream": false,
    });

    if let Some(t) = tools {
        body["tools"] = serde_json::json!(t);
    }

    if let Some(temp) = temperature {
        body["temperature"] = temp.into();
    }

    if let Some(mt) = max_tokens {
        body["max_tokens"] = mt.into();
    }

    if let Some(tp) = top_p {
        body["top_p"] = tp.into();
    }

    let response = client
        .post(format!("{}/chat/completions", base_url.trim_end_matches('/')))
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

    let tool_calls: Vec<ToolCall> = data["choices"][0]["message"]["tool_calls"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|tc| {
                    let id = tc["id"].as_str()?.to_string();
                    let name = tc["function"]["name"].as_str()?.to_string();
                    let args = tc["function"]["arguments"].as_str().unwrap_or("{}").to_string();
                    Some(ToolCall { id, name, arguments: args })
                })
                .collect()
        })
        .unwrap_or_default();

    let usage = data["usage"].as_object().map(|u| TokenUsage {
        prompt_tokens: u.get("prompt_tokens").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
        completion_tokens: u.get("completion_tokens").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
        total_tokens: u.get("total_tokens").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
    });

    Ok(AIResponse {
        content,
        model: model.to_string(),
        usage,
        tool_calls,
    })
}
