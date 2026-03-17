---
sidebar_position: 6
---

# Ollama (Local)

Ollama lets you run AI models locally on your machine.

## Setup

### 1. Install Ollama

**macOS/Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
Download from [ollama.com](https://ollama.com/download/windows)

### 2. Start Ollama

```bash
ollama serve
```

### 3. Download Models

```bash
# Recommended for embedded development
ollama pull llama3.2
ollama pull mistral
ollama pull qwen
```

### 4. Configure Embedist

1. Go to **Settings → AI Providers**
2. Select **Ollama**
3. Ensure URL matches (default: http://localhost:11434)
4. Select model

## Supported Models

| Model | Size | Description |
|-------|------|-------------|
| llama3.2 | 2-4GB | Latest Llama, good code support |
| mistral | 4GB | Fast, efficient |
| qwen | 4-8GB | Strong coding capabilities |
| phi | 2GB | Lightweight option |

## Troubleshooting

### Connection Failed
- Ensure Ollama is running: `ollama serve`
- Check firewall settings
- Verify port 11434 is accessible

### Out of Memory
- Use smaller models
- Close other applications
- Increase system RAM allocation
