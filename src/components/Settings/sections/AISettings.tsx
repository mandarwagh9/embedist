import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useAIStore } from '../../../stores/aiStore';

export function AISettings() {
  const { providers, updateProvider, addCustomEndpoint, removeCustomEndpoint, customEndpoints, defaultImplementationMode, setDefaultImplementationMode } = useSettingsStore();
  const { activeProvider, setActiveProvider } = useAIStore();
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customForm, setCustomForm] = useState({ name: '', baseUrl: '', apiKey: '', model: '' });

  const providerList = [
    { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
    { id: 'anthropic', name: 'Anthropic', models: ['claude-3-5-sonnet-20241014', 'claude-3-opus-20240229'] },
    { id: 'google', name: 'Google Gemini', models: ['gemini-2.0-flash', 'gemini-1.5-pro'] },
    { id: 'deepseek', name: 'DeepSeek', models: ['deepseek-chat', 'deepseek-coder'] },
    { id: 'ollama', name: 'Ollama (Local)', models: ['llama3.2', 'mistral', 'qwen', 'phi'] },
  ];

  const handleAddCustom = async () => {
    if (customForm.name && customForm.baseUrl && customForm.model) {
      const endpointId = `custom-${Date.now()}`;
      
      addCustomEndpoint({
        id: endpointId,
        name: customForm.name,
        baseUrl: customForm.baseUrl,
        apiKey: customForm.apiKey,
        model: customForm.model,
      });
      
      try {
        await invoke('add_ai_provider', {
          config: {
            id: endpointId,
            name: customForm.name,
            api_key: customForm.apiKey || '',
            base_url: customForm.baseUrl,
            default_model: customForm.model,
          }
        });
        
        await invoke('set_active_provider', { providerId: endpointId });
        setActiveProvider(endpointId);
      } catch (err) {
        console.error('Failed to register custom endpoint with backend:', err);
      }
      
      setCustomForm({ name: '', baseUrl: '', apiKey: '', model: '' });
      setShowAddCustom(false);
    }
  };

  const handleSetActiveCustom = async (endpointId: string) => {
    setActiveProvider(endpointId);
    try {
      await invoke('set_active_provider', { providerId: endpointId });
    } catch (err) {
      console.error('Failed to set active provider:', err);
    }
  };

  const handleSetActive = async (providerId: string) => {
    setActiveProvider(providerId);
    try {
      await invoke('set_active_provider', { providerId });
    } catch (err) {
      console.error('Failed to set active provider:', err);
    }
  };

  const handleProviderUpdate = async (providerId: string, updates: { apiKey?: string; model?: string }) => {
    updateProvider(providerId, updates);
    
    try {
      const config = providers[providerId as keyof typeof providers];
      await invoke('add_ai_provider', {
        config: {
          id: providerId,
          name: providerId.charAt(0).toUpperCase() + providerId.slice(1),
          api_key: updates.apiKey ?? config?.apiKey ?? '',
          default_model: updates.model ?? config?.model ?? '',
        }
      });
    } catch (err) {
      console.error('Failed to sync provider config:', err);
    }
  };

  return (
    <div className="ai-settings">
      <div className="settings-section">
        <h3 className="settings-section-title">Active Provider</h3>
        <div className="provider-cards">
          {providerList.map((provider) => (
            <div
              key={provider.id}
              className={`provider-card ${activeProvider === provider.id ? 'active' : ''}`}
              onClick={() => handleSetActive(provider.id)}
            >
              <div className="provider-card-header">
                <span className="provider-name">{provider.name}</span>
                {activeProvider === provider.id && (
                  <span className="provider-active-badge">Active</span>
                )}
              </div>
              <div className="provider-card-body">
                <label className="provider-label">API Key</label>
                <input
                  type="password"
                  className="settings-input"
                  placeholder="sk-..."
                  value={providers[provider.id as keyof typeof providers]?.apiKey || ''}
                  onChange={(e) => handleProviderUpdate(provider.id, { apiKey: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                />
                <label className="provider-label">Model</label>
                <select
                  className="settings-select"
                  value={providers[provider.id as keyof typeof providers]?.model || ''}
                  onChange={(e) => handleProviderUpdate(provider.id, { model: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                >
                  {provider.models.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}

          {customEndpoints.length > 0 && (
            <>
              <div className="provider-divider">
                <span>Custom Endpoints</span>
              </div>
              {customEndpoints.map((endpoint) => (
                <div
                  key={endpoint.id}
                  className={`provider-card ${activeProvider === endpoint.id ? 'active' : ''}`}
                  onClick={() => handleSetActiveCustom(endpoint.id)}
                >
                  <div className="provider-card-header">
                    <span className="provider-name">{endpoint.name}</span>
                    {activeProvider === endpoint.id && (
                      <span className="provider-active-badge">Active</span>
                    )}
                  </div>
                  <div className="provider-card-body">
                    <div className="provider-endpoint-url">{endpoint.baseUrl}</div>
                    <div className="provider-endpoint-model">Model: {endpoint.model}</div>
                    <button
                      className="settings-btn danger small"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCustomEndpoint(endpoint.id);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-header">
          <h3 className="settings-section-title">Add Custom Endpoint</h3>
          <button className="settings-btn" onClick={() => setShowAddCustom(!showAddCustom)}>
            {showAddCustom ? 'Cancel' : '+ Add Custom'}
          </button>
        </div>
        
        {showAddCustom && (
          <div className="custom-endpoint-form">
            <input
              type="text"
              className="settings-input"
              placeholder="Name (e.g., LM Studio)"
              value={customForm.name}
              onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })}
            />
            <input
              type="text"
              className="settings-input"
              placeholder="Base URL (e.g., http://localhost:1234/v1)"
              value={customForm.baseUrl}
              onChange={(e) => setCustomForm({ ...customForm, baseUrl: e.target.value })}
            />
            <input
              type="password"
              className="settings-input"
              placeholder="API Key (optional)"
              value={customForm.apiKey}
              onChange={(e) => setCustomForm({ ...customForm, apiKey: e.target.value })}
            />
            <input
              type="text"
              className="settings-input"
              placeholder="Model name"
              value={customForm.model}
              onChange={(e) => setCustomForm({ ...customForm, model: e.target.value })}
            />
            <button className="settings-btn primary" onClick={handleAddCustom}>
              Add Endpoint
            </button>
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Plan Mode</h3>

        <div className="settings-row">
          <div className="settings-label">
            <span>After Plan Approval</span>
            <small>Which mode to switch to when a plan is approved</small>
          </div>
          <select
            className="settings-select"
            value={defaultImplementationMode}
            onChange={(e) => setDefaultImplementationMode(e.target.value as 'chat' | 'agent')}
          >
            <option value="chat">Chat Mode</option>
            <option value="agent">Agent Mode</option>
          </select>
        </div>
      </div>
    </div>
  );
}
