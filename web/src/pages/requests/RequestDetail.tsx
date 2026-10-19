import { useId, useMemo } from "react";
import { CATEGORY_ICONS, OMBUDSMAN_ICONS } from "@/components/icons";
import { RequestPhoto } from "@/components/RequestPhoto";
import { StatusTimeline } from "@/components/StatusTimeline";
import { watchHistory } from "@/data/requests";
import { formatDate } from "@/domain/format";
import type { CitizenRequest } from "@/domain/types";
import { useWatch } from "@/hooks/useWatch";
import { CancelRequest } from "./CancelRequest";
import { DetailsList } from "./DetailsList";
import { LocationMap } from "./LocationMap";
import { latestResponse } from "./requestModel";
import { ResponseBubble } from "./ResponseBubble";
import { StatusCard } from "./StatusCard";
import classes from "./detail.module.css";

function Header({ request }: { request: CitizenRequest }) {
  const Icon = request.kind === "issues" ? CATEGORY_ICONS[request.category] : OMBUDSMAN_ICONS[request.type];
  const kindLabel = request.kind === "issues" ? "Problema na rua" : "Ouvidoria";
  return (
    <header className={classes.header}>
      <h1 className={classes.title}>{request.title}</h1>
      <p className={classes.kind}>
        <Icon size={20} stroke={1.8} aria-hidden />
        <span>
          {kindLabel}
          {request.createdAt ? ` · enviado em ${formatDate(request.createdAt)}` : ""}
        </span>
      </p>
    </header>
  );
}

/** Corpo do detalhe: situação, resposta, histórico, dados e cancelamento. */
export function RequestDetail({ request }: { request: CitizenRequest }) {
  const historyWatcher = useMemo(() => watchHistory(request.kind, request.id), [request.kind, request.id]);
  const history = useWatch(historyWatcher);
  const entries = history.data ?? [];
  const response = latestResponse(request, entries);
  const historyId = useId();
  const detailsId = useId();

  return (
    <article className={classes.page}>
      <Header request={request} />
      <StatusCard request={request} />
      {response && <ResponseBubble response={response} />}

      <section className={classes.section} aria-labelledby={historyId}>
        <h2 id={historyId} className={classes.sectionTitle}>
          Histórico
        </h2>
        {history.error && (
          <p className={classes.inlineError} role="alert">
            Não foi possível carregar todas as datas do histórico.
          </p>
        )}
        <div className={classes.panel}>
          <StatusTimeline request={request} history={entries} hideResponse={response?.text} />
        </div>
      </section>

      <section className={classes.section} aria-labelledby={detailsId}>
        <h2 id={detailsId} className={classes.sectionTitle}>
          Detalhes do pedido
        </h2>
        <DetailsList request={request} />
        {request.kind === "issues" && request.photoPath && <RequestPhoto path={request.photoPath} caption="Foto que você enviou" />}
        {request.kind === "issues" && <LocationMap request={request} />}
      </section>

      <CancelRequest request={request} />
    </article>
  );
}
