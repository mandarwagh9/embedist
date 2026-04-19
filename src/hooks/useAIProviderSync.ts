import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSettingsStore } from '../stores/settingsStore';
import { useAIStore } from '../stores/aiStore';

type ProviderPayload = {
  id: string;
  name: string;
  api_key: string;
  base_url?: string;
  default_model: string;
};

type BackendProvider = {
  id: string;
};

export function useAIProviderSync() {
  const hasHydrated = useSettingsStore((state) => state.hasHydrated);
  const providers = useSettingsStore((state) => state.providers);
  const activeProvider = useAIStore((state) => state.activeProvider);
  const customEndpoints = useSettingsStore((state) => state.customEndpoints);
  const initialized = useRef(false);
  const prevSyncKeyRef = useRef<string>('');
  const syncingRef = useRef(false);
  const pendingRef = useRef(false);

  const syncProviders = async () => {
    try {
      const settingsState = useSettingsStore.getState();
      const aiState = useAIStore.getState();
      const desired = new Map<string, ProviderPayload>();

      for (const ep of settingsState.customEndpoints) {
        if (!ep.baseUrl) continue;
        desired.set(ep.id, {
          id: ep.id,
          name: ep.name,
          api_key: ep.apiKey || '',
          base_url: ep.baseUrl,
          default_model: ep.model,
        });
      }

      const builtinProviders = ['openai', 'anthropic', 'deepseek', 'google', 'ollama'] as const;
      for (const id of builtinProviders) {
        const config = settingsState.providers[id];
        if (!config?.apiKey) continue;
        desired.set(id, {
          id,
          name: id.charAt(0).toUpperCase() + id.slice(1),
          api_key: config.apiKey,
          default_model: config.model,
        });
      }

      let existingProviders: BackendProvider[] = [];
      try {
        existingProviders = await invoke<BackendProvider[]>('get_ai_providers');
      } catch (err) {
        console.warn('[useAIProviderSync] Failed to read backend providers before sync:', err);
      }

      const existingIds = new Set(existingProviders.map((p) => p.id));

      for (const id of existingIds) {
        if (!desired.has(id)) {
          try {
            await invoke('remove_ai_provider', { providerId: id });
          } catch (err) {
            console.warn('[useAIProviderSync] Failed to remove stale provider:', id, err);
          }
        }
      }

      for (const config of desired.values()) {
        try {
          await invoke('add_ai_provider', { config });
        } catch (err) {
          console.warn('[useAIProviderSync] Failed to upsert provider:', config.id, err);
        }
      }

      const requestedActive = aiState.activeProvider;
      const fallbackActive = desired.size > 0 ? desired.values().next().value?.id || null : null;
      const finalActive = desired.has(requestedActive) ? requestedActive : fallbackActive;

      if (finalActive) {
        try {
          await invoke('set_active_provider', { providerId: finalActive });
          if (requestedActive !== finalActive) {
            useAIStore.getState().setActiveProvider(finalActive);
          }
        } catch (err) {
          console.warn('[useAIProviderSync] Failed to set active provider:', finalActive, err);
        }
      }

      console.log('[useAIProviderSync] Providers synced successfully');
    } catch (err) {
      console.error('[useAIProviderSync] Critical error during provider sync:', err);
    }
  };

  const requestSync = async () => {
    if (syncingRef.current) {
      pendingRef.current = true;
      return;
    }

    syncingRef.current = true;
    try {
      do {
        pendingRef.current = false;
        await syncProviders();
      } while (pendingRef.current);
    } finally {
      syncingRef.current = false;
    }
  };

  useEffect(() => {
    if (!hasHydrated) return;

    if (!initialized.current) {
      initialized.current = true;
      requestSync();
    }
  }, [hasHydrated]);

  const currentSyncKey = JSON.stringify({ providers, customEndpoints, activeProvider });

  useEffect(() => {
    if (!hasHydrated) return;
    if (prevSyncKeyRef.current !== currentSyncKey) {
      prevSyncKeyRef.current = currentSyncKey;
      requestSync();
    }
  }, [hasHydrated, currentSyncKey]);
}
