import { Alert, Button, CopyButton, Group, Modal, Paper, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconCopy, IconX } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { EmptyState } from "@/components/EmptyState";
import { LoadingScreen } from "@/components/LoadingScreen";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusTimeline } from "@/components/StatusTimeline";
import { cancelRequest, watchHistory, watchRequest } from "@/data/requests";
import { STATUS_META } from "@/domain/status";
import type { RequestKind } from "@/domain/types";
import { useWatch } from "@/hooks/useWatch";
import { errorMessage } from "@/lib/errors";
import { RequestDetails } from "./RequestDetails";

const KIND_BY_PATH: Record<string, RequestKind> = { zeladoria: "issues", ouvidoria: "ombudsman" };

export default function RequestDetailPage() {
  const { kind: kindPath = "", id = "" } = useParams();
  const kind = KIND_BY_PATH[kindPath];
  const requestWatcher = useMemo(() => (kind ? watchRequest(kind, id) : null), [kind, id]);
  const historyWatcher = useMemo(() => (kind ? watchHistory(kind, id) : null), [kind, id]);
  const { data: request, loading, error } = useWatch(requestWatcher);
  const history = useWatch(historyWatcher);
  const [confirmOpen, confirm] = useDisclosure(false);
  const [canceling, setCanceling] = useState(false);

  if (!kind) return <EmptyState icon={<IconX />} title="Endereço inválido" />;
  if (loading) return <LoadingScreen />;
  if (error || !request) {
    return <EmptyState icon={<IconX />} title="Protocolo não encontrado" description={error ?? "Ele pode ter sido aberto por outra conta."} />;
  }

  const doCancel = async () => {
    setCanceling(true);
    try {
      await cancelRequest(kind, request.id);
      notifications.show({ message: "Solicitação cancelada.", color: "gray" });
      confirm.close();
    } catch (e: unknown) {
      notifications.show({ title: "Não foi possível cancelar", message: errorMessage(e), color: "barro" });
    } finally {
      setCanceling(false);
    }
  };

  return (
    <Stack gap="lg">
      <PageHeader eyebrow={kind === "issues" ? "Zeladoria" : "Ouvidoria"} title={request.title} back="/protocolos" />

      <Paper withBorder p="md" style={{ borderLeft: `6px solid var(--mantine-color-${STATUS_META[request.status].color}-6)` }}>
        <Group justify="space-between" wrap="wrap" gap="sm">
          <div>
            <span className="eyebrow">Protocolo</span>
            <Group gap={6}>
              <Text className="protocol" fz="lg">
                {request.protocol}
              </Text>
              <CopyButton value={request.protocol}>
                {({ copied, copy }) => (
                  <Button size="compact-xs" variant="subtle" onClick={copy} aria-label="Copiar protocolo">
                    {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                  </Button>
                )}
              </CopyButton>
            </Group>
          </div>
          <StatusBadge status={request.status} size="lg" />
        </Group>
        <Text size="sm" c="dimmed" mt="xs">
          {STATUS_META[request.status].description}
        </Text>
      </Paper>

      <section aria-labelledby="timeline-title">
        <Title order={2} fz="lg" mb="md" id="timeline-title">
          Andamento
        </Title>
        {history.error && <Alert color="barro">{history.error}</Alert>}
        <StatusTimeline request={request} history={history.data ?? []} />
      </section>

      <section aria-labelledby="details-title">
        <Title order={2} fz="lg" mb="md" id="details-title">
          Detalhes
        </Title>
        <RequestDetails request={request} />
      </section>

      {request.status === "RECEIVED" && (
        <Button variant="subtle" color="barro" onClick={confirm.open} style={{ alignSelf: "flex-start" }}>
          Cancelar solicitação
        </Button>
      )}

      <Modal opened={confirmOpen} onClose={confirm.close} title="Cancelar solicitação?">
        <Text size="sm">Ela ainda não foi analisada. Depois de cancelada, não é possível reabrir — será preciso registrar uma nova.</Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={confirm.close}>
            Manter
          </Button>
          <Button color="barro" onClick={doCancel} loading={canceling}>
            Cancelar solicitação
          </Button>
        </Group>
      </Modal>
    </Stack>
  );
}
