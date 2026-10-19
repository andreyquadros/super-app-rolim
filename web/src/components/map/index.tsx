import { lazy, Suspense } from "react";
import type { RequestStatus } from "@/domain/status";
import type { MapPickerProps, MapViewProps } from "./LeafletMaps";

export type { MapMarker } from "./LeafletMaps";

const LazyPicker = lazy(() => import("./LeafletMaps").then((m) => ({ default: m.MapPicker })));
const LazyView = lazy(() => import("./LeafletMaps").then((m) => ({ default: m.MapView })));

export function MapPicker(props: MapPickerProps) {
  return (
    <Suspense fallback={<div className="shimmer" style={{ height: props.height ?? 320 }} aria-hidden />}>
      <LazyPicker {...props} />
    </Suspense>
  );
}

export function MapView(props: MapViewProps) {
  return (
    <Suspense fallback={<div className="shimmer" style={{ height: props.height ?? 300 }} aria-hidden />}>
      <LazyView {...props} />
    </Suspense>
  );
}

/**
 * Cor (hex) de cada status para marcadores de mapa e a barra do painel, só da paleta do app:
 * "Em andamento" em verde claro (mata-4) e "Concluída" no verde da marca (mata-8).
 */
export const STATUS_HEX: Record<RequestStatus, string> = {
  RECEIVED: "#597a99",
  UNDER_ANALYSIS: "#e39500",
  IN_PROGRESS: "#4aaf79",
  RESOLVED: "#0d7a49",
  REJECTED: "#cf4623",
  CANCELED: "#868e96",
};
