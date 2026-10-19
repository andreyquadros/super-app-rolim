import { Alert, Badge, Group, Paper, SimpleGrid, Skeleton, Stack, Switch, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBuildingStore } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { setDutyState, watchOwnedDutyUnits } from "@/data/buildings";
import { BUILDING_TYPE_LABEL } from "@/domain/duty";
import { relativeTime } from "@/domain/format";
import type { Building } from "@/domain/types";
import { useWatch } from "@/hooks/useWatch";
import { errorMessage } from "@/lib/errors";
import classes from "./admin.module.css";

function DutySwitches({ unit }: { unit: Building }) {
  const [busy, setBusy] = useState(false);
  const update = async (state: { isOpen: boolean; isOnDuty: boolean }) => {
    setBusy(true);
    try {
      await setDutyState(unit.id, state);
    } catch (e: unknown) {
      notifications.show({ message: errorMessage(e), color: "barro" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper withBorder p="lg" className={classes.switchCard} data-on-duty={unit.isOnDuty || undefined}>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Text fw={700} fz="lg">
          {unit.name}
        </Text>
        <Badge color={unit.type === "FUNERAL" ? "slate" : "mata"}>{BUILDING_TYPE_LABEL[unit.type]}</Badge>
      </Group>
      <Text size="sm" c="dimmed">
        {unit.address}
      </Text>
      <Stack gap="md" mt="lg">
        <Switch
          size="lg"
          label="Aberta agora"
          checked={unit.isOpen}
          disabled={busy}
          onChange={(e) => update({ isOpen: e.currentTarget.checked, isOnDuty: unit.isOnDuty })}
        />
        <Switch
          size="lg"
          color="barro"
          label="De plantão"
          description="Aparece em destaque para toda a cidade"
          checked={unit.isOnDuty}
          disabled={busy}
          onChange={(e) => update({ isOpen: e.currentTarget.checked ? true : unit.isOpen, isOnDuty: e.currentTarget.checked })}
        />
      </Stack>
      <Text size="xs" c="dimmed" mt="md">
        Atualizado {relativeTime(unit.updatedAt)}
      </Text>
    </Paper>
  );
}

export default function MyDutyUnitsPage() {
  const { user } = useAuth();
  const watcher = useMemo(() => (user ? watchOwnedDutyUnits(user.uid) : null), [user]);
  const { data, loading, error } = useWatch(watcher);

  return (
    <Stack gap="md">
      <PageHeader eyebrow="Plantão" title="Meus plantões" description="Mantenha a situação em dia: a população consulta em tempo real." />
      {error && <Alert color="barro">{error}</Alert>}
      {loading ? (
        <Skeleton h={220} radius="lg" />
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon={<IconBuildingStore size={28} />} title="Nenhum estabelecimento vinculado" description="Peça à prefeitura para incluir você como responsável pela farmácia ou funerária." />
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          {(data ?? []).map((p) => (
            <DutySwitches key={p.id} unit={p} />
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}
