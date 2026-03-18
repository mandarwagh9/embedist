import { useState } from 'react';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useAIStore } from '../../../stores/aiStore';

export function AISettings() {
  const { providers, updateProvider, addCustomEndpoint, removeCustomEndpoint, customEndpoints } = useSettingsStore();
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

  const handleAddCustom = () => {
    if (customForm.name && customForm.baseUrl && customForm.model) {
      addCustomEndpoint(customForm);
      setCustomForm({ name: '', baseUrl: '', apiKey: '', model: '' });
      setShowAddCustom(false);
    }
  };

  const handleSetActiveCustom = (endpointId: string) => {
    setActiveProvider(endpointId);
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
              onClick={() => setActiveProvider(provider.id)}
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
                  onChange={(e) => updateProvider(provider.id, { apiKey: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                />
                <label className="provider-label">Model</label>
                <select
                  className="settings-select"
                  value={providers[provider.id as keyof typeof providers]?.model || ''}
                  onChange={(e) => updateProvider(provider.id, { model: e.target.value })}
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
    </div>
  );
}
