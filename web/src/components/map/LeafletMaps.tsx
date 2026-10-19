// Carregado sob demanda (Leaflet ~150 KB): importe via components/map/index.tsx
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { CircleMarker, MapContainer, Marker, Polygon, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { CITY_BOUNDARY, CITY_CENTER, CITY_ZOOM, MAP_TILES } from "@/config/city";
import type { LatLng } from "@/domain/geo";

const PIN = L.divIcon({ className: "", html: '<div class="map-pin"></div>', iconSize: [34, 34], iconAnchor: [17, 41] });
const BOUNDARY = CITY_BOUNDARY.map(([lng, lat]) => [lat, lng] as [number, number]);
const PICK_KEYS = new Set(["Enter", " "]);

function Boundary() {
  return (
    <Polygon
      positions={BOUNDARY}
      pathOptions={{ color: "#0d7a49", weight: 2, dashArray: "6 6", fillOpacity: 0.03, interactive: false }}
    />
  );
}

/** Zoom com nomes em português ("Aproximar", "Afastar"), sem a dica flutuante do title. */
function Zoom() {
  const map = useMap();
  useEffect(() => {
    const control = L.control.zoom({ position: "topleft", zoomInTitle: "Aproximar", zoomOutTitle: "Afastar" }).addTo(map);
    // O nome acessível continua no aria-label que o Leaflet põe em cada botão
    control.getContainer()?.querySelectorAll("a").forEach((link) => link.removeAttribute("title"));
    return () => {
      control.remove();
    };
  }, [map]);
  return null;
}

function Recenter({ point, zoom }: { point: LatLng | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.setView([point.lat, point.lng], zoom ?? Math.max(map.getZoom(), 16), { animate: true });
  }, [map, point, zoom]);
  return null;
}

function ClickToPick({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

interface MapNameProps {
  label: string;
  /** "application" no mapa de marcar (as setas vão para o mapa); "region" no de ver */
  role: "application" | "region";
  describedBy?: string;
}

/** Nome do quadro do mapa, que recebe o foco do teclado (o Leaflet o deixa sem nome). */
function MapName({ label, role, describedBy }: MapNameProps) {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    container.setAttribute("role", role);
    container.setAttribute("aria-label", label);
    if (describedBy) container.setAttribute("aria-describedby", describedBy);
    return () => container.removeAttribute("aria-describedby");
  }, [map, label, role, describedBy]);
  return null;
}

/**
 * Teclado: as setas movem o mapa (Leaflet) e Enter ou Espaço marcam o centro,
 * onde fica a mira desenhada por quem usa o mapa.
 */
function KeyboardPick({ onPick }: { onPick: (p: LatLng) => void }) {
  const map = useMap();
  // A função mais recente, sem religar o listener a cada renderização
  const pick = useRef(onPick);
  useEffect(() => {
    pick.current = onPick;
  }, [onPick]);

  useEffect(() => {
    const container = map.getContainer();
    const onKeyDown = (event: KeyboardEvent) => {
      // Só no mapa em si (não nos botões de zoom ou nos links dos créditos)
      if (event.target !== container || !PICK_KEYS.has(event.key)) return;
      event.preventDefault();
      const center = map.getCenter();
      pick.current({ lat: center.lat, lng: center.lng });
    };
    container.addEventListener("keydown", onKeyDown);
    return () => container.removeEventListener("keydown", onKeyDown);
  }, [map]);
  return null;
}

/** Informa o centro atual (para o botão "Marcar o centro do mapa" fora do mapa). */
function CenterReport({ onCenterChange }: { onCenterChange: (center: LatLng) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      onCenterChange({ lat: center.lat, lng: center.lng });
    },
  });
  useEffect(() => {
    const center = map.getCenter();
    onCenterChange({ lat: center.lat, lng: center.lng });
  }, [map, onCenterChange]);
  return null;
}

export interface MapPickerProps {
  value: LatLng | null;
  onChange: (point: LatLng) => void;
  height?: number;
  /** Nome do mapa para leitores de tela */
  label?: string;
  /** id do texto com as instruções de teclado */
  describedBy?: string;
  onCenterChange?: (center: LatLng) => void;
}

export function MapPicker({ value, onChange, height = 320, label = "Mapa para marcar o local", describedBy, onCenterChange }: MapPickerProps) {
  const handlers = useMemo(
    () => ({
      dragend: (e: L.DragEndEvent) => {
        const p = (e.target as L.Marker).getLatLng();
        onChange({ lat: p.lat, lng: p.lng });
      },
    }),
    [onChange],
  );

  return (
    <MapContainer center={value ?? CITY_CENTER} zoom={value ? 16 : CITY_ZOOM} style={{ height }} scrollWheelZoom zoomControl={false}>
      <TileLayer url={MAP_TILES.url} attribution={MAP_TILES.attribution} maxZoom={19} crossOrigin />
      <Zoom />
      <Boundary />
      <ClickToPick onPick={onChange} />
      <MapName label={label} role="application" describedBy={describedBy} />
      <KeyboardPick onPick={onChange} />
      {onCenterChange && <CenterReport onCenterChange={onCenterChange} />}
      <Recenter point={value} />
      {/* Arrastar é só com o dedo ou o mouse; no teclado, Enter marca o centro */}
      {value && <Marker position={value} icon={PIN} draggable keyboard={false} eventHandlers={handlers} />}
    </MapContainer>
  );
}

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  color: string;
  label: string;
  onClick?: () => void;
}

export interface MapViewProps {
  markers: MapMarker[];
  /** Nome do mapa para leitores de tela */
  label?: string;
  height?: number;
  center?: LatLng;
  zoom?: number;
  showBoundary?: boolean;
}

/**
 * Pontos sem ação são só desenho (sem foco e sem dica flutuante): a lista ao
 * lado do mapa já traz os nomes. Pontos com ação ganham o nome no aria-label.
 */
function Point({ marker, large }: { marker: MapMarker; large: boolean }) {
  const { onClick, label } = marker;
  const handlers = useMemo<L.LeafletEventHandlerFnMap | undefined>(
    () =>
      onClick
        ? {
            click: onClick,
            add: (e) => (e.target as L.Path).getElement()?.setAttribute("aria-label", label),
          }
        : undefined,
    [onClick, label],
  );
  return (
    <CircleMarker
      center={[marker.lat, marker.lng]}
      radius={large ? 11 : 8}
      pathOptions={{ color: "#ffffff", weight: 2, fillColor: marker.color, fillOpacity: 0.95, interactive: Boolean(onClick) }}
      eventHandlers={handlers}
    />
  );
}

export function MapView({ markers, label = "Mapa", height = 300, center, zoom, showBoundary = false }: MapViewProps) {
  const single = markers.length === 1 ? markers[0] : null;
  const initial = center ?? (single ? { lat: single.lat, lng: single.lng } : CITY_CENTER);
  return (
    <MapContainer center={initial} zoom={zoom ?? (single ? 16 : CITY_ZOOM)} style={{ height }} scrollWheelZoom={false} zoomControl={false}>
      <TileLayer url={MAP_TILES.url} attribution={MAP_TILES.attribution} maxZoom={19} crossOrigin />
      <Zoom />
      <MapName label={label} role="region" />
      {showBoundary && <Boundary />}
      {markers.map((m) => (
        <Point key={m.id} marker={m} large={single !== null} />
      ))}
    </MapContainer>
  );
}
