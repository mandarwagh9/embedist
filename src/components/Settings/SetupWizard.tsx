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
  const { hasCompletedSetup, setHasCompletedSetup } = useSettingsStore();
  const [step, setStep] = useState(1);
  const [platformIOStatus, setPlatformIOStatus] = useState<PlatformInfo | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['esp32']);

  useEffect(() => {
    if (!hasCompletedSetup) {
      checkPlatformIO();
    }
  }, [hasCompletedSetup]);

  const checkPlatformIO = async () => {
    try {
      const info = await invoke<PlatformInfo>('check_platformio');
      setPlatformIOStatus(info);
    } catch (err) {
      setPlatformIOStatus({ version: 'Not found', core_version: '', installed: false });
    }
  };

  const handleInstallPlatformIO = async () => {
    setInstalling(true);
    setInstallProgress('Installing PlatformIO...');
    
    try {
      await invoke('install_platformio');
      setInstallProgress('PlatformIO installed successfully!');
      await checkPlatformIO();
    } catch (err) {
      setInstallProgress(`Error: ${err}`);
    } finally {
      setInstalling(false);
    }
  };

  const handleInstallPlatforms = async () => {
    setInstalling(true);
    
    for (const platform of selectedPlatforms) {
      setInstallProgress(`Installing ${platform}...`);
      try {
        await invoke('install_platform', { platform });
      } catch (err) {
        console.error(`Failed to install ${platform}:`, err);
      }
    }
    
    setInstallProgress('All selected platforms installed!');
    setInstalling(false);
    setHasCompletedSetup(true);
  };

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  if (hasCompletedSetup) return null;

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

            {!platformIOStatus?.installed && (
              <button 
                className="setup-btn primary"
                onClick={handleInstallPlatformIO}
                disabled={installing}
              >
                {installing ? 'Installing...' : 'Install PlatformIO'}
              </button>
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
