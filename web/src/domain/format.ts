// Um só jeito de escrever datas e endereços em todas as telas
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
const timeFormatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
const relativeFormatter = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
// "às 14:30" não se separa na quebra de linha
const AT = ", às\u00a0";

/** "13 de out. de 2026" */
export function formatDate(date: Date | null | undefined): string {
  return date ? dateFormatter.format(date) : "—";
}

/** "13 de out. de 2026, às 14:30" */
export function formatDateTime(date: Date | null | undefined): string {
  return date ? `${dateFormatter.format(date)}${AT}${timeFormatter.format(date)}` : "—";
}

/** Dia do ocorrido (AAAA-MM-DD) e horário opcional: "18 de out. de 2026, às 14:30". */
export function formatOccurrence(isoDate: string | null | undefined, time?: string | null): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate ?? "");
  if (!match) return "—";
  const day = formatDate(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return time ? `${day}${AT}${time}` : day;
}

export interface AddressParts {
  streetType: string;
  streetName: string;
  number?: string | null;
  neighborhood: string;
}

/** "Avenida Norte Sul, 1200 · Centro" (número e bairro vazios ficam de fora). */
export function formatAddressLine({ streetType, streetName, number, neighborhood }: AddressParts): string {
  const street = [`${streetType.trim()} ${streetName.trim()}`.trim(), number?.trim()].filter(Boolean).join(", ");
  return [street, neighborhood.trim()].filter(Boolean).join(" · ");
}

const UNITS: ReadonlyArray<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "há 3 dias", "agora mesmo" */
export function relativeTime(date: Date | null | undefined, now: Date = new Date()): string {
  if (!date) return "—";
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relativeFormatter.format(Math.trunc(seconds / size), unit);
  }
  return "agora mesmo";
}

/** "Bom dia" / "Boa tarde" / "Boa noite" */
export function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function firstName(fullName: string | null | undefined): string {
  return fullName?.trim().split(/\s+/)[0] ?? "";
}

/** Data local no formato AAAA-MM-DD (para inputs type="date"). */
export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function daysBetween(start: Date, end: Date): number {
  return Math.max(0, (end.getTime() - start.getTime()) / (24 * 3600 * 1000));
}
