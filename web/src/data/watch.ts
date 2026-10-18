import {
  onSnapshot,
  type DocumentData,
  type DocumentReference,
  type FirestoreError,
  type Query,
  type Unsubscribe,
} from "firebase/firestore";
import { dataOf, mapDocs } from "./convert";

export type OnData<T> = (value: T) => void;
export type OnError = (error: FirestoreError) => void;

/** Assinatura em tempo real que devolve um valor de domínio. */
export type Watcher<T> = (onData: OnData<T>, onError: OnError) => Unsubscribe;

export function watchQuery<T>(q: Query<DocumentData>, parse: (id: string, data: DocumentData) => T): Watcher<T[]> {
  return (onData, onError) => onSnapshot(q, (snap) => onData(mapDocs(snap, parse)), onError);
}

export function watchDoc<T>(ref: DocumentReference<DocumentData>, parse: (id: string, data: DocumentData) => T): Watcher<T | null> {
  return (onData, onError) =>
    onSnapshot(ref, (snap) => onData(snap.exists() ? parse(snap.id, dataOf(snap)) : null), onError);
}

/** Combina várias assinaturas (ex.: consultas "in" em lotes de 30). */
export function mergeWatchers<T>(watchers: Watcher<T[]>[]): Watcher<T[]> {
  return (onData, onError) => {
    if (watchers.length === 0) {
      onData([]);
      return () => undefined;
    }
    const parts: (T[] | undefined)[] = watchers.map(() => undefined);
    const unsubscribers = watchers.map((watch, index) =>
      watch((value) => {
        parts[index] = value;
        if (parts.every((p) => p !== undefined)) onData(parts.flatMap((p) => p ?? []));
      }, onError),
    );
    return () => unsubscribers.forEach((u) => u());
  };
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}
