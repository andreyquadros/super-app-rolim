// Tipo de navegação usado pelas transições de tela (View Transitions).
export type NavKind = "push" | "pop" | "tab" | "flow";

const root = () => document.documentElement;

export function setNavKind(kind: NavKind): void {
  root().dataset.nav = kind;
}

/** Movimento desligado por preferência do sistema ou aparelho modesto. */
export function motionAllowed(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  return root().dataset.motion !== "lite";
}

interface NetworkInfo {
  saveData?: boolean;
}

/** Chamado no main.tsx antes do roteador: voltar do navegador = "pop". */
export function initNavMotion(): void {
  window.addEventListener("popstate", () => setNavKind("pop"));
  const nav = navigator as Navigator & { connection?: NetworkInfo; deviceMemory?: number };
  if (nav.connection?.saveData || (nav.deviceMemory !== undefined && nav.deviceMemory <= 2)) {
    root().dataset.motion = "lite";
  }
}
