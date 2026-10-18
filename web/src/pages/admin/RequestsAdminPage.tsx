import { Alert, Group, SegmentedControl, Select, Skeleton, Stack, Table, Text, TextInput } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconInbox, IconSearch } from "@tabler/icons-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { RequestCard, requestSubtitle } from "@/components/RequestCard";
import { StatusBadge } from "@/components/StatusBadge";
import { categoryOf, ISSUE_CATEGORIES, OMBUDSMAN_TYPES, ombudsmanTypeOf } from "@/domain/catalog";
import { formatDate, relativeTime } from "@/domain/format";
import { isOpenStatus, REQUEST_STATUSES, STATUS_META } from "@/domain/status";
import type { CitizenRequest, RequestKind } from "@/domain/types";
import { useAdminRequests } from "@/hooks/useAdminData";
import classes from "./admin.module.css";
import { ReviewDrawer } from "./ReviewDrawer";

const COPY: Record<RequestKind, { title: string; eyebrow: string }> = {
  issues: { title: "Zeladoria", eyebrow: "Atendimento" },
  ombudsman: { title: "Ouvidoria", eyebrow: "Atendimento" },
};

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function matches(request: CitizenRequest, term: string): boolean {
  if (!term) return true;
  const haystack = [request.protocol, request.title, request.citizenName, requestSubtitle(request)].join(" ");
  return normalize(haystack).includes(normalize(term));
}

function typeLabel(request: CitizenRequest): string {
  return request.kind === "issues" ? categoryOf(request.category).label : ombudsmanTypeOf(request.type).label;
}

export default function RequestsAdminPage({ kind }: { kind: RequestKind }) {
  const { buildingScope } = useAuth();
  const { data, loading, error } = useAdminRequests(kind);
  const [params, setParams] = useSearchParams();
  const wide = useMediaQuery("(min-width: 62em)");

  const scope = params.get("situacao") ?? "open";
  const type = params.get("tipo");
  const term = params.get("q") ?? "";
  const selectedId = params.get("id");

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const items = useMemo(
    () =>
      (data ?? []).filter((r) => {
        if (scope === "open" && !isOpenStatus(r.status)) return false;
        if (scope !== "open" && scope !== "all" && r.status !== scope) return false;
        if (type && (r.kind === "issues" ? r.category : r.type) !== type) return false;
        return matches(r, term);
      }),
    [data, scope, type, term],
  );
  const selected = (data ?? []).find((r) => r.id === selectedId) ?? null;
  const typeOptions = (kind === "issues" ? ISSUE_CATEGORIES : OMBUDSMAN_TYPES).map((t) => ({ value: t.value, label: t.label }));

  return (
    <Stack gap="md">
      <PageHeader eyebrow={COPY[kind].eyebrow} title={COPY[kind].title} description={`${items.length} de ${data?.length ?? 0} solicitações`} />
      {kind === "ombudsman" && buildingScope !== null && buildingScope.length === 0 && (
        <Alert color="ipe">Nenhuma unidade foi atribuída ao seu acesso. Peça ao administrador para vincular as unidades que você atende.</Alert>
      )}
      <Group gap="sm" align="flex-end" wrap="wrap">
        <SegmentedControl
          value={["open", "all"].includes(scope) ? scope : "custom"}
          onChange={(v) => update("situacao", v === "custom" ? "RECEIVED" : v)}
          data={[
            { value: "open", label: "Em aberto" },
            { value: "all", label: "Todas" },
            { value: "custom", label: "Por situação" },
          ]}
        />
        {!["open", "all"].includes(scope) && (
          <Select
            aria-label="Situação"
            w={180}
            value={scope}
            onChange={(v) => update("situacao", v)}
            data={REQUEST_STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label }))}
            allowDeselect={false}
          />
        )}
        <Select placeholder="Todos os tipos" w={220} clearable value={type} onChange={(v) => update("tipo", v)} data={typeOptions} />
        <TextInput
          placeholder="Protocolo, título, nome ou bairro"
          leftSection={<IconSearch size={16} />}
          value={term}
          onChange={(e) => update("q", e.currentTarget.value)}
          style={{ flex: 1, minWidth: 220 }}
        />
      </Group>
      {error && <Alert color="barro">{error}</Alert>}

      {loading ? (
        <Skeleton h={320} radius="lg" />
      ) : items.length === 0 ? (
        <EmptyState icon={<IconInbox size={28} />} title="Nada por aqui" description="Ajuste os filtros para ver outras solicitações." />
      ) : wide ? (
        <Table.ScrollContainer minWidth={760}>
          <Table verticalSpacing="sm" highlightOnHover={false} bg="var(--app-surface)" style={{ borderRadius: 12 }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Protocolo</Table.Th>
                <Table.Th>Solicitação</Table.Th>
                <Table.Th>{kind === "issues" ? "Bairro" : "Unidade"}</Table.Th>
                <Table.Th>Aberta</Table.Th>
                <Table.Th>Situação</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((r) => (
                <Table.Tr
                  key={r.id}
                  className={classes.row}
                  onClick={() => update("id", r.id)}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && update("id", r.id)}
                >
                  <Table.Td>
                    <Text size="sm" className="protocol">
                      {r.protocol}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={600} lineClamp={1}>
                      {r.title}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {typeLabel(r)} · {r.citizenName}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{r.kind === "issues" ? r.address.neighborhood : r.buildingName}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" title={formatDate(r.createdAt)}>
                      {relativeTime(r.createdAt)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <StatusBadge status={r.status} />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      ) : (
        <Stack gap="sm">
          {items.map((r) => (
            <RequestCard key={r.id} request={r} onClick={() => update("id", r.id)} />
          ))}
        </Stack>
      )}

      <ReviewDrawer request={selected} onClose={() => update("id", null)} />
    </Stack>
  );
}
