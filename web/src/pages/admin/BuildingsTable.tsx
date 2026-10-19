import { Badge, Group, Table } from "@mantine/core";
import { DutyPills } from "@/components/duty/DutyPills";
import { isDutyType, isStale } from "@/domain/duty";
import { formatPhone } from "@/domain/documents";
import { relativeTime } from "@/domain/format";
import type { Building, BuildingType, StaffMember } from "@/domain/types";
import classes from "./admin.module.css";

interface BuildingsTableProps {
  type: BuildingType;
  buildings: Building[];
  dutyManagers: StaffMember[];
  onEdit: (building: Building) => void;
}

/** Nomes dos responsáveis; quem saiu da equipe (ou perdeu o acesso) não conta. */
function Owners({ building, dutyManagers }: { building: Building; dutyManagers: StaffMember[] }) {
  const names = building.ownerIds.map((id) => dutyManagers.find((s) => s.id === id)?.fullName).filter((n): n is string => Boolean(n));
  if (names.length > 0) return <span className={classes.cellText}>{names.join(", ")}</span>;
  return <span className={`${classes.cellText} ${classes.problem}`}>{building.ownerIds.length > 0 ? "Sem responsável ativo" : "Sem responsável"}</span>;
}

function Updated({ building }: { building: Building }) {
  if (!isStale(building.updatedAt)) return <span className={`${classes.cellText} ${classes.muted}`}>{relativeTime(building.updatedAt)}</span>;
  return (
    <span className={classes.cellText}>
      <span className={classes.problem}>Desatualizado</span>
      <br />
      <span className={classes.muted}>{relativeTime(building.updatedAt)}</span>
    </span>
  );
}

function Phones({ building }: { building: Building }) {
  if (building.phones.length === 0) return <span className={`${classes.cellText} ${classes.muted}`}>Sem telefone</span>;
  return <span className={classes.cellText}>{building.phones.map((p) => formatPhone(p.number)).join(", ")}</span>;
}

function Situation({ building }: { building: Building }) {
  if (!building.active) return <Badge color="gray" variant="outline" tt="none">Inativa</Badge>;
  if (isDutyType(building.type)) return <DutyPills type={building.type} isOpen={building.isOpen} isOnDuty={building.isOnDuty} />;
  return <Badge color="mata" tt="none">Ativa</Badge>;
}

export function BuildingsTable({ type, buildings, dutyManagers, onEdit }: BuildingsTableProps) {
  const duty = isDutyType(type);
  return (
    <Table.ScrollContainer minWidth={duty ? 680 : 600} className={classes.tableCard}>
      <Table verticalSpacing="sm" horizontalSpacing="md">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Nome</Table.Th>
            <Table.Th>Endereço</Table.Th>
            <Table.Th>{duty ? "Responsáveis" : "Telefones"}</Table.Th>
            <Table.Th>Situação</Table.Th>
            {duty && <Table.Th>Atualizado</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {buildings.map((b) => (
            <Table.Tr key={b.id} className={classes.row} onClick={() => onEdit(b)}>
              <Table.Td>
                {/* O botão leva o foco e o leitor de tela; a linha inteira continua clicável no mouse */}
                <button
                  type="button"
                  className={classes.nameButton}
                  aria-label={`Editar ${b.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(b);
                  }}
                >
                  {b.name}
                </button>
              </Table.Td>
              <Table.Td>
                <span className={classes.cellText}>{b.address}</span>
              </Table.Td>
              <Table.Td>{duty ? <Owners building={b} dutyManagers={dutyManagers} /> : <Phones building={b} />}</Table.Td>
              <Table.Td>
                <Group gap={4}>
                  <Situation building={b} />
                </Group>
              </Table.Td>
              {duty && (
                <Table.Td>
                  <Updated building={b} />
                </Table.Td>
              )}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
