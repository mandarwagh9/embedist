---
sidebar_position: 2
---

# Quick Start

Get up and running with Embedist in 5 minutes.

## Step 1: Create a New Project

1. Click **New Project** in the sidebar
2. Select your board (ESP32, Arduino, etc.)
3. Choose a project template
4. Enter project name and location

## Step 2: Configure AI Provider

1. Go to **Settings** (gear icon)
2. Navigate to **AI Providers**
3. Select your preferred provider:
   - For cloud: Enter API key
   - For local: Start Ollama and configure
4. Click **Test Connection**

## Step 3: Connect Your Device

1. Connect your ESP32/Arduino via USB
2. Click the **Connect** button in the Serial Monitor
3. Select the correct COM port
4. Set baud rate (default: 115200)

## Step 4: Start Developing

1. Write your code in the Monaco Editor
2. Use **Build** to compile
3. Use **Upload** to flash to device
4. Monitor output in Serial Monitor

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

When you encounter issues, use the AI Assistant:

**User:** "My sensor is not returning data"

**Embedist:** "Your I2C pins are misconfigured. The default pins for ESP32 are GPIO21 (SDA) and GPIO22 (SCL), but your code uses GPIO4 and GPIO5 without reinitialization."

## Next Steps

- [Project Setup](/getting-started/project-setup) - More details on project management
- [AI Providers](/ai-providers/overview) - Configure your AI provider
- [Serial Monitor](/features/serial-monitor) - Learn about serial communication
