import { Button, Paper } from "@mantine/core";
import { IconArrowRight, IconFlower, IconPill } from "@tabler/icons-react";
import { useMemo } from "react";
import { Link } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { DUTY_META, DUTY_TYPES, isStale } from "@/domain/duty";
import { formatPhone } from "@/domain/documents";
import { relativeTime } from "@/domain/format";
import type { Building, DutyType } from "@/domain/types";
import { useBuildings } from "@/hooks/useAdminData";
import classes from "./admin.module.css";

const TYPE_ICON: Record<DutyType, typeof IconPill> = { PHARMACY: IconPill, FUNERAL: IconFlower };

const EMPTY: Record<DutyType, string> = {
  PHARMACY: "Nenhuma farmácia informou plantão agora.",
  FUNERAL: "Nenhuma funerária informou plantão agora.",
};

function DutyNowRow({ unit }: { unit: Building }) {
  const stale = isStale(unit.updatedAt);
  const phone = unit.phones.find((p) => p.type !== "WHATSAPP") ?? unit.phones[0];
  return (
    <li className={classes.dutyNowItem}>
      <span className={classes.dutyNowName}>{unit.name}</span>
      {phone && <span className={classes.dutyNowPhone}>{formatPhone(phone.number)}</span>}
      <span className={classes.dutyNowUpdated} data-stale={stale || undefined}>
        {stale ? `Desatualizado · última vez ${relativeTime(unit.updatedAt)}` : `Atualizado ${relativeTime(unit.updatedAt)}`}
      </span>
    </li>
  );
}

function DutyNowColumn({ type, units }: { type: DutyType; units: Building[] }) {
  const Icon = TYPE_ICON[type];
  return (
    <div className={classes.dutyNowColumn} data-type={type}>
      <h3 className={classes.dutyNowType}>
        <Icon size={20} stroke={1.8} aria-hidden />
        {DUTY_META[type].plural}
      </h3>
      {units.length === 0 ? (
        <p className={classes.dutyNowEmpty}>{EMPTY[type]}</p>
      ) : (
        <ul className={classes.dutyNowList}>
          {units.map((u) => (
            <DutyNowRow key={u.id} unit={u} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Quem a população vê em destaque agora (farmácias e funerárias de plantão). */
export function DutyNowCard() {
  const { isRoot } = useAuth();
  const { data, loading, error } = useBuildings();
  const byType = useMemo(() => {
    const onDuty = (data ?? []).filter((b) => b.active && b.isOnDuty);
    return DUTY_TYPES.map((type) => ({ type, units: onDuty.filter((b) => b.type === type) }));
  }, [data]);

  return (
    <Paper withBorder p="md" component="section" aria-labelledby="plantao-agora" className={classes.panelCard}>
      <div className={classes.cardHead}>
        <h2 id="plantao-agora" className={classes.cardTitle}>
          <span className={classes.dutyNowDot} aria-hidden />
          Plantão agora
        </h2>
        {isRoot && (
          <Button component={Link} to="/painel/unidades" variant="subtle" rightSection={<IconArrowRight size={16} aria-hidden />}>
            Unidades e plantões
          </Button>
        )}
      </div>
      {error ? (
        <p className={classes.dutyNowEmpty}>Não foi possível carregar os plantões. {error}</p>
      ) : loading ? (
        <div className={`${classes.dutyNowSkeleton} shimmer`} aria-busy="true" aria-label="Carregando plantões" />
      ) : (
        <div className={classes.dutyNowGrid}>
          {byType.map((g) => (
            <DutyNowColumn key={g.type} type={g.type} units={g.units} />
          ))}
        </div>
      )}
    </Paper>
  );
}
