---
sidebar_position: 4
---

# Build & Upload

Embedist integrates PlatformIO for building and flashing firmware.

## Building

### Quick Build
1. Press `Ctrl+B` or click **Build** button
2. View output in the Build panel
3. Check for errors/warnings

### Build Options
- **Clean**: Remove build artifacts
- **Verbose**: Detailed compilation output
- **Release/Debug**: Build type selection

## Uploading

### Standard Upload
1. Connect your board via USB
2. Select correct port in toolbar
3. Press `Ctrl+U` or click **Upload**
4. Wait for completion

### Bootloader Mode
Some boards require manual bootloader entry:
1. Hold **BOOT** button
2. Press **EN/RST** button
3. Release **BOOT** (while still holding EN)
4. Start upload

## Troubleshooting

### Upload Failed - Timeout
- Board not in flashing mode
- Try holding BOOT button during upload
- Check USB cable

### Permission Denied (Linux/Mac)
```bash
sudo usermod -a -G dialout $USER
# Log out and back in
```

### Driver Issues (Windows)
- Install CP210x drivers for ESP32
- Install CH340 drivers for Arduino Nano clones

## Build Output

The Build panel shows:
- Compilation progress
- Source files compiled
- Library dependencies
- Memory usage summary
- Error messages (if any)
