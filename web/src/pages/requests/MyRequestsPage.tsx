import { Alert, Button, SegmentedControl, Skeleton, Stack } from "@mantine/core";
import { IconListCheck, IconPlus } from "@tabler/icons-react";
import { useSearchParams } from "react-router";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { RequestCard } from "@/components/RequestCard";
import { isOpenStatus } from "@/domain/status";
import { useMyRequests } from "@/hooks/useCitizenData";
import { useOpenNewRequest } from "@/layouts/requestSheetContext";

type Filter = "open" | "all" | "issues" | "ombudsman";

export default function MyRequestsPage() {
  const openNewRequest = useOpenNewRequest();
  const [params, setParams] = useSearchParams();
  const filter = (params.get("filtro") as Filter | null) ?? "open";
  const { data, loading, error } = useMyRequests();

  const items = (data ?? []).filter((r) => {
    if (filter === "open") return isOpenStatus(r.status);
    if (filter === "issues" || filter === "ombudsman") return r.kind === filter;
    return true;
  });

  return (
    <Stack gap="md">
      <PageHeader title="Meus protocolos" description="Acompanhe suas solicitações em tempo real." />
      <SegmentedControl
        fullWidth
        value={filter}
        onChange={(v) => setParams({ filtro: v }, { replace: true })}
        data={[
          { value: "open", label: "Em aberto" },
          { value: "issues", label: "Zeladoria" },
          { value: "ombudsman", label: "Ouvidoria" },
          { value: "all", label: "Todos" },
        ]}
      />
      {error && <Alert color="barro">{error}</Alert>}
      {loading ? (
        <Stack gap="sm">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} h={104} radius="lg" />
          ))}
        </Stack>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<IconListCheck size={28} />}
          title={filter === "open" ? "Nada em aberto" : "Nenhuma solicitação"}
          description="Quando você registrar algo, o protocolo aparece aqui com cada etapa do atendimento."
          action={
            <Button leftSection={<IconPlus size={16} />} onClick={openNewRequest}>
              Nova solicitação
            </Button>
          }
        />
      ) : (
        <Stack gap="sm">
          {items.map((r) => (
            <RequestCard key={`${r.kind}-${r.id}`} request={r} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
