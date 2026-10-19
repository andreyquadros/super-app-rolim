import { Alert, Badge, Button, Drawer, Group, SegmentedControl, Skeleton, Stack, Table, Text } from "@mantine/core";
import { IconBuildingCommunity, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { isDutyType } from "@/domain/duty";
import type { Building, BuildingType } from "@/domain/types";
import { useBuildings, useStaffList } from "@/hooks/useAdminData";
import classes from "./admin.module.css";
import { BuildingForm } from "./BuildingForm";

export default function BuildingsAdminPage() {
  const [type, setType] = useState<BuildingType>("PUBLIC");
  const { data, loading, error } = useBuildings(type);
  const staff = useStaffList();
  const [editing, setEditing] = useState<Building | "new" | null>(null);
  const dutyManagers = (staff.data ?? []).filter((s) => s.active && s.roles.includes("DUTY_MANAGER"));
  const managerName = (id: string) => dutyManagers.find((s) => s.id === id)?.fullName ?? "—";
  const duty = isDutyType(type);

  return (
    <Stack gap="md">
      <PageHeader
        eyebrow="Cadastros"
        title="Unidades e plantões"
        description="Unidades públicas recebem a ouvidoria e enviam comunicados; farmácias e funerárias aparecem nas listas de plantão."
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => setEditing("new")}>
            Nova
          </Button>
        }
      />
      <SegmentedControl
        value={type}
        onChange={(v) => setType(v as BuildingType)}
        data={[
          { value: "PUBLIC", label: "Unidades públicas" },
          { value: "PHARMACY", label: "Farmácias" },
          { value: "FUNERAL", label: "Funerárias" },
        ]}
        style={{ alignSelf: "flex-start" }}
      />
      {error && <Alert color="barro">{error}</Alert>}
      {loading ? (
        <Skeleton h={240} radius="lg" />
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon={<IconBuildingCommunity size={28} />} title="Nenhum cadastro" description="Cadastre as unidades para liberar a ouvidoria e os comunicados." />
      ) : (
        <Table.ScrollContainer minWidth={640}>
          <Table verticalSpacing="sm" bg="var(--app-surface)">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nome</Table.Th>
                <Table.Th>Endereço</Table.Th>
                <Table.Th>{duty ? "Responsáveis" : "Telefones"}</Table.Th>
                <Table.Th>Situação</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(data ?? []).map((b) => (
                <Table.Tr key={b.id} className={classes.row} onClick={() => setEditing(b)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setEditing(b)}>
                  <Table.Td>
                    <Text fw={600} size="sm">
                      {b.name}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" lineClamp={1}>
                      {b.address}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" lineClamp={1}>
                      {duty ? b.ownerIds.map(managerName).join(", ") || "—" : b.phones.length || "—"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      {!b.active && <Badge color="gray">Inativa</Badge>}
                      {duty && b.active && <Badge color={b.isOpen ? "mata" : "gray"}>{b.isOpen ? "Aberta" : "Fechada"}</Badge>}
                      {duty && b.isOnDuty && <Badge color="barro">Plantão</Badge>}
                      {b.type === "PUBLIC" && b.active && <Badge color="mata">Ativa</Badge>}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      <Drawer opened={editing !== null} onClose={() => setEditing(null)} position="right" size="lg" title={editing === "new" ? "Nova unidade" : "Editar unidade"}>
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
