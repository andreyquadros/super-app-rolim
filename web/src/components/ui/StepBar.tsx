import { HAPPY_PATH, STATUS_META, type RequestStatus } from "@/domain/status";
import classes from "./StepBar.module.css";

interface StepBarProps {
  status: RequestStatus;
  /** "lg" no detalhe do pedido; "sm" nos cartões */
  size?: "sm" | "lg";
}

/** "Etapa 3 de 4 · Em andamento" (posição do pedido no atendimento). */
export function stepLabel(status: RequestStatus): string {
  if (status === "REJECTED") return "Indeferida · veja a justificativa";
  if (status === "CANCELED") return "Cancelada por você";
  const step = HAPPY_PATH.indexOf(status) + 1;
  return `Etapa ${step} de ${HAPPY_PATH.length} · ${STATUS_META[status].label}`;
}

/** Barra de 4 etapas: Recebida → Em análise → Em andamento → Concluída. */
export function StepBar({ status, size = "sm" }: StepBarProps) {
  const reached = HAPPY_PATH.indexOf(status);
  const tone = status === "REJECTED" ? "rejected" : status === "CANCELED" ? "canceled" : status === "RESOLVED" ? "done" : "active";
  return (
    <div className={classes.wrap} data-size={size} data-tone={tone}>
      <div className={classes.bar} aria-hidden>
        {HAPPY_PATH.map((step, i) => (
          <span
            key={step}
            className={classes.segment}
            data-filled={i <= reached || (tone === "rejected" && i === 0) || undefined}
            data-current={(i === reached && tone === "active") || undefined}
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
      <span className={classes.label}>{stepLabel(status)}</span>
    </div>
  );
}
