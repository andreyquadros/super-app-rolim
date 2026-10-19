import { IconCurrentLocation, IconFlower, IconMap, IconPill, IconRefresh } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { EmptyState } from "@/components/EmptyState";
import { MapView } from "@/components/map";
import { BottomSheet } from "@/components/sheet/BottomSheet";
import { DUTY_COPY, DUTY_META, dutyCounts, dutyTypeFromSlug, filterDuty, isDutyFilter, sortDuty, type DutyFilter } from "@/domain/duty";
import { relativeTime } from "@/domain/format";
import { distanceMeters, formatDistance } from "@/domain/geo";
import type { Building, DutyType } from "@/domain/types";
import { useDutyUnits } from "@/hooks/useCitizenData";
import { useGeolocation } from "@/hooks/useGeolocation";
import { rememberDutyType } from "@/lib/dutyMemory";
import NotFoundPage from "@/pages/StatusPages";
import { DutyCard, DutyCardSkeleton } from "./DutyCard";
import { DutyTypeSwitch } from "./DutyTypeSwitch";
import { FuneralHelp } from "./FuneralHelp";
import { LocationPrompt, locationAlreadyGranted } from "./LocationPrompt";
import classes from "./duty.module.css";

const MARKER = { duty: "#ffbb36", open: "#14874c", closed: "#868e96" } as const;

function latestUpdate(list: readonly Building[]): Date | null {
  return list.reduce<Date | null>((max, u) => (u.updatedAt && (!max || u.updatedAt > max) ? u.updatedAt : max), null);
}

function emptyTitle(type: DutyType, filter: DutyFilter): string {
  if (filter === "plantao") return DUTY_COPY[type].empty;
  const noun = DUTY_META[type].singular.toLowerCase();
  if (filter === "abertas") return type === "FUNERAL" ? `Nenhuma ${noun} atendendo agora` : `Nenhuma ${noun} aberta agora`;
  return `Ainda não há ${DUTY_META[type].plural.toLowerCase()} cadastradas`;
}

function DutyList({ type }: { type: DutyType }) {
  const { data, loading, error, retry } = useDutyUnits(type);
  const geo = useGeolocation();
  const [params, setParams] = useSearchParams();
  const [askLocation, setAskLocation] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const rawFilter = params.get("filtro");
  const filter: DutyFilter = isDutyFilter(rawFilter) ? rawFilter : "plantao";
  const counts = useMemo(() => dutyCounts(data), [data]);
  const position = geo.position;

  const list = useMemo(() => {
    const distanceOf = position ? (u: Building) => distanceMeters(position, u) : undefined;
    return sortDuty(filterDuty(data, filter), distanceOf);
  }, [data, filter, position]);

  const updated = latestUpdate(data);
  const setFilter = (value: DutyFilter) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === "plantao") next.delete("filtro");
      else next.set("filtro", value);
      return next;
    }, { replace: true });

  const nearMe = async () => {
    if (position) return;
    if (await locationAlreadyGranted()) geo.locate();
    else setAskLocation(true);
  };

  const FILTERS: { value: DutyFilter; label: string }[] = [
    { value: "plantao", label: `De plantão (${counts.plantao})` },
    { value: "abertas", label: `${type === "FUNERAL" ? "Atendendo agora" : "Abertas agora"} (${counts.abertas})` },
    { value: "todas", label: `Todas (${counts.todas})` },
  ];

  return (
    <>
      <div className={classes.chips} role="group" aria-label="Filtrar a lista">
        {FILTERS.map((f) => (
          <button key={f.value} type="button" className={classes.chip} aria-pressed={filter === f.value} onClick={() => setFilter(f.value)} data-press>
            {f.label}
          </button>
        ))}
        <button type="button" className={classes.chip} data-action aria-pressed={position !== null} onClick={nearMe} disabled={geo.loading} data-press>
          <IconCurrentLocation size={18} aria-hidden />
          {geo.loading ? "Localizando…" : "Perto de mim"}
        </button>
        <button type="button" className={classes.chip} data-action aria-pressed={mapOpen} onClick={() => setMapOpen(true)} disabled={data.length === 0} data-press>
          <IconMap size={18} aria-hidden />
          Mapa
        </button>
      </div>

      {geo.error && <p className={classes.notice}>{geo.error}</p>}
      {updated && !loading && <p className={classes.updatedAll}>Atualizado {relativeTime(updated)}</p>}

      {error ? (
        <div className={classes.error} role="alert">
          <p>Não foi possível carregar a lista.</p>
          <button type="button" className={classes.sheetSecondary} onClick={retry} data-press>
            <IconRefresh size={18} aria-hidden /> Tentar de novo
          </button>
        </div>
      ) : loading ? (
        <ul className={classes.list} aria-busy>
          {[0, 1, 2].map((i) => (
            <DutyCardSkeleton key={i} />
          ))}
        </ul>
      ) : list.length === 0 ? (
        <EmptyState
          icon={type === "FUNERAL" ? <IconFlower size={28} /> : <IconPill size={28} />}
          title={emptyTitle(type, filter)}
          action={
            filter !== "todas" && counts.todas > 0 ? (
              <button type="button" className={classes.sheetPrimary} onClick={() => setFilter("todas")} data-press>
                Ver todas ({counts.todas})
              </button>
            ) : undefined
          }
        />
      ) : (
        <ul className={classes.list}>
          {list.map((unit, i) => (
            <DutyCard
              key={unit.id}
              unit={unit}
              type={type}
              index={i}
              distance={position ? formatDistance(distanceMeters(position, unit)) : null}
            />
          ))}
        </ul>
      )}

      <p className={classes.footnote}>Informações atualizadas pelas próprias empresas. Ligue antes de ir.</p>

      <LocationPrompt
        open={askLocation}
        onClose={() => setAskLocation(false)}
        onAccept={() => {
          setAskLocation(false);
          geo.locate();
        }}
      />
      <BottomSheet open={mapOpen} onClose={() => setMapOpen(false)} title={`Mapa: ${DUTY_META[type].plural.toLowerCase()}`}>
        <MapView
          height={Math.round(window.innerHeight * 0.62)}
          center={position ?? undefined}
          markers={list.map((u) => ({
            id: u.id,
            lat: u.lat,
            lng: u.lng,
            color: u.isOnDuty ? MARKER.duty : u.isOpen ? MARKER.open : MARKER.closed,
            label: u.name,
          }))}
        />
        <p className={classes.mapLegend}>
          <span data-tone="duty">De plantão</span>
          <span data-tone="open">{DUTY_COPY[type].openLabel}</span>
          <span data-tone="closed">{DUTY_COPY[type].closedLabel}</span>
        </p>
      </BottomSheet>
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
