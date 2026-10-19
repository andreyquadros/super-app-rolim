import { IconFlower, IconPill } from "@tabler/icons-react";
import { AppLink } from "@/components/AppLink";
import { DUTY_META } from "@/domain/duty";
import type { DutyType } from "@/domain/types";
import classes from "./duty.module.css";

const PARTS = [
  { type: "PHARMACY", icon: IconPill },
  { type: "FUNERAL", icon: IconFlower },
] as const;

/**
 * Só na troca Farmácias <-> Funerárias o seletor tem transição própria (o
 * indicador desliza ao vivo); vindo de outra aba, ele esmaece com a tela.
 * Roda depois do setNavKind do AppLink, que limpa o escopo a cada navegação.
 */
function scopeDutySwitch() {
  document.documentElement.dataset.navScope = "duty";
}

/** Farmácias | Funerárias, preso logo abaixo da barra superior. */
export function DutyTypeSwitch({ type }: { type: DutyType }) {
  return (
    <div className={classes.switchWrap}>
      <nav className={`${classes.switch} duty-switch-vt`} aria-label="Tipo de plantão" data-active={type}>
        <span className={classes.indicator} aria-hidden />
        {PARTS.map((part) => (
          <AppLink
            key={part.type}
            to={DUTY_META[part.type].path}
            replace
            nav="tab"
            onClick={scopeDutySwitch}
            className={classes.switchPart}
            aria-current={part.type === type ? "page" : undefined}
          >
            <part.icon className={classes.switchIcon} size={22} stroke={1.8} aria-hidden />
            {DUTY_META[part.type].plural}
          </AppLink>
        ))}
      </nav>
    </div>
  );
}
