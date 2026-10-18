import { Alert, Paper, SimpleGrid, Skeleton, Stack, Switch, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconPill } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { setPharmacyState, watchOwnedPharmacies } from "@/data/buildings";
import { relativeTime } from "@/domain/format";
import type { Building } from "@/domain/types";
import { useWatch } from "@/hooks/useWatch";
import { errorMessage } from "@/lib/errors";
import classes from "./admin.module.css";

function PharmacySwitches({ pharmacy }: { pharmacy: Building }) {
  const [busy, setBusy] = useState(false);
  const update = async (state: { isOpen: boolean; isOnDuty: boolean }) => {
    setBusy(true);
    try {
      await setPharmacyState(pharmacy.id, state);
    } catch (e: unknown) {
      notifications.show({ message: errorMessage(e), color: "barro" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper withBorder p="lg" className={classes.switchCard} data-on-duty={pharmacy.isOnDuty || undefined}>
      <Text fw={700} fz="lg">
        {pharmacy.name}
      </Text>
      <Text size="sm" c="dimmed">
        {pharmacy.address}
      </Text>
      <Stack gap="md" mt="lg">
        <Switch
          size="lg"
          label="Aberta agora"
          checked={pharmacy.isOpen}
          disabled={busy}
          onChange={(e) => update({ isOpen: e.currentTarget.checked, isOnDuty: pharmacy.isOnDuty })}
        />
        <Switch
          size="lg"
          color="barro"
          label="De plantão"
          description="Aparece em destaque para toda a cidade"
          checked={pharmacy.isOnDuty}
          disabled={busy}
          onChange={(e) => update({ isOpen: e.currentTarget.checked ? true : pharmacy.isOpen, isOnDuty: e.currentTarget.checked })}
        />
      </Stack>
      <Text size="xs" c="dimmed" mt="md">
        Atualizado {relativeTime(pharmacy.updatedAt)}
      </Text>
    </Paper>
  );
}

export default function MyPharmaciesPage() {
  const { user } = useAuth();
  const watcher = useMemo(() => (user ? watchOwnedPharmacies(user.uid) : null), [user]);
  const { data, loading, error } = useWatch(watcher);

  return (
    <Stack gap="md">
      <PageHeader eyebrow="Farmácia" title="Minhas farmácias" description="Mantenha a situação em dia: a população consulta em tempo real." />
      {error && <Alert color="barro">{error}</Alert>}
      {loading ? (
        <Skeleton h={220} radius="lg" />
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon={<IconPill size={28} />} title="Nenhuma farmácia vinculada" description="Peça à prefeitura para incluir você como responsável." />
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          {(data ?? []).map((p) => (
            <PharmacySwitches key={p.id} pharmacy={p} />
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}
