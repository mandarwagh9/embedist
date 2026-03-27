---
sidebar_position: 7
---

# Custom Endpoints

Add your own AI API endpoint for maximum flexibility.

## Use Cases

- **NVIDIA NIM**: Cloud-hosted reasoning models with thinking support
- **LM Studio**: Local models with GUI
- **OpenRouter**: Unified API for multiple providers
- **Azure OpenAI**: Enterprise deployments
- **Custom servers**: Self-hosted models

## Setup

### 1. Open Custom Endpoint Settings

Go to **Settings → AI Providers → Add Custom**

### 2. Configure Endpoint

Fill in the following:

| Field | Description | Example |
|-------|-------------|---------|
| Name | Display name | My NVIDIA NIM |
| Base URL | API endpoint | https://integrate.api.nvidia.com/v1 |
| API Key | Your NVIDIA API key | nvapi-xxxxx |
| Model | Model name | moonshotai/kimi-k2.5 |
| Thinking | Enable reasoning (optional) | Checked for reasoning models |

### 3. Test Connection

Click **Test** to verify connectivity.

### 4. Edit Existing Endpoints

Click the **Edit** icon next to any custom endpoint to modify its configuration.

## Common Configurations

### NVIDIA NIM
- Base URL: `https://integrate.api.nvidia.com/v1`
- API Key: Your NVIDIA NGC API key
- Model: `moonshotai/kimi-k2.5` (recommended for thinking)
- Thinking: Enable for reasoning models

### LM Studio
- Base URL: `http://localhost:1234/v1`
- Model: (as shown in LM Studio)

### OpenRouter
- Base URL: `https://openrouter.ai/v1`
- API Key: Your OpenRouter key
- Model: `openai/gpt-3.5-turbo`

### Azure OpenAI
- Base URL: `https://{your-resource}.openai.azure.com/openai/deployments/{deployment-name}`
- API Key: Your Azure key
- API Version: `2024-02-15-preview`

## Thinking Mode

NVIDIA NIM models like `moonshotai/kimi-k2.5` support **thinking mode** — the model shows its reasoning process before giving the final answer.

Enable thinking mode by checking the **Thinking** checkbox when adding/editing a custom endpoint for NVIDIA NIM.

## Troubleshooting

### 401 Unauthorized
- Verify API key is correct
- Check endpoint URL

### 404 Not Found
- Verify base URL format
- Check model name exists

### Thinking not working
- Ensure the model supports thinking (e.g., moonshotai/kimi-k2.5)
- Check the Thinking checkbox in endpoint settings
