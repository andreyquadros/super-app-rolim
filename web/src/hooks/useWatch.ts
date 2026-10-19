import { useCallback, useEffect, useState } from "react";
import type { Watcher } from "@/data/watch";
import { errorMessage } from "@/lib/errors";

export interface WatchState<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  /** Dados ainda não confirmados pelo servidor (salvos no aparelho) */
  fromCache: boolean;
}

/**
 * Assina dados em tempo real do Firestore. `watcher` deve ser estável
 * (crie-o com useMemo) ou null para não assinar nada.
 *
 * Sem servidor e sem nada salvo, `loading` continua true (esqueleto) até o
 * prazo de data/watch e então vira `error` (cartão com "Tentar de novo").
 */
export function useWatch<T>(watcher: Watcher<T> | null): WatchState<T> & { retry: () => void } {
  const [state, setState] = useState<WatchState<T>>({ data: undefined, loading: watcher !== null, error: null, fromCache: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!watcher) {
      setState({ data: undefined, loading: false, error: null, fromCache: false });
      return undefined;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    return watcher(
      (data, meta) => setState({ data, loading: false, error: null, fromCache: meta?.fromCache ?? false }),
      (error) =>
        setState({ data: undefined, loading: false, error: errorMessage(error, "Não foi possível carregar os dados."), fromCache: false }),
    );
  }, [watcher, attempt]);

  /** "Tentar de novo" depois de um erro */
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}
