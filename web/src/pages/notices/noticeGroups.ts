// Agrupamento dos avisos por data e marcação de "Novo" (funções puras, com teste).

export type NoticeGroupKey = "hoje" | "semana" | "antigos";

export interface NoticeGroup<T> {
  key: NoticeGroupKey;
  title: string;
  items: T[];
}

interface Dated {
  sentAt: Date | null;
}

const GROUP_ORDER: readonly NoticeGroupKey[] = ["hoje", "semana", "antigos"];

export const NOTICE_GROUP_TITLE: Record<NoticeGroupKey, string> = {
  hoje: "Hoje",
  semana: "Esta semana",
  antigos: "Mais antigos",
};

/** Dias corridos (contando hoje) que valem como "Esta semana". */
const WEEK_DAYS = 7;
/** Primeira visita (sem registro): só é "Novo" o que saiu nesses últimos dias. */
const FIRST_VISIT_DAYS = 7;
const DAY_MS = 24 * 3600 * 1000;

function startOfDay(now: Date, daysAgo = 0): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo).getTime();
}

/** Hoje, últimos 7 dias ou mais antigo (pelo calendário local). */
export function noticeGroupOf(sentAt: Date | null, now: Date): NoticeGroupKey {
  if (!sentAt) return "antigos";
  const time = sentAt.getTime();
  if (time >= startOfDay(now)) return "hoje";
  return time >= startOfDay(now, WEEK_DAYS - 1) ? "semana" : "antigos";
}

/** Mantém a ordem recebida (mais recentes primeiro) e omite grupos vazios. */
export function groupNotices<T extends Dated>(list: readonly T[], now: Date): NoticeGroup<T>[] {
  return GROUP_ORDER.map((key) => ({
    key,
    title: NOTICE_GROUP_TITLE[key],
    items: list.filter((item) => noticeGroupOf(item.sentAt, now) === key),
  })).filter((group) => group.items.length > 0);
}

/** Publicado depois da última visita a "Avisos" (seenAt = 0: nunca visitou). */
export function isNewNotice(sentAt: Date | null, seenAt: number, now: Date): boolean {
  if (!sentAt) return false;
  const floor = seenAt > 0 ? seenAt : now.getTime() - FIRST_VISIT_DAYS * DAY_MS;
  return sentAt.getTime() > floor;
}
