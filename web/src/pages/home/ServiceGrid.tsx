import { IconFlower, IconMessages, IconPill, IconTools, type Icon } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { AppLink } from "@/components/AppLink";
import { DUTY_META } from "@/domain/duty";
import type { NavKind } from "@/lib/navMotion";
import { dutyCountLabel } from "./homeText";
import type { DutyState } from "./types";
import classes from "./ServiceGrid.module.css";

type Tone = "mata" | "ipe" | "slate";

interface ServiceTileProps {
  to: string;
  nav: NavKind;
  tone: Tone;
  icon: Icon;
  title: string;
  line: ReactNode;
  /** Ponto ipê no ícone quando há alguém de plantão (pulsa só nas farmácias) */
  badge?: "live" | "still" | null;
}

function ServiceTile({ to, nav, tone, icon: TileIcon, title, line, badge = null }: ServiceTileProps) {
  return (
    <li className={classes.item}>
      <AppLink to={to} nav={nav} className={classes.tile} data-tone={tone} data-press>
        <span className={classes.body}>
          <span className={classes.icon} aria-hidden>
            <TileIcon size={28} stroke={1.7} />
            {badge && <span className={badge === "live" ? `live-dot ${classes.badge}` : classes.badge} />}
          </span>
          <span className={classes.text}>
            <span className={classes.title}>{title}</span>
            <span className={classes.line}>{line}</span>
          </span>
        </span>
      </AppLink>
    </li>
  );
}

interface DutyLineProps {
  state: DutyState;
  fallback: string;
}

/** "1 de plantão agora", ao vivo; enquanto carrega, um traço com a altura do texto. */
function DutyLine({ state, fallback }: DutyLineProps) {
  if (state.loading) return <span className={`${classes.lineSkeleton} shimmer`} aria-hidden />;
  const onDuty = state.data.filter((u) => u.isOnDuty).length;
  if (onDuty === 0) return fallback;
  return <span className={classes.live}>{dutyCountLabel(onDuty, fallback)}</span>;
}

interface ServiceGridProps {
  pharmacies: DutyState;
  funerals: DutyState;
}

/** Os 4 serviços principais: aparecem na hora (só as contagens chegam depois). */
export function ServiceGrid({ pharmacies, funerals }: ServiceGridProps) {
  const anyPharmacy = pharmacies.data.some((u) => u.isOnDuty);
  const anyFuneral = funerals.data.some((u) => u.isOnDuty);
  return (
    <section className={classes.section} aria-labelledby="home-servicos">
      <h2 id="home-servicos" className={classes.heading}>
        Serviços
      </h2>
      <ul className={classes.grid}>
        <ServiceTile to="/zeladoria/nova" nav="flow" tone="mata" icon={IconTools} title="Problema na rua" line="Zeladoria: buraco, poste, lixo, mato" />
        <ServiceTile to="/ouvidoria/nova" nav="flow" tone="ipe" icon={IconMessages} title="Ouvidoria" line="Elogio, sugestão ou reclamação" />
        <ServiceTile
          to={anyPharmacy || pharmacies.loading ? DUTY_META.PHARMACY.path : `${DUTY_META.PHARMACY.path}?filtro=abertas`}
          nav="tab"
          tone="mata"
          icon={IconPill}
          title="Farmácias"
          line={<DutyLine state={pharmacies} fallback="Ver abertas" />}
          badge={anyPharmacy ? "live" : null}
        />
        <ServiceTile
          to={anyFuneral || funerals.loading ? DUTY_META.FUNERAL.path : `${DUTY_META.FUNERAL.path}?filtro=todas`}
          nav="tab"
          tone="slate"
          icon={IconFlower}
          title="Funerárias"
          line={<DutyLine state={funerals} fallback="Ver lista" />}
          badge={anyFuneral ? "still" : null}
        />
      </ul>
    </section>
  );
}
