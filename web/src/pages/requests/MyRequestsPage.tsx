import { Button } from "@mantine/core";
import { IconListCheck, IconPlus, IconRefresh } from "@tabler/icons-react";
import { useId, useMemo, type CSSProperties } from "react";
import { useSearchParams } from "react-router";
import { EmptyState } from "@/components/EmptyState";
import { RequestCard } from "@/components/RequestCard";
import { Chip, ChipRow } from "@/components/ui/Chips";
import type { CitizenRequest } from "@/domain/types";
import { useMyRequests } from "@/hooks/useCitizenData";
import { useOpenNewRequest } from "@/layouts/requestSheetContext";
import { DEFAULT_FILTER, EMPTY_COPY, FILTER_OPTIONS, filterRequests, groupRequests, parseRequestFilter, type RequestFilter } from "./requestModel";
import classes from "./MyRequestsPage.module.css";

const SKELETONS = [0, 1, 2];

function countLabel(n: number): string {
  return n === 1 ? "1 pedido" : `${n} pedidos`;
}

function RequestGroup({ title, items }: { title: string; items: CitizenRequest[] }) {
  const headingId = useId();
  if (items.length === 0) return null;
  return (
    <section className={classes.group} aria-labelledby={headingId}>
      <div className={classes.groupHead}>
        <h2 id={headingId} className={classes.groupTitle}>
          {title}
        </h2>
        <span className={classes.count}>{countLabel(items.length)}</span>
      </div>
      <ul className={classes.list}>
        {items.map((r, i) => (
          // Chave estável: atualizações do Firestore não reanimam a lista
          <li key={`${r.kind}-${r.id}`} className="enter-rise" style={{ "--i": i } as CSSProperties}>
            <RequestCard request={r} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className={classes.error} role="alert">
      <p className={classes.errorTitle}>Não foi possível carregar seus pedidos.</p>
      <p className={classes.errorText}>{message}</p>
      <button type="button" className={classes.retry} onClick={onRetry} data-press>
        <IconRefresh size={20} aria-hidden />
        Tentar de novo
      </button>
    </div>
  );
}

/** /protocolos: pedidos do cidadão (o título "Meus pedidos" vem da casca). */
export default function MyRequestsPage() {
  const openNewRequest = useOpenNewRequest();
  const [params, setParams] = useSearchParams();
  const filter = parseRequestFilter(params.get("filtro"));
  const { data, loading, error, retry } = useMyRequests();

  const all = useMemo(() => data ?? [], [data]);
  const groups = useMemo(() => groupRequests(filterRequests(all, filter)), [all, filter]);
  const isEmptyFilter = groups.open.length + groups.closed.length === 0;
  const hasNothing = !loading && !error && all.length === 0;

  const setFilter = (value: RequestFilter) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === DEFAULT_FILTER) next.delete("filtro");
        else next.set("filtro", value);
        return next;
      },
      { replace: true },
    );

  const solicitar = (
    <Button size="lg" h={56} radius="xl" leftSection={<IconPlus size={22} aria-hidden />} onClick={openNewRequest}>
      Solicitar
    </Button>
  );

  if (hasNothing) {
    return <EmptyState order={2} icon={<IconListCheck size={28} />} title={EMPTY_COPY.todos.title} description={EMPTY_COPY.todos.description} action={solicitar} />;
  }

  return (
    <div className={classes.page}>
      <p className={classes.hint}>Toque num pedido para ver cada etapa e as respostas da prefeitura.</p>
      <ChipRow label="Filtrar pedidos">
        {FILTER_OPTIONS.map((f) => (
          <Chip key={f.value} pressed={filter === f.value} onClick={() => setFilter(f.value)}>
            {f.label}
          </Chip>
        ))}
      </ChipRow>

      {error ? (
        <LoadError message={error} onRetry={retry} />
      ) : loading ? (
        <ul className={classes.list} aria-busy>
          <li className="visually-hidden" role="status">
            Carregando seus pedidos…
          </li>
          {SKELETONS.map((i) => (
            <li key={i} className={`${classes.skeleton} shimmer`} aria-hidden />
          ))}
        </ul>
      ) : isEmptyFilter ? (
        <EmptyState
          order={2}
          icon={<IconListCheck size={28} />}
          title={EMPTY_COPY[filter].title}
          description={EMPTY_COPY[filter].description}
          action={
            <Button size="lg" h={56} radius="xl" variant="light" onClick={() => setFilter("todos")}>
              Ver todos os pedidos
            </Button>
          }
        />
      ) : (
        <>
          <RequestGroup title="Em andamento" items={groups.open} />
          <RequestGroup title="Concluídos e encerrados" items={groups.closed} />
        </>
      )}
    </div>
  );
}
