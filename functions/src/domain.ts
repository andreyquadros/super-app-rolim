// Espelha web/src/domain/status.ts — mantenha os dois em sincronia.

export type RequestKind = "issues" | "ombudsman";

export type RequestStatus =
  | "RECEIVED"
  | "UNDER_ANALYSIS"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "REJECTED"
  | "CANCELED";

export const KIND_LABEL: Record<RequestKind, string> = {
  issues: "Zeladoria",
  ombudsman: "Ouvidoria",
};

/** Caminho da tela de detalhe no app. */
export const KIND_PATH: Record<RequestKind, string> = {
  issues: "zeladoria",
  ombudsman: "ouvidoria",
};

export const STATUS_LABEL: Record<RequestStatus, string> = {
  RECEIVED: "Recebida",
  UNDER_ANALYSIS: "Em análise",
  IN_PROGRESS: "Em andamento",
  RESOLVED: "Concluída",
  REJECTED: "Indeferida",
  CANCELED: "Cancelada",
};

export interface StatusMessage {
  intro: string;
  closing: string;
}

const KEEP_UPDATED = "Você receberá novas atualizações pelo aplicativo e por e-mail.";

/** Textos herdados do AnswerFactory do backend antigo, com o caso "indeferida". */
export function statusMessage(status: RequestStatus, citizenName: string): StatusMessage {
  const name = firstName(citizenName);
  switch (status) {
    case "RECEIVED":
      return { intro: `Olá, ${name}! Recebemos sua solicitação.`, closing: KEEP_UPDATED };
    case "UNDER_ANALYSIS":
      return { intro: `Olá, ${name}! Sua solicitação está sendo analisada pela nossa equipe técnica.`, closing: KEEP_UPDATED };
    case "IN_PROGRESS":
      return { intro: `Olá, ${name}! As ações necessárias para atender sua solicitação foram iniciadas.`, closing: KEEP_UPDATED };
    case "RESOLVED":
      return {
        intro: `Olá, ${name}! Sua solicitação foi concluída e as medidas cabíveis foram adotadas.`,
        closing: "Agradecemos sua participação e confiança em nossos serviços.",
      };
    case "REJECTED":
      return {
        intro: `Olá, ${name}. Após análise, sua solicitação não pôde ser atendida.`,
        closing: "Se precisar, você pode abrir uma nova solicitação pelo aplicativo.",
      };
    case "CANCELED":
      return { intro: `Olá, ${name}. Sua solicitação foi cancelada.`, closing: "" };
  }
}

export function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  return trimmed.split(/\s+/)[0] || "cidadão(ã)";
}

export function requestLink(appUrl: string, kind: RequestKind, id: string): string {
  return `${appUrl.replace(/\/+$/, "")}/protocolos/${KIND_PATH[kind]}/${encodeURIComponent(id)}`;
}
