import type { FirestoreError } from "firebase/firestore";
import type { Watcher } from "./watch";

// Sem importar o SDK (só tipos): usado pela primeira tela, que abre antes do Firebase.

/** Mesmo código de quando o Firestore não alcança o servidor (vira a mensagem de conexão). */
function loadFailed(cause: unknown): FirestoreError {
  const error = Object.assign(new Error("Não foi possível carregar os dados.", { cause }), {
    name: "FirebaseError",
    code: "unavailable" as const,
  });
  // Mesma forma que o FirestoreError para quem trata o erro (lib/errors)
  return error as unknown as FirestoreError;
}

/**
 * Assinatura cujo módulo de dados (e o Firebase) só é baixado ao assinar. Os
 * hooks da Início usam isto: a tela aparece sem esperar o SDK e os dados
 * chegam logo depois (com o esqueleto enquanto isso).
 */
export function lazyWatcher<T>(load: () => Promise<Watcher<T>>): Watcher<T> {
  return (onData, onError, options) => {
    let stopped = false;
    let unsubscribe: (() => void) | undefined;
    load().then(
      (watch) => {
        if (!stopped) unsubscribe = watch(onData, onError, options);
      },
      // Rede caiu antes de o pedaço chegar: o cartão mostra "Tentar de novo"
      (error: unknown) => {
        if (!stopped) onError(loadFailed(error));
      },
    );
    return () => {
      stopped = true;
      unsubscribe?.();
    };
  };
}
