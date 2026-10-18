import { daysBetween } from "./format";
import { isOpenStatus, REQUEST_STATUSES, type RequestStatus } from "./status";

interface StatRequest {
  status: RequestStatus;
  createdAt: Date | null;
  statusChangedAt: Date | null;
}

export interface RequestStats {
  total: number;
  open: number;
  byStatus: Record<RequestStatus, number>;
  resolvedLast30: number;
  /** Média de dias entre abertura e conclusão (null se não há concluídas) */
  avgDaysToResolve: number | null;
  /** Abertas há mais de `staleDays` dias ainda sem análise */
  staleReceived: number;
}

const DAY = 24 * 3600 * 1000;

export function summarize(items: readonly StatRequest[], now: Date = new Date(), staleDays = 7): RequestStats {
  const byStatus = Object.fromEntries(REQUEST_STATUSES.map((s) => [s, 0])) as Record<RequestStatus, number>;
  let resolvedLast30 = 0;
  let staleReceived = 0;
  const durations: number[] = [];

  for (const item of items) {
    byStatus[item.status] += 1;
    if (item.status === "RESOLVED" && item.statusChangedAt) {
      if (now.getTime() - item.statusChangedAt.getTime() <= 30 * DAY) resolvedLast30 += 1;
      if (item.createdAt) durations.push(daysBetween(item.createdAt, item.statusChangedAt));
    }
    if (item.status === "RECEIVED" && item.createdAt && now.getTime() - item.createdAt.getTime() > staleDays * DAY) {
      staleReceived += 1;
    }
  }

  return {
    total: items.length,
    open: items.filter((i) => isOpenStatus(i.status)).length,
    byStatus,
    resolvedLast30,
    avgDaysToResolve: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null,
    staleReceived,
  };
}

/** Contagem por chave (categoria, tipo, bairro…), maior primeiro. */
export function countBy<T>(items: readonly T[], key: (item: T) => string): Array<{ key: string; count: number }> {
  const counts = new Map<string, number>();
  items.forEach((item) => counts.set(key(item), (counts.get(key(item)) ?? 0) + 1));
  return [...counts.entries()].map(([k, count]) => ({ key: k, count })).sort((a, b) => b.count - a.count);
}

export function formatDays(days: number | null): string {
  if (days === null) return "—";
  if (days < 1) return "menos de 1 dia";
  const rounded = Math.round(days * 10) / 10;
  return `${rounded.toLocaleString("pt-BR")} ${rounded === 1 ? "dia" : "dias"}`;
}
