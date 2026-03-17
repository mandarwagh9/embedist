---
sidebar_position: 2
---

# FAQ

Frequently Asked Questions about Embedist.

## General

### What is Embedist?
Embedist is an AI-native embedded development environment that understands hardware and provides intelligent debugging for embedded systems.

### What boards does Embedist support?
ESP32 family, Arduino boards, Raspberry Pi Pico, STM32, and more through PlatformIO.

### Is Embedist free?
Core features are free. Cloud AI providers require their own API keys.

## AI Features

### Which AI provider should I use?
- **Beginners**: Start with Ollama (free, local)
- **Best results**: OpenAI GPT-4o or Claude 3.5 Sonnet
- **Budget**: DeepSeek or Ollama

### How does the AI debugger work?
It uses RAG (Retrieval-Augmented Generation) to provide hardware-specific context, ensuring accurate and actionable suggestions.

### Can I use my own models?
Yes! Use Custom Endpoints to connect any OpenAI-compatible API.

## Technical

### Why Tauri instead of Electron?
Tauri offers smaller app size (~5MB vs ~150MB), lower memory usage, and better security.

### Can I work offline?
Yes, with Ollama or by pre-downloading documentation to the knowledge base.

### Is my code secure?
Yes, your code stays local. AI providers only receive the context you explicitly share.

## Getting Help

### Where can I report bugs?
Open an issue on [GitHub](https://github.com/embedist/embedist/issues)

### How can I contribute?
See our [Contributing Guide](/development/contributing)

### Is there a community?
Join discussions on GitHub Discussions
