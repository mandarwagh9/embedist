import { useState, useEffect } from 'react';
import type * as Monaco from 'monaco-editor';

let monacoInstance: typeof Monaco | null = null;
let loadPromise: Promise<typeof Monaco> | null = null;
let loadFailed = false;

function loadMonaco(): Promise<typeof Monaco> {
  if (monacoInstance) return Promise.resolve(monacoInstance);
  if (loadPromise && !loadFailed) return loadPromise;

  loadFailed = false;
  loadPromise = import('monaco-editor')
    .then((m) => {
      monacoInstance = m;
      return m;
    })
    .catch((err) => {
      loadFailed = true;
      loadPromise = null;
      throw err;
    });

  return loadPromise;
}

export function useMonacoEditor() {
  const [monaco, setMonaco] = useState<typeof Monaco | null>(monacoInstance);
  const [isReady, setIsReady] = useState(!!monacoInstance);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMonaco()
      .then((m) => {
        if (!cancelled) {
          setMonaco(m);
          setIsReady(true);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { monaco, isReady, error };
}
