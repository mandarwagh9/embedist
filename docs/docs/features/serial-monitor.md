---
sidebar_position: 2
---

# Serial Monitor

The Serial Monitor provides real-time communication with your embedded devices.

## Connecting

1. Click the **Serial** tab in the bottom panel
2. Click **Connect** button
3. Select the COM port from the dropdown
4. Choose baud rate (default: 115200)
5. Click **Open**

## Features

### Auto-Detect Baud Rate
If you're unsure of the baud rate, try:
- Common rates: 9600, 115200, 57600, 38400
- Check the device's documentation

### Log Display
- Timestamped output
- Color-coded messages (errors in red)
- Scrollable history
- Pause/Resume streaming

### Command Input
- Type commands in the input field
- Press Enter or click Send
- Supports newline characters

### Filtering
- Filter by text (e.g., `error`)
- Filter by regex
- Clear filters button

## Troubleshooting

### No Output
- Verify baud rate matches device
- Check USB cable (data-capable)
- Ensure device is powered
- Press device reset button

### Garbage Characters
- Wrong baud rate - adjust in toolbar
- Try different baud rates

### Connection Issues
- Check Device Manager (Windows) for COM ports
- Try different USB port
- Install USB drivers (CP210x, CH340)

## Configuration

Settings in **Settings → Serial**:
- Default baud rate
- Line ending (CR, LF, CRLF)
- Auto-scroll behavior
- Timestamp format
