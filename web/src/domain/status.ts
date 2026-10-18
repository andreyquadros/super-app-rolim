// Fluxo de atendimento comum à zeladoria e à ouvidoria.
// Espelhado em firestore.rules (validTransition) e functions/src/domain.ts.

export const REQUEST_STATUSES = [
  "RECEIVED",
  "UNDER_ANALYSIS",
  "IN_PROGRESS",
  "RESOLVED",
  "REJECTED",
  "CANCELED",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export interface StatusMeta {
  label: string;
  /** Cor do tema Mantine */
  color: string;
  description: string;
}

export const STATUS_META: Record<RequestStatus, StatusMeta> = {
  RECEIVED: { label: "Recebida", color: "slate", description: "A prefeitura recebeu sua solicitação." },
  UNDER_ANALYSIS: { label: "Em análise", color: "ipe", description: "A equipe técnica está avaliando." },
  IN_PROGRESS: { label: "Em andamento", color: "blue", description: "As ações necessárias foram iniciadas." },
  RESOLVED: { label: "Concluída", color: "mata", description: "Atendimento finalizado." },
  REJECTED: { label: "Indeferida", color: "barro", description: "Não pôde ser atendida. Veja a justificativa." },
  CANCELED: { label: "Cancelada", color: "gray", description: "Cancelada por quem abriu." },
};

const TRANSITIONS: Record<RequestStatus, readonly RequestStatus[]> = {
  RECEIVED: ["UNDER_ANALYSIS", "REJECTED"],
  UNDER_ANALYSIS: ["IN_PROGRESS", "REJECTED"],
  IN_PROGRESS: ["RESOLVED"],
  RESOLVED: [],
  REJECTED: [],
  CANCELED: [],
};

/** Etapas exibidas na linha do tempo do cidadão. */
export const HAPPY_PATH: readonly RequestStatus[] = ["RECEIVED", "UNDER_ANALYSIS", "IN_PROGRESS", "RESOLVED"];

export function nextStatuses(current: RequestStatus): readonly RequestStatus[] {
  return TRANSITIONS[current];
}

export function canTransition(from: RequestStatus, to: RequestStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isOpenStatus(status: RequestStatus): boolean {
  return TRANSITIONS[status].length > 0;
}

export function requiresResponse(to: RequestStatus): boolean {
  return to === "REJECTED";
}

export function isRequestStatus(value: unknown): value is RequestStatus {
  return typeof value === "string" && (REQUEST_STATUSES as readonly string[]).includes(value);
}
