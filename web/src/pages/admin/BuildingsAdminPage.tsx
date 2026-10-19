import { Alert, Button, Drawer, Group, SegmentedControl, Stack } from "@mantine/core";
import { IconBuildingCommunity, IconPlus } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { isDutyType } from "@/domain/duty";
import type { Building, BuildingType } from "@/domain/types";
import { useBuildings, useStaffList } from "@/hooks/useAdminData";
import classes from "./admin.module.css";
import { BuildingForm } from "./BuildingForm";
import { BuildingsTable } from "./BuildingsTable";
import { useFitsWidth } from "./useFitsWidth";

/** Largura das três abas lado a lado (325 px no texto padrão); abaixo disso, uma sob a outra. */
const TABS_MIN_REM = 20.5;

const TABS: Array<{ value: BuildingType; label: string }> = [
  { value: "PUBLIC", label: "Unidades públicas" },
  { value: "PHARMACY", label: "Farmácias" },
  { value: "FUNERAL", label: "Funerárias" },
];

const NEW_LABEL: Record<BuildingType, string> = {
  PUBLIC: "Nova unidade",
  PHARMACY: "Nova farmácia",
  FUNERAL: "Nova funerária",
};

const EMPTY: Record<BuildingType, { title: string; description: string }> = {
  PUBLIC: { title: "Nenhuma unidade pública", description: "Cadastre as unidades para liberar a ouvidoria e os comunicados." },
  PHARMACY: { title: "Nenhuma farmácia", description: "Cadastre as farmácias e escolha quem atualiza o plantão de cada uma." },
  FUNERAL: { title: "Nenhuma funerária", description: "Cadastre as funerárias e escolha quem atualiza o plantão de cada uma." },
};

function isBuildingType(value: string): value is BuildingType {
  return value === "PUBLIC" || isDutyType(value);
}

export default function BuildingsAdminPage() {
  const [type, setType] = useState<BuildingType>("PUBLIC");
  const { data, loading, error } = useBuildings(type);
  const staff = useStaffList();
  const [editing, setEditing] = useState<Building | "new" | null>(null);
  const dutyManagers = useMemo(() => (staff.data ?? []).filter((s) => s.active && s.roles.includes("DUTY_MANAGER")), [staff.data]);
  const buildings = data ?? [];
  const { ref: barRef, fits: tabsInline } = useFitsWidth<HTMLDivElement>(TABS_MIN_REM);

  return (
    <Stack gap="md">
      <PageHeader
        eyebrow="Cadastros"
        title="Unidades e plantões"
        description="Unidades públicas recebem a ouvidoria e enviam comunicados; farmácias e funerárias aparecem nas listas de plantão."
      />
      <Group ref={barRef} justify="space-between" gap="sm">
        <SegmentedControl
          value={type}
          onChange={(v) => isBuildingType(v) && setType(v)}
          data={TABS}
          aria-label="Tipo de cadastro"
          orientation={tabsInline ? "horizontal" : "vertical"}
          fullWidth={!tabsInline}
          w={tabsInline ? undefined : "100%"}
        />
        <Button leftSection={<IconPlus size={18} aria-hidden />} onClick={() => setEditing("new")}>
          {NEW_LABEL[type]}
        </Button>
      </Group>
      {(error || staff.error) && <Alert color="barro">{error ?? staff.error}</Alert>}
      {loading ? (
        <div className={`${classes.tableSkeleton} shimmer`} aria-busy="true" aria-label="Carregando cadastros" />
      ) : buildings.length === 0 ? (
        <EmptyState icon={<IconBuildingCommunity size={28} />} title={EMPTY[type].title} description={EMPTY[type].description} />
      ) : (
        <BuildingsTable type={type} buildings={buildings} dutyManagers={dutyManagers} onEdit={setEditing} />
      )}

      <Drawer
        opened={editing !== null}
        onClose={() => setEditing(null)}
        position="right"
        size="lg"
        title={editing === "new" ? NEW_LABEL[type] : "Editar cadastro"}
      >
        {editing !== null && (
          <BuildingForm
            key={editing === "new" ? "new" : editing.id}
            building={editing === "new" ? null : editing}
            dutyManagers={dutyManagers}
            defaultType={type}
            onDone={() => setEditing(null)}
          />
        )}
      </Drawer>
    </Stack>
  );
}
