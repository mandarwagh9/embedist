---
sidebar_position: 3
---

# AI Debugger

The AI Debugger is Embedist's core differentiator - a hardware-aware AI assistant that understands embedded systems.

## How It Works

```
┌──────────────────────────────────────────────────────────────┐
│                     User Query                                │
│  "My sensor is not returning data"                          │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│              Context Gatherer                                 │
│  • Project code (all .ino/.cpp files)                       │
│  • PlatformIO.ini configuration                            │
│  • Build errors (if any)                                    │
│  • Recent serial logs                                       │
│  • Board configuration                                       │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│              Knowledge Base (RAG)                             │
│  • ESP32 pin mappings                                       │
│  • Arduino API docs                                          │
│  • Common error patterns                                     │
│  • Board-specific constraints                               │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│              AI Analysis                                      │
│  • Identify likely root causes                              │
│  • Cross-reference with knowledge base                      │
│  • Generate specific fix suggestions                         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│              Specific Fix Response                            │
│  "Your I2C pins are misconfigured. The default pins for    │
│   ESP32 are GPIO21 (SDA) and GPIO22 (SCL), but your code  │
│   uses GPIO4 and GPIO5 without reinitialization."          │
└──────────────────────────────────────────────────────────────┘
```

## Problem Detection Examples

### Pin Misconfiguration

**Problem**: User uses wrong I2C pins
```cpp
// User's code
Wire.begin(4, 5);  // Wrong pins for ESP32
```

**Embedist Response**:
> Your I2C pins are misconfigured. The default pins for ESP32 are GPIO21 (SDA) and GPIO22 (SCL), but your code uses GPIO4 and GPIO5 without proper wire initialization.

### Upload Failures

**Problem**: "Failed to connect - Timed out"
**Embedist Response**:
> Your ESP32 is not in flashing mode. Hold the BOOT button while pressing the EN/RST button, then release BOOT while the upload is in progress.

### Memory Issues

**Problem**: Build warning about sketch size
**Embedist Response**:
> Your sketch is approaching the flash memory limit. Consider:
> 1. Using `PROGMEM` for constant data
> 2. Removing unused libraries
> 3. Enabling compiler optimizations in platformio.ini

## Knowledge Base

Embedist includes a built-in knowledge base with:

### ESP32 Pin Mappings
- Default I2C pins (SDA: GPIO21, SCL: GPIO22)
- Default SPI pins (MOSI: 23, MISO: 19, SCK: 18)
- ADC pins and their limitations
- Touch sensor pins

### Common Error Patterns
- 50+ documented error patterns
- Root causes and solutions
- Board-specific variations

### Peripheral Configurations
- I2C scanner implementation
- SPI device setup
- UART configuration
- PWM pin requirements
