import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSettingsStore } from '../stores/settingsStore';
import { useAIStore } from '../stores/aiStore';

export function useAIProviderSync() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const syncProviders = async () => {
      try {
        const settingsState = useSettingsStore.getState();
        const aiState = useAIStore.getState();

        const customEndpoints = settingsState.customEndpoints;
        const providers = settingsState.providers;
        const activeProvider = aiState.activeProvider;

        for (const ep of customEndpoints) {
          try {
            await invoke('add_ai_provider', {
              config: {
                id: ep.id,
                name: ep.name,
                api_key: ep.apiKey || '',
                base_url: ep.baseUrl,
                default_model: ep.model,
              },
            });
          } catch (err) {
            console.warn('[useAIProviderSync] Failed to sync custom endpoint:', ep.id, err);
          }
        }

        const builtinProviders = ['openai', 'anthropic', 'deepseek', 'google', 'ollama'] as const;
        for (const id of builtinProviders) {
          const config = providers[id];
          if (config?.apiKey) {
            try {
              await invoke('add_ai_provider', {
                config: {
                  id,
                  name: id.charAt(0).toUpperCase() + id.slice(1),
                  api_key: config.apiKey,
                  default_model: config.model,
                },
              });
            } catch (err) {
              console.warn('[useAIProviderSync] Failed to sync provider:', id, err);
            }
          }
        }

        if (activeProvider) {
          try {
            await invoke('set_active_provider', { providerId: activeProvider });
          } catch (err) {
            console.warn('[useAIProviderSync] Failed to set active provider:', activeProvider, err);
          }
        }

        console.log('[useAIProviderSync] Providers synced successfully');
      } catch (err) {
        console.error('[useAIProviderSync] Critical error during provider sync:', err);
      }
    };

    syncProviders();
  }, []);
}
