import { Alert, Badge, Button, Drawer, Group, SegmentedControl, Skeleton, Stack, Table, Text } from "@mantine/core";
import { IconBuildingCommunity, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import type { Building, BuildingType } from "@/domain/types";
import { useBuildings, useStaffList } from "@/hooks/useAdminData";
import classes from "./admin.module.css";
import { BuildingForm } from "./BuildingForm";

export default function BuildingsAdminPage() {
  const [type, setType] = useState<BuildingType>("PUBLIC");
  const { data, loading, error } = useBuildings(type);
  const staff = useStaffList();
  const [editing, setEditing] = useState<Building | "new" | null>(null);
  const pharmacyManagers = (staff.data ?? []).filter((s) => s.active && s.roles.includes("PHARMACY_MANAGER"));
  const managerName = (id: string) => pharmacyManagers.find((s) => s.id === id)?.fullName ?? "—";

  return (
    <Stack gap="md">
      <PageHeader
        eyebrow="Cadastros"
        title="Unidades e farmácias"
        description="Unidades públicas recebem a ouvidoria e enviam comunicados; farmácias aparecem na lista de plantão."
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
                <Table.Th>{type === "PHARMACY" ? "Responsáveis" : "Telefones"}</Table.Th>
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
                      {type === "PHARMACY" ? b.ownerIds.map(managerName).join(", ") || "—" : b.phones.length || "—"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      {!b.active && <Badge color="gray">Inativa</Badge>}
                      {b.type === "PHARMACY" && b.active && <Badge color={b.isOpen ? "mata" : "gray"}>{b.isOpen ? "Aberta" : "Fechada"}</Badge>}
                      {b.type === "PHARMACY" && b.isOnDuty && <Badge color="barro">Plantão</Badge>}
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
            pharmacyManagers={pharmacyManagers}
            onDone={() => setEditing(null)}
          />
        )}
      </Drawer>
    </Stack>
  );
}
