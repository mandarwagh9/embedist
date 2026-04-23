import { useSettingsStore } from '../../../stores/settingsStore';

export function BuildSettings() {
  const { build, updateBuild } = useSettingsStore();

  const boards = [
    { id: 'esp32dev', name: 'ESP32 Dev Module' },
    { id: 'esp32-s3-devkitc-1', name: 'ESP32-S3' },
    { id: 'esp32-c3-devkitm-1', name: 'ESP32-C3' },
    { id: 'esp01_1m', name: 'ESP8266 (1MB)' },
    { id: 'esp01_512k', name: 'ESP8266 (512KB)' },
    { id: 'esp01_256k', name: 'ESP8266 (256KB)' },
    { id: 'arduino_nano', name: 'Arduino Nano' },
    { id: 'nano33ble', name: 'Arduino Nano 33 BLE Sense' },
    { id: 'arduino_mega2560', name: 'Arduino Mega 2560' },
    { id: 'rpipico', name: 'Raspberry Pi Pico' },
  ];

  const uploadSpeeds = [115200, 460800, 921600, 1500000];

  return (
    <div className="build-settings">
      <div className="settings-section">
        <h3 className="settings-section-title">PlatformIO</h3>

        <div className="settings-row">
          <div className="settings-label">
            <span>PlatformIO CLI Path</span>
            <small>Leave as 'pio' if it is on PATH, or set an absolute path like /home/you/.local/bin/pio</small>
          </div>
          <input
            type="text"
            className="settings-input"
            placeholder="pio"
            value={build.platformioPath}
            onChange={(e) => updateBuild({ platformioPath: e.target.value })}
          />
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Defaults</h3>

        <div className="settings-row">
          <div className="settings-label">
            <span>Default Board</span>
            <small>Board selected for new projects</small>
          </div>
          <select
            className="settings-select"
            value={build.defaultBoard}
            onChange={(e) => updateBuild({ defaultBoard: e.target.value })}
          >
            {boards.map((board) => (
              <option key={board.id} value={board.id}>{board.name}</option>
            ))}
          </select>
        </div>

        <div className="settings-row">
          <div className="settings-label">
            <span>Upload Speed</span>
            <small>Firmware upload baud rate</small>
          </div>
          <select
            className="settings-select"
            value={build.uploadSpeed}
            onChange={(e) => updateBuild({ uploadSpeed: Number(e.target.value) })}
          >
            {uploadSpeeds.map((speed) => (
              <option key={speed} value={speed}>{speed}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
