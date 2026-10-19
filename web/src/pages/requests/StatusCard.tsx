import { useId } from "react";
import { StepBar } from "@/components/ui/StepBar";
import { relativeTime } from "@/domain/format";
import type { CitizenRequest } from "@/domain/types";
import { CopyButton } from "./CopyButton";
import { STATUS_HELP } from "./requestModel";
import classes from "./detail.module.css";

function toneOf(request: CitizenRequest): string {
  if (request.status === "REJECTED") return "rejected";
  if (request.status === "CANCELED") return "canceled";
  return request.status === "RESOLVED" ? "done" : "active";
}

/** Cartão de situação: etapas, explicação e o número do protocolo. */
export function StatusCard({ request }: { request: CitizenRequest }) {
  const headingId = useId();
  const changedAt = request.statusChangedAt ?? request.updatedAt;
  return (
    <section className={classes.statusCard} data-tone={toneOf(request)} aria-labelledby={headingId}>
      <h2 id={headingId} className={classes.cardLabel}>
        Situação
      </h2>
      <StepBar status={request.status} size="lg" />
      <p className={classes.statusHelp}>{STATUS_HELP[request.status]}</p>
      {changedAt && request.status !== "RECEIVED" && <p className={classes.statusWhen}>Atualizado {relativeTime(changedAt)}</p>}

      <div className={classes.protocolRow}>
        <p className={classes.protocolBlock}>
          <span className={classes.protocolLabel}>Número do protocolo</span>
          <span className={classes.protocol}>{request.protocol}</span>
        </p>
        <CopyButton value={request.protocol} what="protocolo" />
      </div>
    </section>
  );
}
