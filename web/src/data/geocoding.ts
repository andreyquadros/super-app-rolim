import { splitStreet } from "@/domain/catalog";
import type { LatLng } from "@/domain/geo";
import type { Address } from "@/domain/types";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";

interface NominatimAddress {
  road?: string;
  pedestrian?: string;
  footway?: string;
  house_number?: string;
  suburb?: string;
  neighbourhood?: string;
  quarter?: string;
  city_district?: string;
  hamlet?: string;
  village?: string;
}

/** Converte a resposta do OpenStreetMap em campos do formulário. */
export function addressFromNominatim(a: NominatimAddress): Partial<Address> {
  const road = a.road ?? a.pedestrian ?? a.footway;
  const street = road ? splitStreet(road) : null;
  const neighborhood = a.suburb ?? a.neighbourhood ?? a.quarter ?? a.city_district ?? a.hamlet ?? a.village;
  return {
    ...(street ?? {}),
    ...(a.house_number ? { number: a.house_number } : {}),
    ...(neighborhood ? { neighborhood } : {}),
  };
}

/**
 * Endereço aproximado do ponto marcado (OpenStreetMap/Nominatim, gratuito).
 * Falhas não bloqueiam: o cidadão sempre pode digitar o endereço.
 */
export async function reverseGeocode(point: LatLng, signal?: AbortSignal): Promise<Partial<Address>> {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(point.lat),
    lon: String(point.lng),
    zoom: "18",
    addressdetails: "1",
    "accept-language": "pt-BR",
  });
  const response = await fetch(`${NOMINATIM_URL}?${params}`, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Geocodificação indisponível (${response.status})`);
  const body: unknown = await response.json();
  const address = (body as { address?: NominatimAddress }).address;
  return address ? addressFromNominatim(address) : {};
}
