import { IconFlower, IconPill, IconRefresh } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { EmptyState } from "@/components/EmptyState";
import { DUTY_COPY, dutyCounts, dutyTypeFromSlug, filterDuty, isDutyFilter, sortDuty, type DutyFilter } from "@/domain/duty";
import { relativeTime } from "@/domain/format";
import { distanceMeters, formatDistance, type LatLng } from "@/domain/geo";
import type { Building, DutyType } from "@/domain/types";
import { useDutyUnits } from "@/hooks/useCitizenData";
import { useGeolocation } from "@/hooks/useGeolocation";
import { rememberDutyType } from "@/lib/dutyMemory";
import { locationAlreadyGranted } from "@/lib/geoPermission";
import NotFoundPage from "@/pages/StatusPages";
import { DutyCard, DutyCardSkeleton } from "./DutyCard";
import { DutyMapSheet } from "./DutyMapSheet";
import { DutyToolbar } from "./DutyToolbar";
import { DutyTypeSwitch } from "./DutyTypeSwitch";
import { emptyTitle, filterOptions, latestUpdate } from "./dutyView";
import { FuneralHelp } from "./FuneralHelp";
import { LocationPrompt } from "./LocationPrompt";
import classes from "./duty.module.css";

function useDutyFilter(): [DutyFilter, (value: DutyFilter) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get("filtro");
  const filter: DutyFilter = isDutyFilter(raw) ? raw : "plantao";
  const setFilter = (value: DutyFilter) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === "plantao") next.delete("filtro");
        else next.set("filtro", value);
        return next;
      },
      { replace: true },
    );
  return [filter, setFilter];
}

interface DutyResultsProps {
  type: DutyType;
  filter: DutyFilter;
  list: readonly Building[];
  total: number;
  loading: boolean;
  error: string | null;
  position: LatLng | null;
  onRetry: () => void;
  onShowAll: () => void;
}

/** Erro, carregando, vazio ou a lista. Erro vem antes: nunca um "nenhuma de plantão" falso. */
function DutyResults({ type, filter, list, total, loading, error, position, onRetry, onShowAll }: DutyResultsProps) {
  if (error) {
    return (
      <div className={classes.error} role="alert">
        <p>Não foi possível carregar a lista.</p>
        <button type="button" className={classes.sheetSecondary} onClick={onRetry} data-press>
          <IconRefresh size={18} aria-hidden /> Tentar de novo
        </button>
      </div>
    );
  }
  if (loading) {
    return (
      <ul className={classes.list} aria-busy>
        {[0, 1, 2].map((i) => (
          <DutyCardSkeleton key={i} />
        ))}
      </ul>
    );
  }
  if (list.length === 0) {
    return (
      <EmptyState
        order={2}
        icon={type === "FUNERAL" ? <IconFlower size={28} /> : <IconPill size={28} />}
        title={emptyTitle(type, filter)}
        action={
          filter !== "todas" && total > 0 ? (
            <button type="button" className={classes.sheetPrimary} onClick={onShowAll} data-press>
              Ver todas ({total})
            </button>
          ) : undefined
        }
      />
    );
  }
  return (
    <ul className={classes.list}>
      {list.map((unit, i) => (
        <DutyCard key={unit.id} unit={unit} type={type} index={i} distance={position ? formatDistance(distanceMeters(position, unit)) : null} />
      ))}
    </ul>
  );
}

function DutyList({ type }: { type: DutyType }) {
  const { data, loading, error, retry } = useDutyUnits(type);
  const geo = useGeolocation();
  const [filter, setFilter] = useDutyFilter();
  const [askLocation, setAskLocation] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const counts = useMemo(() => dutyCounts(data), [data]);
  const position = geo.position;
  const list = useMemo(() => {
    const distanceOf = position ? (u: Building) => distanceMeters(position, u) : undefined;
    return sortDuty(filterDuty(data, filter), distanceOf);
  }, [data, filter, position]);

  // Só há números para mostrar quando a lista de fato chegou
  const settled = !loading && !error;
  const updated = settled ? latestUpdate(data) : null;

  const nearMe = async () => {
    if (position) return;
    if (await locationAlreadyGranted()) geo.locate();
    else setAskLocation(true);
  };

  return (
    <>
      <DutyToolbar
        filters={filterOptions(type, settled ? counts : null)}
        filter={filter}
        onFilter={setFilter}
        located={position !== null}
        locating={geo.loading}
        onNearMe={nearMe}
        mapOpen={mapOpen}
        mapDisabled={!settled || data.length === 0}
        onMap={() => setMapOpen(true)}
      />

      {geo.error && (
        <p className={classes.notice} role="alert">
          {geo.error}
        </p>
      )}
      {updated && <p className={classes.updatedAll}>Atualizado {relativeTime(updated)}</p>}

      <DutyResults
        type={type}
        filter={filter}
        list={list}
        total={counts.todas}
        loading={loading}
        error={error}
        position={position}
        onRetry={retry}
        onShowAll={() => setFilter("todas")}
      />

      <p className={classes.footnote}>Informações atualizadas pelas próprias empresas. Ligue antes de ir.</p>

      <LocationPrompt
        open={askLocation}
        onClose={() => setAskLocation(false)}
        onAccept={() => {
          setAskLocation(false);
          geo.locate();
        }}
      />
      <DutyMapSheet open={mapOpen} onClose={() => setMapOpen(false)} type={type} units={list} center={position} />
    </>
  );
}

/** /plantao/farmacias e /plantao/funerarias (sem login). */
export default function DutyPage() {
  const { tipo } = useParams();
  const type = dutyTypeFromSlug(tipo);

  useEffect(() => {
    if (type) rememberDutyType(type);
  }, [type]);

  if (!type) return <NotFoundPage />;
  return (
    <div className={classes.page} data-type={type}>
      <DutyTypeSwitch type={type} />
      <p className={classes.hint}>{DUTY_COPY[type].hint}</p>
      {type === "FUNERAL" && <FuneralHelp />}
      <DutyList type={type} />
    </div>
  );
}
