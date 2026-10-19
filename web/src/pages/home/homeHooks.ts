import { useEffect, useState, useSyncExternalStore } from "react";
import type { LatLng } from "@/domain/geo";

const MINUTE_MS = 60_000;

/** Hora atual, renovada a cada minuto ("atualizado há…", saudação e data). */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), MINUTE_MS);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

// Duas colunas só quando a coluna estreita (5/12) ainda comporta a linha do plantão
const WIDE_QUERY = "(min-width: 62em)";

function subscribeWide(onChange: () => void): () => void {
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Computador: Início em duas colunas (a ordem de leitura no celular continua a mesma). */
export function useWideLayout(): boolean {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => false,
  );
}

/** A pessoa já liberou a localização antes? (consulta sem perguntar nada) */
async function locationAlreadyGranted(): Promise<boolean> {
  try {
    if (!navigator.permissions || !("geolocation" in navigator)) return false;
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state === "granted";
  } catch {
    return false;
  }
}

const POSITION_OPTIONS: PositionOptions = { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * MINUTE_MS };

/**
 * Posição para mostrar a distância, só se a permissão já foi dada antes.
 * A Início nunca pede localização: sem permissão, a distância não aparece.
 */
export function useGrantedPosition(enabled: boolean): LatLng | null {
  const [position, setPosition] = useState<LatLng | null>(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    locationAlreadyGranted().then((granted) => {
      if (!granted || !active) return;
      navigator.geolocation.getCurrentPosition(
        (result) => {
          if (active) setPosition({ lat: result.coords.latitude, lng: result.coords.longitude });
        },
        // Falhou (GPS desligado, tempo esgotado): a linha segue útil sem a distância
        () => undefined,
        POSITION_OPTIONS,
      );
    });
    return () => {
      active = false;
    };
  }, [enabled]);
  return position;
}
