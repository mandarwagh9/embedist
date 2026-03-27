---
sidebar_position: 2
---

# Quick Start

Get up and running with Embedist in 5 minutes.

## Step 1: Open Your Project

1. Press `Ctrl+O` or use **File > Open Folder**
2. Select your embedded project directory (ESP32, Arduino, etc.)
3. The File Explorer will show your project structure

## Step 2: Configure AI Provider

1. Press `Ctrl+,` to open **Settings**
2. Navigate to **AI Providers**
3. Add your preferred provider:
   - **Cloud**: Enter your API key (OpenAI, Anthropic, Google, DeepSeek, NVIDIA NIM)
   - **Local**: Start Ollama and configure
   - **Custom**: Add your own endpoint
4. Click **Test** to verify connectivity
5. Click **Save**

> **Tip**: For NVIDIA NIM, use Base URL `https://integrate.api.nvidia.com/v1` with model `moonshotai/kimi-k2.5` and enable **Thinking** mode.

## Step 3: Connect Your Device

1. Connect your ESP32/Arduino via USB
2. Press `Ctrl+Shift+L` to focus the **Serial Monitor**
3. Click **Connect** (or select the COM port manually)
4. Set baud rate (default: 115200)

## Step 4: Build and Upload

1. Open your source files in the Monaco Editor
2. Press `Ctrl+Shift+B` or click **Build** to compile
3. Click **Upload** to flash to your device
4. Monitor output in the Serial Monitor

## AI Modes

Embedist provides four AI modes:

| Mode | Shortcut | Description |
|------|----------|-------------|
| **Chat** | `Ctrl+1` | Ask questions, get hardware-aware answers |
| **Plan** | `Ctrl+2` | Collaborate on project plans |
| **Agent** | `Ctrl+3` | Autonomous code implementation |
| **Debug** | `Ctrl+4` | Hardware-aware debugging with tools |

## Example: Blink LED

```cpp
#include <Arduino.h>

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}
```

## AI Debugging Example

When you encounter issues, use the AI Debug mode:

1. Press `Ctrl+4` to switch to Debug mode
2. Describe your issue in the chat

**User:** "My sensor is not returning data"

**Embedist:** "Your I2C pins are misconfigured. The default pins for ESP32 are GPIO21 (SDA) and GPIO22 (SCL), but your code uses GPIO4 and GPIO5 without reinitialization."

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+O` | Open Folder |
| `Ctrl+,` | Settings |
| `Ctrl+S` | Save File |
| `Ctrl+1` | Chat Mode |
| `Ctrl+2` | Plan Mode |
| `Ctrl+3` | Agent Mode |
| `Ctrl+4` | Debug Mode |
| `Ctrl+Shift+B` | Build |
| `Ctrl+Shift+L` | Serial Monitor |
| `Ctrl+Shift+E` | File Explorer |
| `Ctrl+Shift+P` | Command Palette |

## Next Steps

- [Project Setup](/getting-started/project-setup) - More details on project management
- [AI Providers](/ai-providers/overview) - Configure your AI provider
- [Serial Monitor](/features/serial-monitor) - Learn about serial communication
