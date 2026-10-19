import { Button } from "@mantine/core";
import { IconCrosshair } from "@tabler/icons-react";
import { useId, useState } from "react";
import { MapPicker } from "@/components/map";
import { CITY_CENTER } from "@/config/city";
import type { LatLng } from "@/domain/geo";
import classes from "./NewIssue.module.css";

const MAP_HEIGHT = 300;
// ~10 cm: o ponto marcado está no centro do mapa (a mira some atrás do marcador)
const SAME_POINT = 1e-6;

function samePoint(a: LatLng | null, b: LatLng): boolean {
  return a !== null && Math.abs(a.lat - b.lat) < SAME_POINT && Math.abs(a.lng - b.lng) < SAME_POINT;
}

interface PointPickerProps {
  value: LatLng | null;
  onChange: (point: LatLng) => void;
}

/**
 * Mapa do passo 2 com três jeitos de marcar o ponto: tocar no mapa, arrastar o
 * marcador ou mover o mapa até a mira e marcar o centro (botão ou Enter no
 * mapa). O último serve a quem usa teclado ou acionador e não tem GPS.
 */
export function PointPicker({ value, onChange }: PointPickerProps) {
  const [center, setCenter] = useState<LatLng>(value ?? CITY_CENTER);
  const keysHintId = useId();

  return (
    <>
      <div className={classes.map} data-centered={samePoint(value, center) || undefined}>
        <MapPicker value={value} onChange={onChange} height={MAP_HEIGHT} describedBy={keysHintId} onCenterChange={setCenter} />
        <span className={classes.crosshair} aria-hidden />
        {/* Lido como descrição do mapa (aria-describedby), não como parágrafo solto */}
        <p id={keysHintId} className={classes.keysHint} aria-hidden>
          Use as setas para mover o mapa e Enter para marcar o centro.
        </p>
      </div>
      <Button
        variant="default"
        size="lg"
        radius="xl"
        className={classes.center}
        leftSection={<IconCrosshair size={22} aria-hidden />}
        onClick={() => onChange({ ...center })}
      >
        Marcar o centro do mapa
      </Button>
    </>
  );
}
