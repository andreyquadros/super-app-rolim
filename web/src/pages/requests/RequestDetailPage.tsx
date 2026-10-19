import { useMemo } from "react";
import { useParams } from "react-router";
import { watchRequest } from "@/data/requests";
import type { Watcher } from "@/data/watch";
import type { CitizenRequest, RequestKind } from "@/domain/types";
import { useWatch } from "@/hooks/useWatch";
import { useChrome } from "@/layouts/chrome/chromeContext";
import { DetailError, DetailMissing, DetailSkeleton } from "./DetailStates";
import { RequestDetail } from "./RequestDetail";
import { ShareButton } from "./ShareButton";

const KIND_BY_PATH: Record<string, RequestKind> = { zeladoria: "issues", ouvidoria: "ombudsman" };

type Lookup = { status: "found"; request: CitizenRequest } | { status: "missing" };

/**
 * Assina o pedido. As regras negam a leitura de pedidos de outra conta e de
 * pedidos que não existem: os dois casos viram "não encontrado".
 */
function lookupRequest(kind: RequestKind, id: string): Watcher<Lookup> {
  const watch = watchRequest(kind, id);
  return (onData, onError) =>
    watch(
      (request) => onData(request ? { status: "found", request } : { status: "missing" }),
      (error) => (error.code === "permission-denied" ? onData({ status: "missing" }) : onError(error)),
    );
}

/** Barra superior: protocolo como título compacto e "Compartilhar". */
function useDetailChrome(request: CitizenRequest | null) {
  const title = request?.title;
  const protocol = request?.protocol;
  const actions = useMemo(() => (title && protocol ? <ShareButton title={title} protocol={protocol} /> : undefined), [title, protocol]);
  useChrome({ title: protocol, actions });
}

/** /protocolos/:kind/:id (tela empilhada; o Voltar "‹ Pedidos" vem da casca). */
export default function RequestDetailPage() {
  const { kind: kindPath = "", id = "" } = useParams();
  const kind = KIND_BY_PATH[kindPath];
  const watcher = useMemo(() => (kind && id ? lookupRequest(kind, id) : null), [kind, id]);
  const { data, loading, error, retry } = useWatch(watcher);
  const request = data?.status === "found" ? data.request : null;
  useDetailChrome(request);

  if (!watcher) return <DetailMissing />;
  if (error) return <DetailError message={error} onRetry={retry} />;
  if (loading || !data) return <DetailSkeleton />;
  if (!request) return <DetailMissing />;
  return <RequestDetail request={request} />;
}
