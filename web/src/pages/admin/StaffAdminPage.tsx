import { Alert, Badge, Button, Group, Skeleton, Stack, Table, Text } from "@mantine/core";
import { IconUserPlus, IconUsersGroup } from "@tabler/icons-react";
import { useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import type { StaffMember } from "@/domain/types";
import { useBuildings, useStaffList } from "@/hooks/useAdminData";
import classes from "./admin.module.css";
import { RoleBadge } from "./RoleBadge";
import { StaffEditor } from "./StaffEditor";

export default function StaffAdminPage() {
  const { data, loading, error } = useStaffList();
  const buildings = useBuildings();
  const [editing, setEditing] = useState<StaffMember | "new" | null>(null);
  const unitName = (id: string) => buildings.data?.find((b) => b.id === id)?.name ?? "Unidade removida";
  const list = [...(data ?? [])].sort((a, b) => Number(b.active) - Number(a.active) || a.fullName.localeCompare(b.fullName, "pt-BR"));

  return (
    <Stack gap="md">
      <PageHeader
        eyebrow="Acessos"
        title="Equipe"
        description="Quem atende pela prefeitura. O login é a mesma conta do app do cidadão."
        actions={
          <Button leftSection={<IconUserPlus size={16} />} onClick={() => setEditing("new")}>
            Adicionar
          </Button>
        }
      />
      {error && <Alert color="barro">{error}</Alert>}
      {loading ? (
        <Skeleton h={240} radius="lg" />
      ) : list.length === 0 ? (
        <EmptyState icon={<IconUsersGroup size={28} />} title="Nenhuma pessoa na equipe" />
      ) : (
        <Table.ScrollContainer minWidth={640}>
          <Table verticalSpacing="sm" bg="var(--app-surface)">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nome</Table.Th>
                <Table.Th>Perfis</Table.Th>
                <Table.Th>Unidades</Table.Th>
                <Table.Th>Situação</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {list.map((s) => (
                <Table.Tr key={s.id} className={classes.row} onClick={() => setEditing(s)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setEditing(s)}>
                  <Table.Td>
                    <Text fw={600} size="sm">
                      {s.fullName}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {s.email}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      {s.roles.map((r) => (
                        <RoleBadge key={r} role={r} />
                      ))}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" lineClamp={2}>
                      {s.roles.includes("ROOT") ? "Todas" : s.buildingIds.map(unitName).join(", ") || "—"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={s.active ? "mata" : "gray"} variant={s.active ? "light" : "outline"}>
                      {s.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
      {editing !== null && <StaffEditor editing={editing} onClose={() => setEditing(null)} />}
    </Stack>
  );
}
