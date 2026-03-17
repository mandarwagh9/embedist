---
sidebar_position: 7
---

# Custom Endpoints

Add your own AI API endpoint for maximum flexibility.

## Use Cases

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
| Name | Display name | My LM Studio |
| Base URL | API endpoint | http://localhost:1234/v1 |
| API Key | (Optional) | - |
| Model | Model name | llama-3.2-3b-instruct |

### 3. Test Connection

Click **Test** to verify connectivity.

## Common Configurations

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

## Troubleshooting

### 401 Unauthorized
- Verify API key is correct
- Check endpoint URL

### 404 Not Found
- Verify base URL format
- Check model name exists
