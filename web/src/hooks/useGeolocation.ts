import { useCallback, useState } from "react";
import type { LatLng } from "@/domain/geo";

export interface GeolocationState {
  position: LatLng | null;
  loading: boolean;
  error: string | null;
  locate: () => Promise<LatLng | null>;
}

const MESSAGES: Record<number, string> = {
  1: "Permita o acesso à localização nas configurações do navegador.",
  2: "Não foi possível obter sua localização. Tente em local aberto.",
  3: "A localização demorou demais. Tente novamente.",
};

export function useGeolocation(): GeolocationState {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locate = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      setError("Este aparelho não oferece localização.");
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }),
      );
      const point = { lat: result.coords.latitude, lng: result.coords.longitude };
      setPosition(point);
      return point;
    } catch (e: unknown) {
      const code = typeof e === "object" && e !== null && "code" in e ? Number((e as { code: number }).code) : 0;
      setError(MESSAGES[code] ?? "Não foi possível obter sua localização.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { position, loading, error, locate };
}
