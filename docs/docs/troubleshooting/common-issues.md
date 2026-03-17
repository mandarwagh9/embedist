---
sidebar_position: 1
---

# Common Issues

Solutions to frequently encountered problems.

## Installation Issues

### Node.js Version Error
```
Error: Node.js version 18+ is required
```
**Solution**: Upgrade Node.js from [nodejs.org](https://nodejs.org)

### Rust Not Found
```
error: cargo not found
```
**Solution**: Install Rust from [rustup.rs](https://rustup.rs)

## Serial Monitor Issues

### No COM Ports Listed
1. Connect your device
2. Install USB drivers (CP210x for ESP32, CH340 for Arduino)
3. Try different USB port

### Garbage Characters in Output
**Solution**: Wrong baud rate. Common rates:
- 9600
- 115200 (ESP32 default)
- 57600

### Connection "Timed Out"
- Device not in flashing mode
- Try holding BOOT button during connection

## Build Issues

### PlatformIO Not Found
```bash
# Install PlatformIO
pip install platformio
```

### Compilation Errors
- Check platformio.ini configuration
- Ensure all libraries are installed
- Verify board selection

### Upload Failed
- Check COM port selection
- Verify board drivers installed
- Try holding BOOT during upload

## AI Provider Issues

### API Key Invalid
- Verify key is correct
- Check provider dashboard for key status
- Ensure sufficient credits/quota

### Ollama Connection Failed
```bash
# Start Ollama
ollama serve

# Verify it's running
curl http://localhost:11434
```

## UI Issues

### Blank Window
- Try restarting the application
- Clear cache: `npm run clear`
- Check console for errors

### Slow Performance
- Close unused tabs
- Reduce file history size in settings
