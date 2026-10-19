import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { MapView } from "@/components/map";
import { BottomSheet } from "@/components/sheet/BottomSheet";
import { DUTY_COPY, DUTY_META } from "@/domain/duty";
import type { LatLng } from "@/domain/geo";
import type { Building, DutyType } from "@/domain/types";
import { markerColor } from "./dutyView";
import classes from "./duty.module.css";

// Abaixo disso o mapa não serve: a folha passa a rolar
const MIN_MAP_PX = 200;

function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
  }
  return null;
}

/**
 * Altura do mapa para a folha caber inteira, sem rolar: título, legenda e
 * "Fechar mapa" à vista em qualquer tela e tamanho de texto. Mede quando a
 * folha abre (antes disso o <dialog> não tem tamanho).
 */
function useFitMapHeight() {
  const frameRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;
    const observer = new ResizeObserver(() => {
      const scroller = scrollParent(frame);
      if (!scroller || frame.offsetHeight === 0) return;
      // scrollHeight/clientHeight são inteiros: 1 px a mais de folga contra o arredondamento
      const overflow = scroller.scrollHeight - scroller.clientHeight;
      const fit = overflow > 0 ? frame.getBoundingClientRect().height - overflow - 1 : frame.getBoundingClientRect().height;
      observer.disconnect();
      // Antes da pintura: a folha já aparece no tamanho final
      flushSync(() => setHeight(Math.max(MIN_MAP_PX, Math.floor(fit))));
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  return { frameRef, height };
}

interface DutyMapProps {
  type: DutyType;
  units: readonly Building[];
  center: LatLng | null;
}

function DutyMap({ type, units, center }: DutyMapProps) {
  const { frameRef, height } = useFitMapHeight();
  return (
    <>
      <div ref={frameRef} className={classes.mapFrame} style={height === null ? undefined : { height }}>
        {height !== null && (
          <MapView
            height={height}
            center={center ?? undefined}
            markers={units.map((u) => ({ id: u.id, lat: u.lat, lng: u.lng, color: markerColor(u), label: u.name }))}
          />
        )}
      </div>
      <p className={classes.mapLegend}>
        <span data-tone="duty">De plantão</span>
        <span data-tone="open">{DUTY_COPY[type].openLabel}</span>
        <span data-tone="closed">{DUTY_COPY[type].closedLabel}</span>
      </p>
    </>
  );
}

interface DutyMapSheetProps extends DutyMapProps {
  open: boolean;
  onClose: () => void;
}

/** "Mapa" do plantão: Leaflet sob demanda numa folha, com botão de fechar à vista. */
export function DutyMapSheet({ open, onClose, type, units, center }: DutyMapSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title={`Mapa: ${DUTY_META[type].plural.toLowerCase()}`} closeLabel="Fechar mapa">
      <DutyMap type={type} units={units} center={center} />
    </BottomSheet>
  );
}
