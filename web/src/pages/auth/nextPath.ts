import { useSearchParams } from "react-router";

/** Destino seguro após login: somente caminhos do próprio app. */
export function safeNextPath(next: string | null, origin: string, fallback = "/"): string {
  if (!next || !next.startsWith("/")) return fallback;
  try {
    const url = new URL(next, origin);
    return url.origin === origin ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}

/** Leva o destino adiante entre as telas de acesso (sem "?next=/" à toa). */
export function withNext(path: string, next: string): string {
  return next === "/" ? path : `${path}?next=${encodeURIComponent(next)}`;
}

export function useNextPath(fallback = "/"): string {
  const [params] = useSearchParams();
  return safeNextPath(params.get("next"), window.location.origin, fallback);
}
