import { FirebaseError } from "firebase/app";
import {
  onSnapshot,
  type DocumentData,
  type DocumentReference,
  type FirestoreError,
  type Query,
  type Unsubscribe,
} from "firebase/firestore";
import { dataOf, mapDocs } from "./convert";

/** De onde veio o valor entregue. */
export interface WatchMeta {
  /** Ainda sem confirmação do servidor (sem internet: dados salvos no aparelho) */
  fromCache: boolean;
}

export type OnData<T> = (value: T, meta?: WatchMeta) => void;
export type OnError = (error: FirestoreError) => void;

export interface WatchOptions {
  /**
   * Entrega também o vazio (ou o documento ausente) que só o cache conhece.
   * Padrão: segura até o servidor confirmar. Use quando "nada" é a resposta
   * segura (ex.: cadastro da equipe) ou quando quem assina decide (mergeWatchers).
   */
  deliverEmptyFromCache?: boolean;
}

/** Assinatura em tempo real que devolve um valor de domínio. */
export type Watcher<T> = (onData: OnData<T>, onError: OnError, options?: WatchOptions) => Unsubscribe;

/** Tempo sem resposta do servidor (e sem nada salvo) até a tela mostrar o erro. */
export const CACHE_GRACE_MS = 8000;

/**
 * Vazio vindo só do cache não prova que não há nada: pode ser o primeiro
 * acesso, o cache limpo ao sair ou o servidor fora de alcance. Segura até o
 * servidor responder. Depois de entregar algo, acompanha o cache normalmente.
 */
export function shouldHoldSnapshot(snapshot: { fromCache: boolean; empty: boolean; delivered: boolean }): boolean {
  return snapshot.fromCache && snapshot.empty && !snapshot.delivered;
}

/** Mesmo código de quando o Firestore não alcança o servidor. */
function unavailableError(): FirestoreError {
  const error = new FirebaseError("unavailable", "Sem resposta do servidor e nada salvo neste aparelho.");
  return Object.assign(error, { code: "unavailable" as const });
}

export interface CacheGate<T> {
  /** `changed` = false quando só os metadados mudaram (ex.: gravação confirmada) */
  push: (value: T, fromCache: boolean, changed?: boolean) => void;
  fail: OnError;
  stop: () => void;
}

/**
 * Decide o que chega à tela: segura o vazio só do cache e, se o servidor não
 * responder em `graceMs`, avisa com um erro "unavailable" (a assinatura
 * continua: quando o servidor responder, os dados substituem o erro).
 */
export function createCacheGate<T>(
  onData: OnData<T>,
  onError: OnError,
  isEmpty: (value: T) => boolean,
  options: WatchOptions = {},
  graceMs = CACHE_GRACE_MS,
): CacheGate<T> {
  const holdEmpty = !options.deliverEmptyFromCache;
  let delivered = false;
  let lastFromCache: boolean | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const clear = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  if (holdEmpty) {
    timer = setTimeout(() => {
      timer = undefined;
      if (!delivered) onError(unavailableError());
    }, graceMs);
  }

  return {
    push(value, fromCache, changed = true) {
      if (delivered && !changed && fromCache === lastFromCache) return;
      if (holdEmpty && shouldHoldSnapshot({ fromCache, empty: isEmpty(value), delivered })) return;
      delivered = true;
      lastFromCache = fromCache;
      clear();
      onData(value, { fromCache });
    },
    fail(error) {
      clear();
      onError(error);
    },
    stop: clear,
  };
}

const isEmptyList = (items: readonly unknown[]) => items.length === 0;

export function watchQuery<T>(q: Query<DocumentData>, parse: (id: string, data: DocumentData) => T): Watcher<T[]> {
  return (onData, onError, options) => {
    const gate = createCacheGate<T[]>(onData, onError, isEmptyList, options);
    const stop = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => gate.push(mapDocs(snap, parse), snap.metadata.fromCache, snap.docChanges().length > 0),
      gate.fail,
    );
    return () => {
      gate.stop();
      stop();
    };
  };
}

/** `null` só quando o servidor confirma que o documento não existe (ou com deliverEmptyFromCache). */
export function watchDoc<T>(ref: DocumentReference<DocumentData>, parse: (id: string, data: DocumentData) => T): Watcher<T | null> {
  return (onData, onError, options) => {
    const gate = createCacheGate<T | null>(onData, onError, (value) => value === null, options);
    const stop = onSnapshot(
      ref,
      { includeMetadataChanges: true },
      (snap) => gate.push(snap.exists() ? parse(snap.id, dataOf(snap)) : null, snap.metadata.fromCache),
      gate.fail,
    );
    return () => {
      gate.stop();
      stop();
    };
  };
}

interface Part<T> {
  items: T[];
  fromCache: boolean;
}

/**
 * Combina várias assinaturas (ex.: consultas "in" em lotes de 30). O vazio só
 * do cache é decidido no conjunto: uma consulta vazia não esconde as outras.
 */
export function mergeWatchers<T>(watchers: Watcher<T[]>[]): Watcher<T[]> {
  return (onData, onError, options) => {
    if (watchers.length === 0) {
      onData([], { fromCache: false });
      return () => undefined;
    }
    const gate = createCacheGate<T[]>(onData, onError, isEmptyList, options);
    let parts: readonly (Part<T> | undefined)[] = watchers.map(() => undefined);
    const unsubscribers = watchers.map((watch, index) =>
      watch(
        (items, meta) => {
          const part: Part<T> = { items, fromCache: meta?.fromCache ?? false };
          parts = parts.map((p, i) => (i === index ? part : p));
          const ready = parts.filter((p): p is Part<T> => p !== undefined);
          if (ready.length < parts.length) return;
          gate.push(
            ready.flatMap((p) => p.items),
            ready.some((p) => p.fromCache),
          );
        },
        gate.fail,
        { deliverEmptyFromCache: true },
      ),
    );
    return () => {
      gate.stop();
      unsubscribers.forEach((u) => u());
    };
  };
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}
