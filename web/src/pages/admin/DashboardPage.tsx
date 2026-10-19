import { Alert, Group, Paper, SimpleGrid, Skeleton, Stack, Text, Title } from "@mantine/core";
import { useMemo, type CSSProperties } from "react";
import { useNavigate } from "react-router";
import { MapView, STATUS_HEX } from "@/components/map";
import { PageHeader } from "@/components/PageHeader";
import { RequestCard } from "@/components/RequestCard";
import { ADMIN_LIST_LIMIT } from "@/data/requests";
import { categoryOf } from "@/domain/catalog";
import { isOpenStatus, REQUEST_STATUSES, STATUS_META } from "@/domain/status";
import { countBy, formatDays, summarize } from "@/domain/stats";
import type { CitizenRequest, Issue } from "@/domain/types";
import { useAdminRequests } from "@/hooks/useAdminData";
import classes from "./admin.module.css";
import { DutyNowCard } from "./DutyNowCard";

function Kpi({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: string }) {
  return (
    <Paper withBorder p="md" className={classes.kpi} data-tone={tone}>
      <span className="eyebrow">{label}</span>
      <Text ff="heading" fz={38} fw={600} lh={1.1} mt={6}>
        {value}
      </Text>
      {hint && (
        <Text size="xs" c="dimmed" mt={4}>
          {hint}
        </Text>
      )}
    </Paper>
  );
}

interface Segment {
  status: (typeof REQUEST_STATUSES)[number];
  start: number;
  size: number;
}

/** Fatias da barra empilhada como frações de 0 a 1 (início e tamanho). */
function toSegments(byStatus: Record<string, number>, total: number): Segment[] {
  return REQUEST_STATUSES.filter((s) => byStatus[s] > 0).reduce<Segment[]>((acc, status) => {
    const last = acc[acc.length - 1];
    const start = last ? last.start + last.size : 0;
    return [...acc, { status, start, size: byStatus[status] / total }];
  }, []);
}

function StatusBar({ items }: { items: CitizenRequest[] }) {
  const stats = summarize(items);
  if (stats.total === 0) return <Text c="dimmed" size="sm">Sem solicitações ainda.</Text>;
  const segments = toSegments(stats.byStatus, stats.total);
  const description = segments.map((s) => `${STATUS_META[s.status].label}: ${stats.byStatus[s.status]}`).join(", ");
  return (
    <Stack gap="xs">
      {/* Fatias por transform (scaleX), nunca por largura: a mudança anima sem refazer o layout */}
      <div className={classes.stackBar} role="img" aria-label={`Distribuição por situação. ${description}.`}>
        {segments.map((s) => (
          <span
            key={s.status}
            className={classes.segment}
            style={{ "--start": s.start, "--size": s.size, background: STATUS_HEX[s.status] } as CSSProperties}
          />
        ))}
        {segments.slice(1).map((s) => (
          <span key={`gap-${s.status}`} className={classes.segmentGap} style={{ "--start": s.start } as CSSProperties} />
        ))}
      </div>
      <Group gap="md">
        {segments.map(({ status }) => (
          <Group key={status} gap={6}>
            <span className={classes.dot} style={{ background: STATUS_HEX[status] }} />
            <Text size="xs">
              {STATUS_META[status].label} <b>{stats.byStatus[status]}</b>
            </Text>
          </Group>
        ))}
      </Group>
    </Stack>
  );
}

