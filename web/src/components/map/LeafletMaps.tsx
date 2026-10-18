// Carregado sob demanda (Leaflet ~150 KB): importe via components/map/index.tsx
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, Marker, Polygon, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { CITY_BOUNDARY, CITY_CENTER, CITY_ZOOM, MAP_TILES } from "@/config/city";
import type { LatLng } from "@/domain/geo";

const PIN = L.divIcon({ className: "", html: '<div class="map-pin"></div>', iconSize: [34, 34], iconAnchor: [17, 41] });
const BOUNDARY = CITY_BOUNDARY.map(([lng, lat]) => [lat, lng] as [number, number]);

function Boundary() {
  return (
    <Polygon
      positions={BOUNDARY}
      pathOptions={{ color: "#0d7a49", weight: 2, dashArray: "6 6", fillOpacity: 0.03, interactive: false }}
    />
  );
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

export interface MapPickerProps {
  value: LatLng | null;
  onChange: (point: LatLng) => void;
  height?: number;
}

export function MapPicker({ value, onChange, height = 320 }: MapPickerProps) {
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
    <MapContainer center={value ?? CITY_CENTER} zoom={value ? 16 : CITY_ZOOM} style={{ height }} scrollWheelZoom>
      <TileLayer url={MAP_TILES.url} attribution={MAP_TILES.attribution} maxZoom={19} crossOrigin />
      <Boundary />
      <ClickToPick onPick={onChange} />
      <Recenter point={value} />
      {value && <Marker position={value} icon={PIN} draggable eventHandlers={handlers} />}
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
  height?: number;
  center?: LatLng;
  zoom?: number;
  showBoundary?: boolean;
}

export function MapView({ markers, height = 300, center, zoom, showBoundary = false }: MapViewProps) {
  const single = markers.length === 1 ? markers[0] : null;
  const initial = center ?? (single ? { lat: single.lat, lng: single.lng } : CITY_CENTER);
  return (
    <MapContainer center={initial} zoom={zoom ?? (single ? 16 : CITY_ZOOM)} style={{ height }} scrollWheelZoom={false}>
      <TileLayer url={MAP_TILES.url} attribution={MAP_TILES.attribution} maxZoom={19} crossOrigin />
      {showBoundary && <Boundary />}
      {markers.map((m) => (
        <CircleMarker
          key={m.id}
          center={[m.lat, m.lng]}
          radius={single ? 11 : 8}
          pathOptions={{ color: "#ffffff", weight: 2, fillColor: m.color, fillOpacity: 0.95 }}
          eventHandlers={m.onClick ? { click: m.onClick } : undefined}
        >
          <Tooltip direction="top" offset={[0, -6]}>
            {m.label}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
