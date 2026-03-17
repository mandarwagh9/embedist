---
sidebar_position: 1
---

# AI Providers Overview

Embedist supports multiple AI providers, allowing you to choose your preferred model.

## Supported Providers

| Provider | Type | Models |
|----------|------|--------|
| OpenAI | Cloud | GPT-4o, GPT-4o-mini, GPT-4 Turbo |
| Anthropic | Cloud | Claude 3.5 Sonnet, Claude 3 Opus |
| Google | Cloud | Gemini Pro, Gemini Flash |
| DeepSeek | Cloud | DeepSeek Chat |
| Ollama | Local | Llama 3.2, Mistral, Qwen, Phi |
| Custom | Both | Any OpenAI-compatible endpoint |

## Choosing a Provider

### Cloud Providers
- **Pros**: Powerful models, no local setup
- **Cons**: Requires API key, internet access

### Local (Ollama)
- **Pros**: Free, offline capable, privacy
- **Cons**: Requires local setup, limited model size

### Custom Endpoints
- **Pros**: Use any API (LM Studio, OpenRouter, etc.)
- **Cons**: Requires manual configuration

## Configuration

Go to **Settings → AI Providers** to configure your preferred provider.

## Adding Custom Models

See [Custom Endpoints](/ai-providers/custom-endpoints) for adding your own models.
