import { IconBrandWhatsapp, IconPhone, IconRoute } from "@tabler/icons-react";
import type { CSSProperties } from "react";
import { DutyPills } from "@/components/duty/DutyPills";
import { DUTY_COPY, DUTY_META, isStale } from "@/domain/duty";
import { formatPhone, onlyDigits, whatsappLink } from "@/domain/documents";
import { relativeTime } from "@/domain/format";
import { directionsUrl } from "@/domain/geo";
import type { Building, DutyType } from "@/domain/types";
import classes from "./duty.module.css";

interface DutyCardProps {
  unit: Building;
  type: DutyType;
  distance: string | null;
  index: number;
}

export function DutyCard({ unit, type, distance, index }: DutyCardProps) {
  const whatsapp = unit.phones.find((p) => p.type === "WHATSAPP");
  const phone = unit.phones.find((p) => p.type !== "WHATSAPP") ?? whatsapp;
  const hasPlace = Number.isFinite(unit.lat) && Number.isFinite(unit.lng) && (unit.lat !== 0 || unit.lng !== 0);
  const who = DUTY_META[type].singular.toLowerCase();

  // Funerárias ficam paradas (sem entrada escalonada): só a troca de tela anima
  const rises = type === "PHARMACY";

  return (
    <li
      className={rises ? `${classes.card} enter-rise` : classes.card}
      style={rises ? ({ "--i": index } as CSSProperties) : undefined}
      data-duty={unit.isOnDuty || undefined}
    >
      <DutyPills type={type} isOpen={unit.isOpen} isOnDuty={unit.isOnDuty} distance={distance} />
      <h2 className={classes.name}>{unit.name}</h2>
      {unit.address && <p className={classes.address}>{unit.address}</p>}
      {unit.openingHours && <p className={classes.hours}>{unit.openingHours}</p>}
      {phone && <p className={classes.phone}>{formatPhone(phone.number)}</p>}
      <p className={classes.updated}>
        Atualizado {relativeTime(unit.updatedAt)} pela {who}
      </p>
      {isStale(unit.updatedAt) && <p className={classes.stale}>Faz tempo que não atualizam. Confirme por telefone.</p>}

      <div className={classes.cardActions}>
        {phone && (
          <a href={`tel:${onlyDigits(phone.number)}`} className={classes.action} data-variant="filled" aria-label={`Ligar para ${unit.name}`} data-press>
            <IconPhone size={20} aria-hidden />
            <span>Ligar</span>
          </a>
        )}
        {whatsapp && (
          <a
            href={whatsappLink(whatsapp.number, DUTY_COPY[type].whatsappText)}
            target="_blank"
            rel="noreferrer"
            className={classes.action}
            data-variant="light"
            aria-label={`WhatsApp de ${unit.name}`}
            data-press
          >
            <IconBrandWhatsapp size={20} aria-hidden />
            <span>WhatsApp</span>
          </a>
        )}
        {hasPlace && (
          <a href={directionsUrl(unit)} target="_blank" rel="noreferrer" className={classes.action} data-variant="outline" aria-label={`Rota até ${unit.name}`} data-press>
            <IconRoute size={20} aria-hidden />
            <span>Rota</span>
          </a>
        )}
      </div>
    </li>
  );
}

export function DutyCardSkeleton() {
  return <li className={`${classes.skeleton} shimmer`} aria-hidden />;
}
