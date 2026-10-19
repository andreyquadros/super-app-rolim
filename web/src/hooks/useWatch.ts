import { useCallback, useEffect, useState } from "react";
import type { Watcher } from "@/data/watch";
import { errorMessage } from "@/lib/errors";

export interface WatchState<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
}

/**
 * Assina dados em tempo real do Firestore. `watcher` deve ser estável
 * (crie-o com useMemo) ou null para não assinar nada.
 */
export function useWatch<T>(watcher: Watcher<T> | null): WatchState<T> & { retry: () => void } {
  const [state, setState] = useState<WatchState<T>>({ data: undefined, loading: watcher !== null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!watcher) {
      setState({ data: undefined, loading: false, error: null });
      return undefined;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    return watcher(
      (data) => setState({ data, loading: false, error: null }),
      (error) => setState({ data: undefined, loading: false, error: errorMessage(error, "Não foi possível carregar os dados.") }),
    );
  }, [watcher, attempt]);

  /** "Tentar de novo" depois de um erro */
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}
