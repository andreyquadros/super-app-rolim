// Regras de exibição de "Meus pedidos" e do detalhe (sem React, testadas).
import { APP_NAME } from "@/config/city";
import { isOpenStatus, type RequestStatus } from "@/domain/status";
import type { CitizenRequest, HistoryEntry, Issue } from "@/domain/types";

export type RequestFilter = "aberto" | "todos" | "zeladoria" | "ouvidoria";

export const DEFAULT_FILTER: RequestFilter = "aberto";

export const FILTER_OPTIONS: readonly { value: RequestFilter; label: string }[] = [
  { value: "aberto", label: "Em aberto" },
  { value: "todos", label: "Todos" },
  { value: "zeladoria", label: "Zeladoria" },
  { value: "ouvidoria", label: "Ouvidoria" },
];

// Endereços antigos (?filtro=all) continuam funcionando
const LEGACY_FILTERS: Record<string, RequestFilter> = { open: "aberto", all: "todos", issues: "zeladoria", ombudsman: "ouvidoria" };

export function parseRequestFilter(raw: string | null): RequestFilter {
  if (!raw) return DEFAULT_FILTER;
  const known = FILTER_OPTIONS.find((f) => f.value === raw);
  return known?.value ?? LEGACY_FILTERS[raw] ?? DEFAULT_FILTER;
}

export function filterRequests(list: readonly CitizenRequest[], filter: RequestFilter): CitizenRequest[] {
  switch (filter) {
    case "aberto":
      return list.filter((r) => isOpenStatus(r.status));
    case "zeladoria":
      return list.filter((r) => r.kind === "issues");
    case "ouvidoria":
      return list.filter((r) => r.kind === "ombudsman");
    default:
      return [...list];
  }
}

export interface RequestGroups {
  /** "Em andamento": ainda pode mudar de situação */
  open: CitizenRequest[];
  /** "Concluídos e encerrados" */
  closed: CitizenRequest[];
}

export function groupRequests(list: readonly CitizenRequest[]): RequestGroups {
  return {
    open: list.filter((r) => isOpenStatus(r.status)),
    closed: list.filter((r) => !isOpenStatus(r.status)),
  };
}

/** Texto do estado vazio de cada filtro (com pedidos em outros filtros). */
export const EMPTY_COPY: Record<RequestFilter, { title: string; description: string }> = {
  aberto: {
    title: "Nenhum pedido em andamento",
    description: "Os pedidos concluídos ou encerrados continuam guardados em Todos.",
  },
  todos: {
    title: "Você ainda não fez nenhum pedido",
    description: "Quando você avisar sobre um problema na rua ou falar com a ouvidoria, o pedido aparece aqui e você acompanha cada etapa.",
  },
  zeladoria: {
    title: "Nenhum pedido de zeladoria",
    description: "Problemas na rua que você avisar, como buraco ou poste apagado, aparecem aqui.",
  },
  ouvidoria: {
    title: "Nenhum pedido de ouvidoria",
    description: "Elogios, sugestões e reclamações que você enviar aparecem aqui.",
  },
};

/** Explicação simples da situação, no cartão do detalhe. */
export const STATUS_HELP: Record<RequestStatus, string> = {
  RECEIVED: "A prefeitura recebeu seu pedido. Em breve a equipe vai analisar.",
  UNDER_ANALYSIS: "A equipe da prefeitura está analisando o seu pedido.",
  IN_PROGRESS: "O atendimento já começou. Quando terminar, a situação muda aqui.",
  RESOLVED: "Pronto! A prefeitura concluiu o atendimento.",
  REJECTED: "A prefeitura não pôde atender este pedido. Veja a justificativa.",
  CANCELED: "Você cancelou este pedido.",
};

export interface OfficialResponse {
  text: string;
  at: Date | null;
}

/** Resposta mais recente da prefeitura (do histórico; senão, a guardada no pedido). */
export function latestResponse(request: CitizenRequest, history: readonly HistoryEntry[]): OfficialResponse | null {
  const answered = history.filter((h) => h.officialResponse);
  const last = answered.reduce<HistoryEntry | null>(
    (latest, h) => (!latest || (h.at?.getTime() ?? 0) >= (latest.at?.getTime() ?? 0) ? h : latest),
    null,
  );
  if (last?.officialResponse) return { text: last.officialResponse, at: last.at };
  return request.lastResponse ? { text: request.lastResponse, at: null } : null;
}

/** O cidadão só pode cancelar enquanto o pedido está "Recebido" (firestore.rules). */
export function canCancel(request: CitizenRequest): boolean {
  return request.status === "RECEIVED";
}

/** "Rua da Escola, 300 · Centro" */
export function issueAddressLine(request: Issue): string {
  const { streetType, streetName, number, neighborhood } = request.address;
  const street = [`${streetType} ${streetName}`.trim(), number].filter(Boolean).join(", ");
  return [street, neighborhood].filter(Boolean).join(" · ");
}

export function shareText(title: string, protocol: string): string {
  return `Meu pedido no ${APP_NAME}: ${title}. Protocolo ${protocol}.`;
}

/** O local do problema foi marcado no mapa? */
export function hasLocation(request: Issue): boolean {
  return Number.isFinite(request.lat) && Number.isFinite(request.lng) && (request.lat !== 0 || request.lng !== 0);
}
