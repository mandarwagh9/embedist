use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use once_cell::sync::Lazy;
use parking_lot::Mutex;
use tauri::{command, State};

static HTTP_CLIENT: Lazy<reqwest::Client> = Lazy::new(|| {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .expect("Failed to create HTTP client")
});

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
pub struct ToolCallArg {
    pub id: String,
    #[serde(rename = "type")]
    pub call_type: String,
    pub function: ToolCallFunction,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ToolCallFunction {
    pub name: String,
    pub arguments: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AIMessage {
    pub role: String,
    pub content: Option<String>,
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub tool_calls: Vec<ToolCallArg>,
    #[serde(default, rename = "tool_call_id", skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
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

#[allow(clippy::too_many_arguments)]
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
    chat_template_kwargs: Option<std::collections::HashMap<String, serde_json::Value>>,
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

    if active == "ollama" {
        let model_name = model.unwrap_or_else(|| config.default_model.clone());
        let url = base_url
            .or(config.base_url.clone())
            .unwrap_or_else(|| "http://localhost:11434".to_string());
        return chat_ollama(&url, &model_name, &messages, temperature, max_tokens, top_p).await;
    }
    
    let model_name = model.unwrap_or_else(|| config.default_model.clone());
    let api_key = api_key.unwrap_or_else(|| config.api_key.clone());
    let base_url = base_url.or(config.base_url.clone());
    
    if api_key.is_empty() {
        return Err(format!(
            "No API key configured for provider '{}'. Please add your API key in Settings.",
            active
        ));
    }
    
    if use_direct_config {
        let url = base_url.ok_or("Direct endpoint requires a base URL")?;
        if url.contains("api.openai.com") {
            chat_openai(&api_key, &model_name, &messages, tools.as_ref(), temperature, max_tokens, top_p).await
        } else {
            chat_custom(&url, &api_key, &model_name, &messages, tools.as_ref(), temperature, max_tokens, top_p, chat_template_kwargs.as_ref()).await
        }
    } else {
        match active.as_str() {
            "openai" => chat_openai(&api_key, &model_name, &messages, tools.as_ref(), temperature, max_tokens, top_p).await,
            "anthropic" => chat_anthropic(&api_key, &model_name, &messages, tools.as_ref(), temperature, max_tokens, top_p).await,
            "deepseek" => chat_deepseek(&api_key, &model_name, &messages, tools.as_ref(), temperature, max_tokens, top_p).await,
            "ollama" => {
                let url = base_url.unwrap_or_else(|| "http://localhost:11434".to_string());
                chat_ollama(&url, &model_name, &messages, temperature, max_tokens, top_p).await
            }
            "google" => chat_google(&api_key, &model_name, &messages, temperature, max_tokens, top_p).await,
            _ if active.starts_with("custom-") => {
                let url = base_url.ok_or("Custom endpoint requires a base URL")?;
                chat_custom(&url, &api_key, &model_name, &messages, tools.as_ref(), temperature, max_tokens, top_p, chat_template_kwargs.as_ref()).await
            }
            _ => Err(format!("Unknown provider '{}'. Please add it in Settings.", active)),
        }
    }
}

async fn chat_openai(api_key: &str, model: &str, messages: &[AIMessage], tools: Option<&Vec<ToolDefinition>>, temperature: Option<f64>, max_tokens: Option<u32>, top_p: Option<f64>) -> Result<AIResponse, String> {
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
    
    let response = HTTP_CLIENT
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
    let system = messages.iter()
        .filter(|m| m.role == "system")
        .filter_map(|m| m.content.clone())
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
                "content": m.content.clone().unwrap_or_default()
            }]);
            formatted_messages.push(serde_json::json!({
                "role": "user",
                "content": content_blocks
            }));
        } else {
            let role = if m.role == "assistant" { "assistant" } else { "user" };
            let content_text = m.content.clone().unwrap_or_default();
            let content_blocks: Vec<serde_json::Value> = if content_text.is_empty() {
                Vec::new()
            } else {
                vec![serde_json::json!({"type": "text", "text": content_text})]
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
    
    let response = HTTP_CLIENT
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2024-10-21")
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
                    let input = block["input"].to_string();
                    tool_calls.push(ToolCall {
                        id: id.to_string(),
                        name: name.to_string(),
                        arguments: input,
                    });
                }
            }
        }
    }
    
    let usage = data["usage"].as_object().map(|u| TokenUsage {
        prompt_tokens: u.get("input_tokens").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
        completion_tokens: u.get("output_tokens").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
        total_tokens: u.get("input_tokens").and_then(|v| v.as_u64()).unwrap_or(0) as u32 
            + u.get("output_tokens").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
    });
    
    Ok(AIResponse {
        content,
        model: model.to_string(),
        usage,
        tool_calls,
    })
}

