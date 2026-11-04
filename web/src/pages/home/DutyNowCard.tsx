import { IconClock24 } from "@tabler/icons-react";
import { useMemo } from "react";
import { relativeTime } from "@/domain/format";
import { distanceMeters, formatDistance } from "@/domain/geo";
import type { Building, DutyType } from "@/domain/types";
import { CardError, CardSkeleton } from "./CardError";
import { DutyNowRow } from "./DutyNowRows";
import { useGrantedPosition } from "./homeHooks";
import { callablePhone, dutyTourState, latestUpdate, pickOnDuty, type DutyPick } from "./homeText";
import type { DutyState } from "./types";
import classes from "./DutyNowCard.module.css";

/** A key é a unidade: trocar a farmácia de plantão faz a linha subir de novo; a mesma não repete */
const rowKey = (type: DutyType, pick: DutyPick) => `${type}-${pick.first?.id ?? "vazio"}`;

interface DutyNowCardProps {
  pharmacies: DutyState;
  funerals: DutyState;
  now: Date;
}

/** "De plantão agora": a farmácia (e a funerária) que a pessoa pode chamar já. */
export function DutyNowCard({ pharmacies, funerals, now }: DutyNowCardProps) {
  const hasPharmacyOnDuty = pharmacies.data.some((u) => u.isOnDuty);
  const position = useGrantedPosition(hasPharmacyOnDuty);

  const pharmacy = useMemo(() => {
    const distanceOf = position ? (u: Building) => distanceMeters(position, u) : undefined;
    return pickOnDuty(pharmacies.data, distanceOf);
  }, [pharmacies.data, position]);
  const funeral = useMemo(() => pickOnDuty(funerals.data), [funerals.data]);

  const loading = pharmacies.loading || funerals.loading;
  const failed = pharmacies.error !== null || funerals.error !== null;
  const shown = [pharmacy.first, funeral.first].filter((u): u is Building => u !== null);
  const updated = latestUpdate(shown.length > 0 ? shown : [...pharmacies.data, ...funerals.data]);
  const distance = position && pharmacy.first ? formatDistance(distanceMeters(position, pharmacy.first)) : null;
  // Variante do passo "De plantão agora" do passeio
  const tourState = dutyTourState({ loading, failed, callable: shown.some((u) => callablePhone(u.phones) !== null) });

  const retry = () => {
    if (pharmacies.error) pharmacies.retry();
    if (funerals.error) funerals.retry();
  };

  return (
    <section className={classes.card} aria-labelledby="home-plantao" data-tour="plantao" data-tour-state={tourState}>
      <div className={classes.head}>
        {/* Recebe o foco quando a pessoa sai do passeio no passo do plantão */}
        <h2 id="home-plantao" className={classes.title} tabIndex={-1}>
          <IconClock24 size={22} stroke={1.8} aria-hidden className={classes.titleIcon} />
          De plantão agora
        </h2>
        {updated && !loading && !failed && <p className={classes.updated}>atualizado {relativeTime(updated, now)}</p>}
      </div>

      <div className={classes.body}>
        {failed ? (
          <CardError onRetry={retry} />
        ) : loading ? (
          <div className={classes.skeletons}>
            <CardSkeleton height={72} />
            <CardSkeleton height={64} />
          </div>
        ) : (
          <ul className={classes.rows} data-tour-part="linhas">
            <DutyNowRow key={rowKey("PHARMACY", pharmacy)} type="PHARMACY" pick={pharmacy} distance={distance} index={0} />
            {/* Funerária some se nenhuma estiver cadastrada */}
            {funerals.data.length > 0 && <DutyNowRow key={rowKey("FUNERAL", funeral)} type="FUNERAL" pick={funeral} distance={null} index={1} />}
          </ul>
        )}
      </div>
    </section>
  );
}
