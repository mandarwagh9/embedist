import { useSettingsStore } from '../../../stores/settingsStore';

export function EditorSettings() {
  const { editor, updateEditor } = useSettingsStore();

  const fontFamilies = [
    "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
    "'Fira Code', 'JetBrains Mono', monospace",
    "'Cascadia Code', 'Fira Code', monospace",
    "'SF Mono', 'Consolas', monospace",
    "monospace",
  ];

  return (
    <div className="editor-settings">
      <div className="settings-section">
        <h3 className="settings-section-title">Typography</h3>
        
        <div className="settings-row">
          <div className="settings-label">
            <span>Font Size</span>
            <small>Editor font size in pixels</small>
          </div>
          <div className="settings-row-input">
            <input
              type="range"
              min="10"
              max="24"
              value={editor.fontSize}
              onChange={(e) => updateEditor({ fontSize: Number(e.target.value) })}
              className="settings-range"
            />
            <span className="settings-value">{editor.fontSize}px</span>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label">
            <span>Font Family</span>
            <small>Primary font for code editing</small>
          </div>
          <select
            className="settings-select"
            value={editor.fontFamily}
            onChange={(e) => updateEditor({ fontFamily: e.target.value })}
          >
            {fontFamilies.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        <div className="settings-row">
          <div className="settings-label">
            <span>Tab Size</span>
            <small>Number of spaces per tab</small>
          </div>
          <select
            className="settings-select"
            value={editor.tabSize}
            onChange={(e) => updateEditor({ tabSize: Number(e.target.value) })}
          >
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
            <option value={8}>8 spaces</option>
          </select>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Display</h3>

        <div className="settings-row">
          <div className="settings-label">
            <span>Theme</span>
            <small>Editor color scheme</small>
          </div>
          <select
            className="settings-select"
            value={editor.theme}
            onChange={(e) => updateEditor({ theme: e.target.value as 'embedist-dark' | 'vs-dark' | 'light' })}
          >
            <option value="embedist-dark">Embedist Dark</option>
            <option value="vs-dark">VS Dark</option>
            <option value="light">Light</option>
          </select>
        </div>

        <div className="settings-row">
          <div className="settings-label">
            <span>Word Wrap</span>
            <small>Wrap long lines instead of horizontal scroll</small>
          </div>
          <button
            className={`settings-toggle ${editor.wordWrap ? 'active' : ''}`}
            onClick={() => updateEditor({ wordWrap: !editor.wordWrap })}
          />
        </div>

        <div className="settings-row">
          <div className="settings-label">
            <span>Minimap</span>
            <small>Show code overview on the right side</small>
          </div>
          <button
            className={`settings-toggle ${editor.minimap ? 'active' : ''}`}
            onClick={() => updateEditor({ minimap: !editor.minimap })}
          />
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Auto-Save</h3>

        <div className="settings-row">
          <div className="settings-label">
            <span>Enable Auto-Save</span>
            <small>Automatically save files after changes</small>
          </div>
          <button
            className={`settings-toggle ${editor.autoSave ? 'active' : ''}`}
            onClick={() => updateEditor({ autoSave: !editor.autoSave })}
          />
        </div>

        {editor.autoSave && (
          <div className="settings-row">
            <div className="settings-label">
              <span>Auto-Save Delay</span>
              <small>Milliseconds to wait after last edit</small>
            </div>
            <div className="settings-row-input">
              <input
                type="range"
                min="500"
                max="10000"
                step="500"
                value={editor.autoSaveDelay}
                onChange={(e) => updateEditor({ autoSaveDelay: Number(e.target.value) })}
                className="settings-range"
              />
              <span className="settings-value">{editor.autoSaveDelay}ms</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
