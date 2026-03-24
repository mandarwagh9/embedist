import { useSettingsStore } from '../../../stores/settingsStore';

export function SerialSettings() {
  const { serial, updateSerial } = useSettingsStore();

  const baudRates = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

  return (
    <div className="serial-settings">
      <div className="settings-section">
        <h3 className="settings-section-title">Connection</h3>

        <div className="settings-row">
          <div className="settings-label">
            <span>Default Baud Rate</span>
            <small>Serial connection speed</small>
          </div>
          <select
            className="settings-select"
            value={serial.baudRate}
            onChange={(e) => updateSerial({ baudRate: Number(e.target.value) })}
          >
            {baudRates.map((rate) => (
              <option key={rate} value={rate}>{rate}</option>
            ))}
          </select>
        </div>

        <div className="settings-row">
          <div className="settings-label">
            <span>Line Ending</span>
            <small>Character sent when pressing Enter</small>
          </div>
          <select
            className="settings-select"
            value={serial.lineEnding}
            onChange={(e) => updateSerial({ lineEnding: e.target.value as 'CR' | 'LF' | 'CRLF' })}
          >
            <option value="CR">CR (Carriage Return)</option>
            <option value="LF">LF (Line Feed)</option>
            <option value="CRLF">CRLF (Both)</option>
          </select>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Behavior</h3>

        <div className="settings-row">
          <div className="settings-label">
            <span>Auto Scroll</span>
            <small>Automatically scroll to new output</small>
          </div>
          <button
            className={`settings-toggle ${serial.autoScroll ? 'active' : ''}`}
            onClick={() => updateSerial({ autoScroll: !serial.autoScroll })}
          />
        </div>

        <div className="settings-row">
          <div className="settings-label">
            <span>Clear on Connect</span>
            <small>Clear output when connecting to a port</small>
          </div>
          <button
            className={`settings-toggle ${serial.clearOnConnect ? 'active' : ''}`}
            onClick={() => updateSerial({ clearOnConnect: !serial.clearOnConnect })}
          />
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Flow Control</h3>

        <div className="settings-row">
          <div className="settings-label">
            <span>DTR (Data Terminal Ready)</span>
            <small>Enable DTR signal</small>
          </div>
          <button
            className={`settings-toggle ${serial.dtr ? 'active' : ''}`}
            onClick={() => updateSerial({ dtr: !serial.dtr })}
          />
        </div>

        <div className="settings-row">
          <div className="settings-label">
            <span>RTS (Request to Send)</span>
            <small>Enable RTS signal</small>
          </div>
          <button
            className={`settings-toggle ${serial.rts ? 'active' : ''}`}
            onClick={() => updateSerial({ rts: !serial.rts })}
          />
        </div>
      </div>
    </div>
  );
}
