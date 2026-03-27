---
sidebar_position: 8
---

# NVIDIA NIM

NVIDIA NIM (NVIDIA Inference Microservices) provides high-performance AI inference with cloud-hosted models. Embedist supports NVIDIA NIM with **thinking mode** for advanced reasoning capabilities.

## Prerequisites

- NVIDIA API key from [NVIDIA NGC](https://org.ngc.nvidia.com/)
- Or from [build.nvidia.com](https://build.nvidia.com/)

## Setup

### 1. Get Your API Key

1. Go to [NVIDIA NGC](https://org.ngc.nvidia.com/) or [build.nvidia.com](https://build.nvidia.com/)
2. Create an account or sign in
3. Generate an API key in your profile settings
4. Copy the API key

### 2. Configure in Embedist

1. Open **Settings** (`Ctrl+,`)
2. Navigate to **AI Providers**
3. Click **Add Custom**
4. Fill in the following:

| Field | Value |
|-------|-------|
| Name | NVIDIA NIM |
| Base URL | `https://integrate.api.nvidia.com/v1` |
| API Key | Your NVIDIA API key |
| Model | `moonshotai/kimi-k2.5` |
| Thinking | ✅ Checked |

5. Click **Test** to verify
6. Click **Save**

## Supported Models

### Reasoning Models (Thinking Enabled)

| Model | Description |
|-------|-------------|
| `moonshotai/kimi-k2.5` | Kimi K2.5 - Advanced reasoning with code understanding |
| `deepseek-ai/deepseek-r1` | DeepSeek R1 - Strong reasoning capabilities |
| `nvidia/llama-3.1-nemotron-70b-instruct` | Nemotron - NVIDIA's instruction-following model |

### Standard Models

| Model | Description |
|-------|-------------|
| `meta/llama-3.1-405b-instruct` | Llama 3.1 405B |
| `meta/llama-3.1-70b-instruct` | Llama 3.1 70B |
| `meta/llama-3.1-8b-instruct` | Llama 3.1 8B |

## Thinking Mode

Thinking mode shows the AI's reasoning process before the final answer. This is useful for:

- Complex debugging problems
- Code analysis and optimization
- Step-by-step problem solving
- Understanding the AI's logic

### How It Works

When thinking is enabled, you'll see:
1. **Thinking** indicator while the model reasons
2. Reasoning content (may be collapsed)
3. Final response

The thinking content helps you understand how the AI approached the problem.

## Usage in Embedist

### Chat Mode

Ask questions and get reasoning-enhanced responses:

```
User: Why is my ESP32 WiFi connection dropping?
```

The AI will show its reasoning about common ESP32 WiFi issues before providing solutions.

### Debug Mode

Use thinking mode for complex debugging:

1. Connect your board and reproduce the error
2. Switch to Debug mode (`Ctrl+4`)
3. Describe the issue
4. The AI reasons through potential causes
5. Get hardware-specific fixes

### Agent Mode

Agent mode can use thinking models for planning complex implementations:

1. Switch to Agent mode (`Ctrl+3`)
2. Describe what you want to build
3. The AI thinks through the approach
4. Executes tools to implement your project

## Troubleshooting

### 401 Unauthorized
- Verify your NVIDIA API key is correct
- Ensure the key has not expired

### 404 Not Found
- Check the model name is correct
- Verify base URL: `https://integrate.api.nvidia.com/v1`

### Thinking not appearing
- Ensure the **Thinking** checkbox is enabled
- Not all models support thinking — use `moonshotai/kimi-k2.5`

### Rate Limiting
- NVIDIA NIM has rate limits based on your plan
- Check [NVIDIA NIM pricing](https://build.nvidia.com/) for limits

## API Reference

| Parameter | Value |
|-----------|-------|
| Base URL | `https://integrate.api.nvidia.com/v1` |
| Authentication | Bearer token (API key) |
| Content-Type | `application/json` |
