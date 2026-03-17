---
sidebar_position: 3
---

# Project Setup

Learn how to create, manage, and configure embedded projects in Embedist.

## Creating a New Project

### Method 1: New Project Dialog

1. Click **File → New Project** or press `Ctrl+N`
2. Fill in the project details:
   - **Project Name**: my-esp32-project
   - **Location**: Choose folder
   - **Board**: ESP32 Dev Module
   - **Framework**: Arduino
3. Click **Create**

### Method 2: Open Existing Project

1. Click **File → Open Project**
2. Navigate to your project's folder
3. Select the folder (must contain `platformio.ini`)

## Supported Boards

### ESP32 Family
- ESP32 Dev Module
- ESP32-S3 Dev Module
- ESP32-C3 Dev Module
- ESP32-C6 Dev Module
- ESP32-H2

### Arduino Family
- Arduino Uno
- Arduino Nano
- Arduino Mega 2560
- Arduino Due

### Other
- Raspberry Pi Pico
- STM32 boards

## Project Structure

```
my-project/
├── src/
│   └── main.cpp          # Main source file
├── include/
│   └── README
├── lib/
│   └── README
├── test/
│   └── README
├── platformio.ini       # Project configuration
└── .vscode/
    └── settings.json    # VSCode settings
```

## Project Configuration

### platformio.ini Example

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200

lib_deps =
    adafruit/Adafruit GFX Library@^1.11.9
    adafruit/Adafruit SSD1306@^2.4.8
```

## Managing Libraries

1. Open **Libraries** in the sidebar
2. Search for required library
3. Click **Add** to include in project

## Board-Specific Settings

Navigate to **Project → Board Settings** to configure:
- Flash size
- Partition scheme
- Upload speed
- Monitor options
