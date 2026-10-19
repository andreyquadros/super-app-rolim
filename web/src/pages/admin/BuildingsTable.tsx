import { Badge, Group, Table } from "@mantine/core";
import { DutyPills } from "@/components/duty/DutyPills";
import { BADGE_INK } from "@/components/StatusBadge";
import { isDutyType, isStale } from "@/domain/duty";
import { formatPhone } from "@/domain/documents";
import { relativeTime } from "@/domain/format";
import type { Building, BuildingType, StaffMember } from "@/domain/types";
import classes from "./admin.module.css";
import { useFitsWidth } from "./useFitsWidth";

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
  return (
    <Badge color="mata" tt="none" c={BADGE_INK.mata}>
      Ativa
    </Badge>
  );
}

/** Largura que a tabela pede no texto padrão (600 px; 720 px com responsáveis e plantão). */
const TABLE_MIN_REM = { PUBLIC: 37.5, DUTY: 45 } as const;

function NameButton({ building, onEdit, className }: { building: Building; onEdit: (b: Building) => void; className: string }) {
  return (
    <button
      type="button"
      className={className}
      aria-label={`Editar ${building.name}`}
      onClick={(e) => {
        e.stopPropagation();
        onEdit(building);
      }}
    >
      {building.name}
    </button>
  );
}

function TableView({ type, buildings, dutyManagers, onEdit }: BuildingsTableProps) {
  const duty = isDutyType(type);
  return (
    <div className={`${classes.tableCard} ${classes.tableScroll}`}>
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
                <NameButton building={b} onEdit={onEdit} className={classes.nameButton} />
              </Table.Td>
              <Table.Td>
                <span className={classes.cellText}>{b.address}</span>
              </Table.Td>
              <Table.Td>{duty ? <Owners building={b} dutyManagers={dutyManagers} /> : <Phones building={b} />}</Table.Td>
              {/* Cada selo numa linha só ("Atendendo agora" não parte ao meio) */}
              <Table.Td className={classes.nowrap}>
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
    </div>
  );
}

/** Celular e tablet: um cartão por unidade, com a situação à vista (sem rolagem lateral). */
function CardsView({ type, buildings, dutyManagers, onEdit }: BuildingsTableProps) {
  const duty = isDutyType(type);
  return (
    <ul className={classes.cardGrid}>
      {buildings.map((b) => (
        <li key={b.id} className={classes.itemCard}>
          <NameButton building={b} onEdit={onEdit} className={classes.itemLink} />
          {b.address && <p className={classes.itemMeta}>{b.address}</p>}
          <div className={classes.itemBadges}>
            <Situation building={b} />
          </div>
          <dl className={classes.itemFacts}>
            <dt>{duty ? "Responsáveis" : "Telefones"}</dt>
            <dd>{duty ? <Owners building={b} dutyManagers={dutyManagers} /> : <Phones building={b} />}</dd>
            {duty && (
              <>
                <dt>Atualizado</dt>
                <dd>
                  <Updated building={b} />
                </dd>
              </>
            )}
          </dl>
        </li>
      ))}
    </ul>
  );
}

/** Tabela quando a área comporta; cartões no celular, no tablet e com texto grande. */
export function BuildingsTable(props: BuildingsTableProps) {
  const { ref, fits } = useFitsWidth<HTMLDivElement>(isDutyType(props.type) ? TABLE_MIN_REM.DUTY : TABLE_MIN_REM.PUBLIC);
  return <div ref={ref}>{fits ? <TableView {...props} /> : <CardsView {...props} />}</div>;
}
