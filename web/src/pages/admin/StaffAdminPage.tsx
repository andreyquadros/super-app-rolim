import { Alert, Badge, Button, Group, Skeleton, Stack, Table, Text } from "@mantine/core";
import { IconUserPlus, IconUsersGroup } from "@tabler/icons-react";
import { useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { BADGE_INK } from "@/components/StatusBadge";
import type { StaffMember } from "@/domain/types";
import { useBuildings, useStaffList } from "@/hooks/useAdminData";
import classes from "./admin.module.css";
import { RoleBadge } from "./RoleBadge";
import { StaffEditor } from "./StaffEditor";
import { useFitsWidth } from "./useFitsWidth";

/** Largura que a tabela pede (640 px no texto padrão); abaixo disso, cartões. */
const TABLE_MIN_REM = 40;

interface StaffListProps {
  list: StaffMember[];
  unitsOf: (member: StaffMember) => string;
  onEdit: (member: StaffMember) => void;
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge color={active ? "mata" : "gray"} variant={active ? "light" : "outline"} tt="none" c={active ? BADGE_INK.mata : undefined}>
      {active ? "Ativo" : "Inativo"}
    </Badge>
  );
}

function StaffTable({ list, unitsOf, onEdit }: StaffListProps) {
  return (
    <div className={`${classes.tableCard} ${classes.tableScroll}`}>
      <Table verticalSpacing="sm">
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
            <Table.Tr key={s.id} className={classes.row} onClick={() => onEdit(s)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onEdit(s)}>
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
                <Text size="sm">{unitsOf(s)}</Text>
              </Table.Td>
              <Table.Td>
                <ActiveBadge active={s.active} />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </div>
  );
}

/** Celular e tablet: um cartão por pessoa, com perfis, unidades e situação à vista. */
function StaffCards({ list, unitsOf, onEdit }: StaffListProps) {
  return (
    <ul className={classes.cardGrid}>
      {list.map((s) => (
        <li key={s.id} className={classes.itemCard}>
          <div className={classes.itemHead}>
            <button type="button" className={classes.itemLink} aria-label={`Editar acesso de ${s.fullName}`} onClick={() => onEdit(s)}>
              {s.fullName}
            </button>
            <ActiveBadge active={s.active} />
          </div>
          <p className={classes.itemMeta}>{s.email}</p>
          <div className={classes.itemBadges}>
            <span className="visually-hidden">Perfis:</span>
            {s.roles.map((r) => (
              <RoleBadge key={r} role={r} />
            ))}
          </div>
          <dl className={classes.itemFacts}>
            <dt>Unidades</dt>
            <dd>{unitsOf(s)}</dd>
          </dl>
        </li>
      ))}
    </ul>
  );
}

export default function StaffAdminPage() {
  const { data, loading, error } = useStaffList();
  const buildings = useBuildings();
  const [editing, setEditing] = useState<StaffMember | "new" | null>(null);
  const { ref: listRef, fits: wide } = useFitsWidth<HTMLDivElement>(TABLE_MIN_REM);
  const unitName = (id: string) => buildings.data?.find((b) => b.id === id)?.name ?? "Unidade removida";
  const unitsOf = (s: StaffMember) => (s.roles.includes("ROOT") ? "Todas" : s.buildingIds.map(unitName).join(", ") || "Nenhuma");
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
      <div ref={listRef}>
        {loading ? (
          <Skeleton h={240} radius="lg" />
        ) : list.length === 0 ? (
          <EmptyState icon={<IconUsersGroup size={28} />} title="Nenhuma pessoa na equipe" />
        ) : wide ? (
          <StaffTable list={list} unitsOf={unitsOf} onEdit={setEditing} />
        ) : (
          <StaffCards list={list} unitsOf={unitsOf} onEdit={setEditing} />
        )}
      </div>
      {editing !== null && <StaffEditor editing={editing} onClose={() => setEditing(null)} />}
    </Stack>
  );
}