async fn chat_deepseek(api_key: &str, model: &str, messages: &[AIMessage], tools: Option<&Vec<ToolDefinition>>, temperature: Option<f64>, max_tokens: Option<u32>, top_p: Option<f64>) -> Result<AIResponse, String> {
    let mut body = serde_json::json!({
        "model": model,
        "messages": messages,
        "stream": false,
    });

    if let Some(t) = temperature {
        body["temperature"] = serde_json::json!(t);
    }
    if let Some(mt) = max_tokens {
        body["max_tokens"] = serde_json::json!(mt);
    }
    if let Some(tp) = top_p {
        body["top_p"] = serde_json::json!(tp);
    }
    if let Some(t) = tools {
        body["tools"] = serde_json::json!(t);
    }
    
    let response = HTTP_CLIENT
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

async fn chat_ollama(base_url: &str, model: &str, messages: &[AIMessage], temperature: Option<f64>, max_tokens: Option<u32>, top_p: Option<f64>) -> Result<AIResponse, String> {
    let formatted_messages: Vec<serde_json::Value> = messages.iter().map(|m| {
        serde_json::json!({
            "role": m.role,
            "content": m.content.clone().unwrap_or_default()
        })
    }).collect();
    
    let mut body = serde_json::json!({
        "model": model,
        "messages": formatted_messages,
        "stream": false,
    });

    let mut options = serde_json::json!({});
    if let Some(t) = temperature {
        options["temperature"] = serde_json::json!(t);
    }
    if let Some(mt) = max_tokens {
        options["num_predict"] = serde_json::json!(mt);
    }
    if let Some(tp) = top_p {
        options["top_p"] = serde_json::json!(tp);
    }
    if !options.is_null() && options.as_object().is_some_and(|o| !o.is_empty()) {
        body["options"] = options;
    }
    
    let url = format!("{}/api/chat", base_url);
    
    let response = HTTP_CLIENT
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

async fn chat_google(api_key: &str, model: &str, messages: &[AIMessage], temperature: Option<f64>, max_tokens: Option<u32>, top_p: Option<f64>) -> Result<AIResponse, String> {
    let contents: Vec<serde_json::Value> = messages.iter()
        .filter(|m| m.role != "system")
        .map(|m| {
            serde_json::json!({
                "role": if m.role == "assistant" { "model" } else { "user" },
                "parts": [{
                    "text": m.content.clone().unwrap_or_default()
                }]
            })
        }).collect();
    
    let system_instruction = messages.iter()
        .filter(|m| m.role == "system")
        .filter_map(|m| m.content.clone())
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

    let mut generation_config = serde_json::json!({});
    if let Some(t) = temperature {
        generation_config["temperature"] = serde_json::json!(t);
    }
    if let Some(mt) = max_tokens {
        generation_config["maxOutputTokens"] = serde_json::json!(mt);
    }
    if let Some(tp) = top_p {
        generation_config["topP"] = serde_json::json!(tp);
    }
    if generation_config.as_object().is_some_and(|o| !o.is_empty()) {
        body["generationConfig"] = generation_config;
    }
    
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent",
        model
    );
    
    let response = HTTP_CLIENT
        .post(&url)
        .header("x-goog-api-key", api_key)
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
    
    let usage = data["usageMetadata"].as_object().map(|u| TokenUsage {
        prompt_tokens: u.get("promptTokenCount").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
        completion_tokens: u.get("candidatesTokenCount").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
        total_tokens: u.get("totalTokenCount").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
    });
    
    Ok(AIResponse {
        content,
        model: model.to_string(),
        usage,
        tool_calls: vec![],
    })
}

#[allow(clippy::too_many_arguments)]
async fn chat_custom(base_url: &str, api_key: &str, model: &str, messages: &[AIMessage], tools: Option<&Vec<ToolDefinition>>, temperature: Option<f64>, max_tokens: Option<u32>, top_p: Option<f64>, chat_template_kwargs: Option<&std::collections::HashMap<String, serde_json::Value>>) -> Result<AIResponse, String> {
    let formatted_messages: Vec<serde_json::Value> = messages.iter().map(|m| {
        let mut msg = serde_json::Map::new();
        msg.insert("role".to_string(), serde_json::json!(m.role));
        if m.role == "tool" {
            let tool_id = m.id.as_ref()
                .and_then(|id| id.strip_prefix("tool-"))
                .map(|s| s.to_string())
                .unwrap_or_else(|| m.id.clone().unwrap_or_default());
            msg.insert("tool_call_id".to_string(), serde_json::json!(tool_id));
        }
        if !m.tool_calls.is_empty() {
            msg.insert("tool_calls".to_string(), serde_json::json!(m.tool_calls));
        }
        msg.insert("content".to_string(), serde_json::json!(m.content.clone().unwrap_or_default()));
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

    if let Some(ctk) = chat_template_kwargs {
        body["chat_template_kwargs"] = serde_json::json!(ctk);
    }

    let response = HTTP_CLIENT
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

#[derive(Debug, Serialize, Deserialize)]
pub struct WebSearchResult {
    pub title: String,
    pub url: String,
    pub snippet: String,
}

#[command]
pub async fn web_search(query: String) -> Result<Vec<WebSearchResult>, String> {
    let encoded = urlencoding::encode(&query);
    let url = format!("https://html.duckduckgo.com/html/?q={}", encoded);
    
    let response = HTTP_CLIENT
        .get(&url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .send()
        .await
        .map_err(|e| format!("Search request failed: {}", e))?;
    
    let html = response.text().await.map_err(|e| format!("Failed to read response: {}", e))?;
    
    let mut results = Vec::new();
    
    // Extract all result__a links (title + URL)
    let title_re = regex::Regex::new(
        r#"<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>(.*?)</a>"#
    ).unwrap();
    
    // Extract all result__snippet links
    let snippet_re = regex::Regex::new(
        r#"<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>(.*?)</a>"#
    ).unwrap();
    
    let titles: Vec<(String, String)> = title_re.captures_iter(&html)
        .filter_map(|cap| {
            let raw_url = cap.get(1)?.as_str().to_string();
            let title = strip_html(cap.get(2)?.as_str());
            if title.is_empty() { return None; }
            let url = if raw_url.starts_with("//") {
                format!("https:{}", raw_url)
            } else if raw_url.starts_with("http") {
                raw_url
            } else {
                return None;
            };
            Some((title, url))
        })
        .collect();
    
    let snippets: Vec<String> = snippet_re.captures_iter(&html)
        .filter_map(|cap| cap.get(1).map(|m| strip_html(m.as_str())))
        .collect();
    
    for (i, (title, url)) in titles.into_iter().enumerate() {
        let snippet = snippets.get(i).cloned().unwrap_or_default();
        results.push(WebSearchResult {
            title,
            url,
            snippet: snippet.chars().take(300).collect(),
        });
        if results.len() >= 10 { break; }
    }
    
    Ok(results)
}

fn strip_html(html: &str) -> String {
    let re = regex::Regex::new(r"<[^>]*>").unwrap();
    re.replace_all(html, "")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#x27;", "'")
        .replace("&nbsp;", " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}