function Ranking({ rows }: { rows: Array<{ key: string; count: number }> }) {
  const max = rows[0]?.count ?? 1;
  return (
    <Stack gap={8}>
      {rows.slice(0, 6).map((r) => (
        <div key={r.key}>
          <Group justify="space-between" gap="xs">
            <Text size="sm">{r.key}</Text>
            <Text size="sm" fw={700}>
              {r.count}
            </Text>
          </Group>
          <div className={classes.rankTrack}>
            <span style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
      {rows.length === 0 && <Text size="sm" c="dimmed">Nada em aberto.</Text>}
    </Stack>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const issues = useAdminRequests("issues");
  const ombudsman = useAdminRequests("ombudsman");
  const issueList = (issues.data ?? []) as Issue[];
  const ombudsmanList = ombudsman.data ?? [];

  const issueStats = useMemo(() => summarize(issueList), [issueList]);
  const ombudsmanStats = useMemo(() => summarize(ombudsmanList), [ombudsmanList]);
  const openIssues = issueList.filter((i) => isOpenStatus(i.status));
  const oldestWaiting = [...issueList, ...ombudsmanList]
    .filter((r) => r.status === "RECEIVED")
    .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0))
    .slice(0, 5);

  if (issues.loading || ombudsman.loading) {
    return (
      <SimpleGrid cols={{ base: 2, md: 4 }}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} h={120} radius="lg" />
        ))}
      </SimpleGrid>
    );
  }

  const truncated = issueList.length >= ADMIN_LIST_LIMIT || ombudsmanList.length >= ADMIN_LIST_LIMIT;

  return (
    <Stack gap="lg">
      <PageHeader eyebrow="Painel" title="Visão geral" description="Atualizado em tempo real." />
      {(issues.error || ombudsman.error) && <Alert color="barro">{issues.error ?? ombudsman.error}</Alert>}
      {truncated && (
        <Alert color="gray" variant="light">
          Indicadores calculados sobre as {ADMIN_LIST_LIMIT} solicitações mais recentes de cada tipo.
        </Alert>
      )}

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
        <Kpi label="Zeladoria em aberto" value={issueStats.open} hint={`${issueStats.staleReceived} aguardando há mais de 7 dias`} tone="mata" />
        <Kpi label="Ouvidoria em aberto" value={ombudsmanStats.open} hint={`${ombudsmanStats.staleReceived} aguardando há mais de 7 dias`} tone="ipe" />
        <Kpi label="Concluídas em 30 dias" value={issueStats.resolvedLast30 + ombudsmanStats.resolvedLast30} />
        <Kpi label="Tempo médio (zeladoria)" value={formatDays(issueStats.avgDaysToResolve)} hint="da abertura à conclusão" />
      </SimpleGrid>

      <DutyNowCard />

      <div className={classes.dashGrid}>
        <Paper withBorder p="md" className={`${classes.panelCard} ${classes.mapCard}`}>
          <Group justify="space-between" mb="sm">
            <Title order={2} fz="lg">
              Zeladoria em aberto no mapa
            </Title>
            <Text size="sm" c="dimmed">
              {openIssues.length} pontos
            </Text>
          </Group>
          <MapView
            height={360}
            showBoundary
            markers={openIssues.map((i) => ({
              id: i.id,
              lat: i.lat,
              lng: i.lng,
              color: STATUS_HEX[i.status],
              label: `${i.protocol} · ${i.title}`,
              onClick: () => navigate(`/painel/zeladoria?id=${i.id}`),
            }))}
          />
        </Paper>
        {/* Coluna da direita: situação e os dois rankings, do tamanho do mapa */}
        <Stack gap="md">
          <Paper withBorder p="md" className={classes.panelCard}>
            <Title order={2} fz="lg" mb="sm">
              Zeladoria por situação
            </Title>
            <StatusBar items={issueList} />
          </Paper>
          <Paper withBorder p="md" className={classes.panelCard}>
            <Title order={2} fz="lg" mb="sm">
              Em aberto por tipo
            </Title>
            <Ranking rows={countBy(openIssues, (i) => categoryOf(i.category).label)} />
          </Paper>
          <Paper withBorder p="md" className={classes.panelCard}>
            <Title order={2} fz="lg" mb="sm">
              Bairros com mais pedidos abertos
            </Title>
            <Ranking rows={countBy(openIssues, (i) => i.address.neighborhood || "Sem bairro")} />
          </Paper>
        </Stack>
      </div>

      <Paper withBorder p="md" className={classes.panelCard}>
        <Title order={2} fz="lg" mb="sm">
          Esperando há mais tempo
        </Title>
        {oldestWaiting.length === 0 ? (
          <Text size="sm" c="dimmed">
            Nenhuma solicitação aguardando análise.
          </Text>
        ) : (
          <ul className={classes.waitGrid}>
            {oldestWaiting.map((r) => (
              <li key={`${r.kind}-${r.id}`} className={classes.cardCell}>
                <RequestCard request={r} onClick={() => navigate(`/painel/${r.kind === "issues" ? "zeladoria" : "ouvidoria"}?id=${r.id}`)} />
              </li>
            ))}
          </ul>
        )}
      </Paper>
    </Stack>
  );
}
