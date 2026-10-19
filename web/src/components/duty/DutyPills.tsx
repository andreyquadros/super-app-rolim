import { IconCircleCheck, IconCircleMinus, IconClock24, IconPhone } from "@tabler/icons-react";
import { DUTY_COPY } from "@/domain/duty";
import type { DutyType } from "@/domain/types";
import classes from "./DutyPills.module.css";

interface DutyPillsProps {
  type: DutyType;
  isOpen: boolean;
  isOnDuty: boolean;
  /** Distância já formatada ("1,2 km"), à direita */
  distance?: string | null;
}

/** Situação da unidade sempre com ícone e texto (nunca só cor). */
export function DutyPills({ type, isOpen, isOnDuty, distance }: DutyPillsProps) {
  const copy = DUTY_COPY[type];
  return (
    <div className={classes.row}>
      {isOnDuty && (
        <span className={classes.pill} data-tone="duty">
          {type === "PHARMACY" && isOpen ? <span className="live-dot" aria-hidden /> : <IconClock24 size={16} aria-hidden />}
          {isOpen ? "De plantão" : "De plantão · só por telefone"}
          {!isOpen && <IconPhone size={14} aria-hidden />}
        </span>
      )}
      {(isOpen || !isOnDuty) && (
        <span className={classes.pill} data-tone={isOpen ? "open" : "closed"}>
          {isOpen ? <IconCircleCheck size={16} aria-hidden /> : <IconCircleMinus size={16} aria-hidden />}
          {isOpen ? copy.openLabel : copy.closedLabel}
        </span>
      )}
      {distance && <span className={classes.distance}>{distance}</span>}
    </div>
  );
}
