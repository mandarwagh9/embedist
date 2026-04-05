import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useAIStore } from '../../../stores/aiStore';

export function AISettings() {
  const { providers, updateProvider, addCustomEndpoint, removeCustomEndpoint, updateCustomEndpoint, customEndpoints, defaultImplementationMode, setDefaultImplementationMode, aiParameters, updateAiParameters } = useSettingsStore();
  const { activeProvider, setActiveProvider } = useAIStore();
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customForm, setCustomForm] = useState({ name: '', baseUrl: '', apiKey: '', model: '' });
  const [editingEndpoint, setEditingEndpoint] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', baseUrl: '', apiKey: '', model: '', thinking: false });
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});

  const providerList = [
    { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4'] },
    { id: 'anthropic', name: 'Anthropic', models: ['claude-3-5-sonnet-20241014', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229'] },
    { id: 'google', name: 'Google Gemini', models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'] },
    { id: 'deepseek', name: 'DeepSeek', models: ['deepseek-chat', 'deepseek-coder', 'deepseek-coder-v2'] },
    { id: 'ollama', name: 'Ollama (Local)', models: ['llama3.2', 'llama3.1', 'llama3', 'mistral', 'qwen', 'phi3', 'phi', 'codellama', 'mixtral'] },
  ];

  const handleAddCustom = async () => {
    if (customForm.name && customForm.baseUrl && customForm.model) {
      if (!/^https?:\/\/.+/.test(customForm.baseUrl)) {
        alert('Base URL must start with http:// or https://');
        return;
      }
      if (customEndpoints.some(e => e.name.toLowerCase() === customForm.name.toLowerCase())) {
        alert('An endpoint with this name already exists');
        return;
      }
      
      const newId = `custom-${crypto.randomUUID()}`;
      
      addCustomEndpoint({
        id: newId,
        name: customForm.name,
        baseUrl: customForm.baseUrl,
        apiKey: customForm.apiKey,
        model: customForm.model,
      });
      
      try {
        await invoke('add_ai_provider', {
          config: {
            id: newId,
            name: customForm.name,
            api_key: customForm.apiKey || '',
            base_url: customForm.baseUrl,
            default_model: customForm.model,
          }
        });
        
        await invoke('set_active_provider', { providerId: newId });
        setActiveProvider(newId);
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

  const handleEditCustom = async (endpointId: string) => {
    if (editForm.name && editForm.baseUrl && editForm.model) {
      const current = customEndpoints.find(e => e.id === endpointId);
      const newApiKey = editForm.apiKey === '__KEEP__' ? (current?.apiKey || '') : editForm.apiKey;
      
      updateCustomEndpoint(endpointId, {
        name: editForm.name,
        baseUrl: editForm.baseUrl,
        apiKey: newApiKey,
        model: editForm.model,
        thinking: editForm.thinking,
      });
      
      try {
        await invoke('add_ai_provider', {
          config: {
            id: endpointId,
            name: editForm.name,
            api_key: newApiKey,
            base_url: editForm.baseUrl,
            default_model: editForm.model,
          }
        });
      } catch (err) {
        console.error('Failed to update custom endpoint in backend:', err);
      }
      
      setEditingEndpoint(null);
      setEditForm({ name: '', baseUrl: '', apiKey: '', model: '', thinking: false });
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
    const currentProviders = useSettingsStore.getState().providers;
    updateProvider(providerId, updates);
    
    try {
      const config = currentProviders[providerId as keyof typeof currentProviders];
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
                    <div className="provider-endpoint-apikey">
                      <span>API Key: {endpoint.apiKey ? (showApiKeys[endpoint.id] ? endpoint.apiKey : '••••••••') : 'Not set'}</span>
                      {endpoint.apiKey && (
                        <button
                          className="settings-btn ghost small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowApiKeys(prev => ({ ...prev, [endpoint.id]: !prev[endpoint.id] }));
                          }}
                        >
                          {showApiKeys[endpoint.id] ? 'Hide' : 'Show'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="provider-card-actions">
                      <button
                        className="settings-btn secondary small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingEndpoint(endpoint.id);
                          setEditForm({
                            name: endpoint.name,
                            baseUrl: endpoint.baseUrl,
                            apiKey: endpoint.apiKey || '__KEEP__',
                            model: endpoint.model,
                            thinking: endpoint.thinking || false,
                          });
                        }}
                      >
                        Edit
                      </button>
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

        {editingEndpoint && (
          <div className="custom-endpoint-form">
            <div className="form-header">
              <h4>Edit Custom Endpoint</h4>
              <button className="settings-btn link small" onClick={() => setEditingEndpoint(null)}>
                Cancel
              </button>
            </div>
            <input
              type="text"
              className="settings-input"
              placeholder="Name (e.g., LM Studio)"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
            <input
              type="text"
              className="settings-input"
              placeholder="Base URL (e.g., http://localhost:1234/v1)"
              value={editForm.baseUrl}
              onChange={(e) => setEditForm({ ...editForm, baseUrl: e.target.value })}
            />
            <input
              type="password"
              className="settings-input"
              placeholder="API Key (leave empty to keep current)"
              value={editForm.apiKey}
              onChange={(e) => setEditForm({ ...editForm, apiKey: e.target.value })}
            />
            <input
              type="text"
              className="settings-input"
              placeholder="Model name"
              value={editForm.model}
              onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
            />
            <label className="thinking-toggle">
              <input
                type="checkbox"
                checked={editForm.thinking}
                onChange={(e) => setEditForm({ ...editForm, thinking: e.target.checked })}
              />
              <span>Enable Thinking Mode (for NVIDIA NIM models)</span>
            </label>
            <button className="settings-btn primary" onClick={() => handleEditCustom(editingEndpoint)}>
              Save Changes
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

      <div className="settings-section">
        <h3 className="settings-section-title">Model Parameters</h3>

        <div className="settings-row">
          <div className="settings-label">
            <span>Temperature</span>
            <small>Controls randomness (0 = deterministic, 1 = creative)</small>
          </div>
          <div className="settings-row-input">
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={aiParameters.temperature}
              onChange={(e) => updateAiParameters({ temperature: Number(e.target.value) })}
              className="settings-range"
            />
            <span className="settings-value">{aiParameters.temperature.toFixed(1)}</span>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label">
            <span>Max Tokens</span>
            <small>Maximum tokens in response</small>
          </div>
          <select
            className="settings-select"
            value={aiParameters.maxTokens}
            onChange={(e) => updateAiParameters({ maxTokens: Number(e.target.value) })}
          >
            <option value={1024}>1024</option>
            <option value={2048}>2048</option>
            <option value={4096}>4096</option>
            <option value={8192}>8192</option>
            <option value={16384}>16384</option>
          </select>
        </div>

        <div className="settings-row">
          <div className="settings-label">
            <span>Top P</span>
            <small>Nucleus sampling threshold</small>
          </div>
          <div className="settings-row-input">
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={aiParameters.topP}
              onChange={(e) => updateAiParameters({ topP: Number(e.target.value) })}
              className="settings-range"
            />
            <span className="settings-value">{aiParameters.topP.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
