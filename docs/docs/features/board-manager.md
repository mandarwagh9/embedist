---
sidebar_position: 3
---

# Board Manager

The Board Manager helps you select and configure your embedded development boards.

## Supported Boards

### ESP32 Family
- ESP32 Dev Module
- ESP32-S3 (USB & Debug)
- ESP32-C3 (RISC-V)
- ESP32-C6
- ESP32-H2

### Arduino Family
- Arduino Uno (ATmega328P)
- Arduino Nano
- Arduino Mega 2560
- Arduino Due (SAM3X8E)

### Other
- Raspberry Pi Pico (RP2040)
- STM32F4 Discovery

## Board Configuration

### Pin Information
Each board includes:
- Default pin mappings
- ADC pins
- PWM-capable pins
- I2C/SPI/UART defaults

### Memory Constraints
- Flash size
- SRAM size
- Partition scheme options

## Selecting a Board

1. Open **Project → Board**
2. Search or browse available boards
3. Select your specific board variant
4. Configure board options

## Custom Boards

To add custom boards:
1. Edit `platformio.ini`
2. Add board definition
3. Restart Embedist
