import { onlyDigits } from "@/domain/documents";
import { sortDuty } from "@/domain/duty";
import { greeting } from "@/domain/format";
import { isOpenStatus } from "@/domain/status";
import type { Building, CitizenRequest, Phone } from "@/domain/types";

// Regras de texto e de escolha da Início (funções puras, testadas em homeText.test.ts).

const longDateFormatter = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" });

/** "Segunda-feira, 19 de outubro" */
export function longDate(now: Date): string {
  const text = longDateFormatter.format(now);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

interface GreetingInput {
  /** Ainda não sabemos quem está logado */
  loading: boolean;
  signedIn: boolean;
  /** Primeiro nome ("" quando não há) */
  name: string;
}

/** "Boa noite, Maria." / "Olá! Que bom ter você aqui." */
export function homeGreeting({ loading, signedIn, name }: GreetingInput, now: Date): string {
  if (loading) return `${greeting(now)}!`;
  if (!signedIn) return "Olá! Que bom ter você aqui.";
  return name ? `${greeting(now)}, ${name}.` : `${greeting(now)}!`;
}

export interface GreetingParts {
  /** "Boa noite," ou "Olá!": nunca quebra no meio */
  lead: string;
  /** " Maria." (com o espaço) ou "" */
  rest: string;
}

/** Separa o cumprimento do resto, para "Boa noite," não virar "Boa / noite,". */
export function greetingParts(title: string): GreetingParts {
  const match = /^(.+?[,!])(\s.*)?$/.exec(title);
  return match ? { lead: match[1], rest: match[2] ?? "" } : { lead: title, rest: "" };
}

/** Linha de apoio dos blocos de plantão: "1 de plantão agora" ou o texto de reserva. */
export function dutyCountLabel(onDuty: number, fallback: string): string {
  return onDuty > 0 ? `${onDuty} de plantão agora` : fallback;
}

interface DutyListState {
  data: readonly Building[];
  loading: boolean;
  error: string | null;
}

/**
 * Destino do bloco de plantão: a lista do tipo; o filtro de reserva ("abertas",
 * "todas") só quando o servidor respondeu que ninguém está de plantão.
 */
export function dutyTileTarget(state: DutyListState, path: string, emptyFilter: string): string {
  const known = !state.loading && state.error === null;
  const anyOnDuty = state.data.some((u) => u.isOnDuty);
  return known && !anyOnDuty ? `${path}?filtro=${emptyFilter}` : path;
}

export interface DutyPick {
  /** A primeira de plantão (a mais perto, se houver localização) */
  first: Building | null;
  /** Quantas outras também estão de plantão */
  others: number;
}

export function pickOnDuty(list: readonly Building[], distanceOf?: (u: Building) => number | null): DutyPick {
  const onDuty = sortDuty(
    list.filter((u) => u.isOnDuty),
    distanceOf,
  );
  return { first: onDuty[0] ?? null, others: Math.max(0, onDuty.length - 1) };
}

/** O maior "atualizado em" da lista (null se nenhuma informou). */
export function latestUpdate(list: readonly Building[]): Date | null {
  return list.reduce<Date | null>((max, u) => (u.updatedAt && (!max || u.updatedAt > max) ? u.updatedAt : max), null);
}

/** Telefone para o botão "Ligar": o primeiro que não é só WhatsApp. */
export function callablePhone(phones: readonly Phone[]): string | null {
  const phone = phones.find((p) => p.type !== "WHATSAPP") ?? phones[0];
  return phone ? `tel:${onlyDigits(phone.number)}` : null;
}

const lastChange = (r: CitizenRequest) => (r.statusChangedAt ?? r.updatedAt ?? r.createdAt)?.getTime() ?? 0;

/** Pedidos em andamento, o que mudou por último primeiro. */
export function openRequestsPreview(list: readonly CitizenRequest[], max = 2): CitizenRequest[] {
  return list
    .filter((r) => isOpenStatus(r.status))
    .sort((a, b) => lastChange(b) - lastChange(a))
    .slice(0, max);
}

export type InviteKind = "install" | "push";

interface InviteInput {
  /** O navegador oferece instalar (Android/computador) ou é iPhone */
  installable: boolean;
  installDismissed: boolean;
  signedIn: boolean;
  /** Avisos suportados e ainda desligados */
  canPush: boolean;
  hasRequests: boolean;
  pushDismissed: boolean;
}

/** No máximo um convite por vez: instalar primeiro, depois ligar os avisos. */
export function chooseInvite(input: InviteInput): InviteKind | null {
  if (input.installable && !input.installDismissed) return "install";
  if (input.signedIn && input.canPush && input.hasRequests && !input.pushDismissed) return "push";
  return null;
}
