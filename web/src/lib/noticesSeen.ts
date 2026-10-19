import { storageGet, storageSet } from "./safeStorage";

// Quando a pessoa abriu "Avisos" pela última vez (marca o ponto de não lido).
const KEY = "rolim.noticesSeenAt";
const EVENT = "rolim:notices-seen";

export function getNoticesSeenAt(): number {
  const value = Number(storageGet(KEY));
  return Number.isFinite(value) ? value : 0;
}

export function markNoticesSeen(at: number = Date.now()): void {
  storageSet(KEY, String(at));
  window.dispatchEvent(new Event(EVENT));
}

export function onNoticesSeen(listener: () => void): () => void {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
