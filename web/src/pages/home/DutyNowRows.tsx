import { IconChevronRight, IconFlower, IconPhone, IconPill } from "@tabler/icons-react";
import type { CSSProperties } from "react";
import { AppLink } from "@/components/AppLink";
import { DUTY_COPY, DUTY_META } from "@/domain/duty";
import type { DutyType } from "@/domain/types";
import { callablePhone, type DutyPick } from "./homeText";
import classes from "./DutyNowCard.module.css";

const ICONS = { PHARMACY: IconPill, FUNERAL: IconFlower } as const;

/** Sem plantão: para onde levar ("Ver abertas" nas farmácias, "Ver lista" nas funerárias). */
const EMPTY_LINK: Record<DutyType, { label: string; to: string }> = {
  PHARMACY: { label: "Ver abertas", to: `${DUTY_META.PHARMACY.path}?filtro=abertas` },
  FUNERAL: { label: "Ver lista", to: `${DUTY_META.FUNERAL.path}?filtro=todas` },
};

interface DutyNowRowProps {
  type: DutyType;
  pick: DutyPick;
  /** Distância já formatada (só quando a localização já estava liberada) */
  distance: string | null;
  index: number;
}

/**
 * Uma linha por tipo: a farmácia em destaque (ponto vivo, Ligar cheio) e a
 * funerária compacta, em ardósia, sem pulso. Tocar fora do Ligar abre a lista.
 */
export function DutyNowRow({ type, pick, distance, index }: DutyNowRowProps) {
  const RowIcon = ICONS[type];
  const meta = DUTY_META[type];
  const style = { "--i": index } as CSSProperties;
  const { first, others } = pick;

  if (!first) {
    const empty = EMPTY_LINK[type];
    return (
      <li className={`${classes.row} enter-rise`} data-type={type} data-empty style={style}>
        <span className={classes.icon} aria-hidden>
          <RowIcon size={type === "PHARMACY" ? 26 : 22} stroke={1.7} />
        </span>
        <div className={classes.text}>
          <p className={classes.emptyText}>{DUTY_COPY[type].empty}</p>
          <AppLink to={empty.to} nav="tab" className={classes.more}>
            {empty.label}
            <span className="visually-hidden"> {meta.plural.toLowerCase()}</span>
            <IconChevronRight size={18} aria-hidden />
          </AppLink>
        </div>
      </li>
    );
  }

  const tel = callablePhone(first.phones);
  const isPharmacy = type === "PHARMACY";
  return (
    <li className={`${classes.row} enter-rise`} data-type={type} style={style}>
      <span className={classes.icon} aria-hidden>
        <RowIcon size={isPharmacy ? 26 : 22} stroke={1.7} />
      </span>
      <div className={classes.text}>
        <span className={classes.kicker}>
          <span className={isPharmacy ? `live-dot ${classes.dot}` : classes.dot} aria-hidden />
          {meta.singular}
        </span>
        {/* O nome é o link; ele cobre a linha inteira (menos os botões) */}
        <AppLink to={meta.path} nav="tab" className={classes.name}>
          {first.name}
        </AppLink>
        {isPharmacy && (first.address || distance) && (
          <span className={classes.address}>{[first.address, distance].filter(Boolean).join("\u00a0· ")}</span>
        )}
        {others > 0 && (
          <AppLink to={meta.path} nav="tab" className={classes.more}>
            e mais {others}
            <span className="visually-hidden"> {others === 1 ? meta.singular.toLowerCase() : meta.plural.toLowerCase()} de plantão</span>
            <IconChevronRight size={18} aria-hidden />
          </AppLink>
        )}
      </div>
      {tel && (
        <a
          href={tel}
          className={classes.call}
          data-variant={isPharmacy ? "filled" : "outline"}
          aria-label={`Ligar para ${first.name}`}
          data-press
        >
          <IconPhone size={20} aria-hidden />
          Ligar
        </a>
      )}
    </li>
  );
}
