import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSettingsStore } from '../../stores/settingsStore';
import './SetupWizard.css';

interface PlatformInfo {
  version: string;
  core_version: string;
  installed: boolean;
}

const COMMON_PLATFORMS = [
  { id: 'atmega328p', name: 'Arduino Uno/Nano', size: '~50MB' },
  { id: 'esp32', name: 'ESP32', size: '~80MB' },
  { id: 'esp8266', name: 'ESP8266', size: '~60MB' },
];

export function SetupWizard() {
  const { hasCompletedSetup, setHasCompletedSetup, build } = useSettingsStore();
  const [step, setStep] = useState(1);
  const [platformInfo, setPlatformInfo] = useState<{ os: string; arch: string } | null>(null);
  const [platformIOStatus, setPlatformIOStatus] = useState<PlatformInfo | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['esp32']);
  const platformioPath = build.platformioPath;

  useEffect(() => {
    if (!hasCompletedSetup) {
      checkPlatformIO();
      checkPlatform();
    }
  }, [hasCompletedSetup]);

  const checkPlatform = async () => {
    try {
      const info = await invoke<{ os: string; arch: string }>('get_platform_info');
      setPlatformInfo(info);
    } catch {
      setPlatformInfo(null);
    }
  };

  const checkPlatformIO = async () => {
    try {
      const info = await invoke<PlatformInfo>('check_platformio', {
        platformioPath: platformioPath || null,
      });
      setPlatformIOStatus(info);
    } catch (err) {
      setPlatformIOStatus({ version: 'Not found', core_version: '', installed: false });
    }
  };

  const handleInstallPlatformIO = async () => {
    setInstalling(true);
    setInstallProgress('Installing PlatformIO...');
    
    try {
      await invoke('install_platformio', { platformioPath: platformioPath || null });
      setInstallProgress('PlatformIO installed successfully!');
      await checkPlatformIO();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setInstallProgress(`Error: ${message}`);
    } finally {
      setInstalling(false);
    }
  };

  const handleInstallPlatforms = async () => {
    setInstalling(true);
    let allSuccess = true;
    
    for (const platform of selectedPlatforms) {
      setInstallProgress(`Installing ${platform}...`);
      try {
        await invoke('install_platform', { platform, platformioPath: platformioPath || null });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setInstallProgress(`Failed to install ${platform}: ${message}`);
        allSuccess = false;
        break;
      }
    }
    
    if (allSuccess) {
      setInstallProgress('All selected platforms installed!');
      setHasCompletedSetup(true);
    } else {
      setInstallProgress('Some platforms failed to install. You can retry later or skip to continue.');
    }
    setInstalling(false);
  };

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  if (hasCompletedSetup) return null;

  const isLinux = platformInfo?.os === 'linux';

  return (
    <div className="setup-wizard-overlay">
      <div className="setup-wizard">
        <div className="setup-wizard-header">
          <h1>Welcome to Embedist!</h1>
          <p>Let's set up your embedded development environment</p>
        </div>

        <div className="setup-wizard-steps">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>1. PlatformIO</div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Platforms</div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>3. AI Setup</div>
        </div>

        {step === 1 && (
          <div className="setup-wizard-content">
            <h2>Install PlatformIO</h2>
            <p>PlatformIO is required for building and uploading embedded projects.</p>
            
            <div className="platformio-status">
              <strong>Status:</strong> {
                platformIOStatus?.installed 
                  ? <span className="installed">✓ Installed ({platformIOStatus.version})</span>
                  : <span className="not-installed">✗ Not installed</span>
              }
            </div>

            {isLinux && !platformIOStatus?.installed && (
              <div className="setup-note linux-note">
                <strong>Linux setup:</strong> if auto-detection misses your install, set the CLI path to
                <code>{' '}{platformioPath}</code> in Settings or install with:
                <code> python3 -m pip install --user platformio</code>
              </div>
            )}

            {!platformIOStatus?.installed && (
              <div className="setup-wizard-actions setup-wizard-actions-left">
                <button 
                  className="setup-btn primary"
                  onClick={handleInstallPlatformIO}
                  disabled={installing}
                >
                  {installing ? 'Installing...' : 'Install PlatformIO'}
                </button>
                <button
                  className="setup-btn secondary"
                  onClick={checkPlatformIO}
                  disabled={installing}
                >
                  Recheck
                </button>
              </div>
            )}

            {installProgress && (
              <div className="install-progress">{installProgress}</div>
            )}

            {platformIOStatus?.installed && (
              <button 
                className="setup-btn primary"
                onClick={() => setStep(2)}
              >
                Continue
              </button>
            )}

            <button 
              className="setup-btn skip"
              onClick={() => setHasCompletedSetup(true)}
            >
              Skip for now
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="setup-wizard-content">
            <h2>Install Platforms</h2>
            <p>Select the microcontroller platforms you'll be using:</p>
            
            <div className="platforms-list">
              {COMMON_PLATFORMS.map(platform => (
                <label key={platform.id} className="platform-option">
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.includes(platform.id)}
                    onChange={() => togglePlatform(platform.id)}
                  />
                  <span className="platform-name">{platform.name}</span>
                  <span className="platform-size">{platform.size}</span>
                </label>
              ))}
            </div>

            <div className="setup-wizard-actions">
              <button className="setup-btn secondary" onClick={() => setStep(1)}>
                Back
              </button>
              <button 
                className="setup-btn primary"
                onClick={handleInstallPlatforms}
                disabled={installing}
              >
                {installing ? 'Installing...' : 'Install & Continue'}
              </button>
              <button 
                className="setup-btn skip"
                onClick={() => setStep(3)}
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="setup-wizard-content">
            <h2>AI Setup</h2>
            <p>Configure your AI provider to get started with AI-assisted development.</p>
            
            <p className="setup-note">
              You can configure AI providers in Settings later. Click below to open Settings now.
            </p>

            <div className="setup-wizard-actions">
              <button 
                className="setup-btn primary"
                onClick={() => setHasCompletedSetup(true)}
              >
                Skip for Now
              </button>
              <button 
                className="setup-btn secondary"
                onClick={() => {
                  setHasCompletedSetup(true);
                  useSettingsStore.getState().open();
                }}
              >
                Open Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
