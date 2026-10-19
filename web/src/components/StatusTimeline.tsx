import { IconCheck, IconX } from "@tabler/icons-react";
import { formatDateTime } from "@/domain/format";
import { HAPPY_PATH, isOpenStatus, STATUS_META, type RequestStatus } from "@/domain/status";
import type { CitizenRequest, HistoryEntry } from "@/domain/types";
import classes from "./StatusTimeline.module.css";

interface Step {
  status: RequestStatus;
  done: boolean;
  at: Date | null;
  response: string | null;
  by: string | null;
}

/** Monta as etapas a partir do histórico (exportado para testes). */
export function buildSteps(request: CitizenRequest, history: HistoryEntry[], showAuthor: boolean): Step[] {
  const byStatus = new Map(history.map((h) => [h.to, h]));
  const step = (status: RequestStatus): Step => {
    const entry = byStatus.get(status);
    return {
      status,
      done: status === "RECEIVED" || entry !== undefined,
      at: status === "RECEIVED" ? request.createdAt : (entry?.at ?? null),
      response: entry?.officialResponse ?? null,
      by: showAuthor && entry ? entry.byName : null,
    };
  };

  if (request.status === "CANCELED") {
    return [step("RECEIVED"), { status: "CANCELED", done: true, at: request.statusChangedAt, response: null, by: null }];
  }
  if (request.status === "REJECTED") {
    const reached = HAPPY_PATH.filter((s) => s === "RECEIVED" || byStatus.has(s)).map(step);
    return [...reached, step("REJECTED")];
  }
  return HAPPY_PATH.map(step);
}

type StepState = "done" | "current" | "pending" | "rejected" | "canceled";

const STATE_TEXT: Record<StepState, string> = {
  done: "etapa concluída",
  current: "etapa atual",
  pending: "etapa ainda não alcançada",
  rejected: "pedido indeferido",
  canceled: "pedido cancelado",
};

function stateOf(step: Step, isCurrent: boolean): StepState {
  if (step.status === "REJECTED") return "rejected";
  if (step.status === "CANCELED") return "canceled";
  if (!step.done) return "pending";
  return isCurrent ? "current" : "done";
}

interface StatusTimelineProps {
  request: CitizenRequest;
  history: HistoryEntry[];
  showAuthor?: boolean;
  /** Resposta já exibida em destaque na tela (não repetir aqui) */
  hideResponse?: string | null;
}

/** Histórico do atendimento, etapa por etapa (cidadão e painel). */
export function StatusTimeline({ request, history, showAuthor = false, hideResponse = null }: StatusTimelineProps) {
  const steps = buildSteps(request, history, showAuthor);
  const lastDone = steps.reduce((last, s, i) => (s.done ? i : last), 0);
  const open = isOpenStatus(request.status);

  return (
    <ol className={classes.timeline}>
      {steps.map((s, i) => {
        const state = stateOf(s, open && i === lastDone);
        const next = steps[i + 1];
        const response = s.response && s.response !== hideResponse ? s.response : null;
        return (
          <li key={s.status} className={classes.item} data-state={state} data-next-done={next?.done || undefined}>
            <span className={classes.bullet} aria-hidden>
              {state === "rejected" || state === "canceled" ? (
                <IconX size={16} stroke={3} />
              ) : state === "pending" ? null : (
                <IconCheck size={16} stroke={3} />
              )}
            </span>
            <div className={classes.body}>
              <p className={classes.label}>
                {STATUS_META[s.status].label}
                <span className="visually-hidden">, {STATE_TEXT[state]}</span>
              </p>
              <p className={classes.meta}>
                {s.done ? formatDateTime(s.at) : "Aguardando"}
                {s.by ? ` · ${s.by}` : ""}
              </p>
              {response && (
                <div className={classes.response}>
                  <p className={classes.responseLabel}>Resposta da prefeitura</p>
                  <p className={classes.responseText}>{response}</p>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
