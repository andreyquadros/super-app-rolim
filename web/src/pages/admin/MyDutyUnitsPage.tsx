import { Alert, Button, Stack } from "@mantine/core";
import { IconBuildingStore, IconFlower, IconPill, IconRefresh } from "@tabler/icons-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { DUTY_META } from "@/domain/duty";
import type { Building, DutyType } from "@/domain/types";
import { DutyUnitCard } from "./duty/DutyUnitCard";
import { groupDutyUnits } from "./duty/dutyState";
import classes from "./duty/dutyAdmin.module.css";
import { useDutyUnits } from "./duty/useDutyUnits";

const GROUP_ICON: Record<DutyType, typeof IconPill> = { PHARMACY: IconPill, FUNERAL: IconFlower };

function countLabel(type: DutyType, count: number): string {
  const meta = DUTY_META[type];
  return `${count} ${(count === 1 ? meta.singular : meta.plural).toLowerCase()}`;
}

function DutyGroup({ type, units }: { type: DutyType; units: Building[] }) {
  const Icon = GROUP_ICON[type];
  const headingId = `grupo-${type.toLowerCase()}`;
  return (
    <section className={classes.group} data-type={type} aria-labelledby={headingId}>
      <div className={classes.groupHead}>
        <span className={classes.groupIcon} aria-hidden>
          <Icon size={22} stroke={1.8} />
        </span>
        <h2 id={headingId} className={classes.groupTitle}>
          {DUTY_META[type].plural}
        </h2>
        <span className={classes.groupCount}>{countLabel(type, units.length)}</span>
      </div>
      <ul className={classes.grid}>
        {units.map((unit) => (
          <DutyUnitCard key={unit.id} unit={unit} />
        ))}
      </ul>
    </section>
  );
}

export default function MyDutyUnitsPage() {
  const { data, loading, error, retry, isRoot } = useDutyUnits();
  const groups = groupDutyUnits(data ?? []);

  return (
    <Stack gap="md">
      <PageHeader
        eyebrow="Plantão"
        title="Meus plantões"
        description={
          isRoot
            ? "Como você é administrador, aparecem todas as farmácias e funerárias. O que você marcar vale na hora para toda a cidade."
            : "O que você marcar aqui aparece na hora para toda a cidade no SUPER APP."
        }
      />
      {error && (
        <Alert color="barro" title="Não foi possível carregar seus plantões">
          <Stack gap="sm" align="flex-start">
            {error}
            <Button variant="light" color="barro" leftSection={<IconRefresh size={18} aria-hidden />} onClick={retry}>
              Tentar de novo
            </Button>
          </Stack>
        </Alert>
      )}
      {loading ? (
        <div className={classes.grid} aria-busy="true" aria-label="Carregando seus plantões">
          <div className={`${classes.skeleton} shimmer`} />
          <div className={`${classes.skeleton} shimmer`} />
        </div>
      ) : groups.length === 0 ? (
        !error && (
          <EmptyState
            icon={<IconBuildingStore size={28} />}
            title="Nenhum estabelecimento vinculado"
            description="Peça à prefeitura para incluir você como responsável pela farmácia ou funerária."
          />
        )
      ) : (
        <div className={classes.groups}>
          {groups.map((g) => (
            <DutyGroup key={g.type} type={g.type} units={g.units} />
          ))}
        </div>
      )}
    </Stack>
  );
}
