import { storageGet, storageSet } from "./safeStorage";

// Quando a pessoa abriu "Avisos" pela última vez (marca o ponto de não lido).
const KEY = "rolim.noticesSeenAt";
const EVENT = "rolim:notices-seen";

/** Primeira visita (sem registro): só é "Novo" o que saiu nesses últimos dias. */
const FIRST_VISIT_DAYS = 7;
const DAY_MS = 24 * 3600 * 1000;

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

/**
 * Publicado depois da última visita a "Avisos" (seenAt = 0: nunca visitou).
 * Regra única do chip "Novo", do ponto na aba e do "Novo" da Início.
 */
export function isNewNotice(sentAt: Date | null | undefined, seenAt: number, now: Date): boolean {
  if (!sentAt) return false;
  const floor = seenAt > 0 ? seenAt : now.getTime() - FIRST_VISIT_DAYS * DAY_MS;
  return sentAt.getTime() > floor;
}

/**
 * Até onde a lista foi vista: o relógio do celular pode estar atrasado em
 * relação ao servidor, então nunca antes do aviso mais recente mostrado.
 */
export function seenMarkFor(latestSentAt: number, now: number = Date.now()): number {
  return Math.max(now, latestSentAt);
}
