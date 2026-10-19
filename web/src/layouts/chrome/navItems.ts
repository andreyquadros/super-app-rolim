import { IconBell, IconBellFilled, IconClock24, IconHome, IconHomeFilled, IconListCheck, type Icon } from "@tabler/icons-react";
import { lastDutyPath } from "@/lib/dutyMemory";

export type NavKey = "inicio" | "pedidos" | "plantao" | "avisos";

export interface NavItem {
  key: NavKey;
  label: string;
  icon: Icon;
  activeIcon: Icon;
  /** Destino (calculado na hora: "Plantão" volta ao último tipo visto) */
  to: () => string;
  /** A aba fica destacada (na lista e nas telas empilhadas dela) */
  isActive: (pathname: string) => boolean;
  /** A tela é a raiz da aba (a lista), não um detalhe empilhado */
  isRoot: (pathname: string) => boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    key: "inicio",
    label: "Início",
    icon: IconHome,
    activeIcon: IconHomeFilled,
    to: () => "/",
    isActive: (p) => p === "/",
    isRoot: (p) => p === "/",
  },
  {
    key: "pedidos",
    label: "Pedidos",
    icon: IconListCheck,
    activeIcon: IconListCheck,
    to: () => "/protocolos",
    isActive: (p) => p.startsWith("/protocolos"),
    isRoot: (p) => p === "/protocolos",
  },
  {
    key: "plantao",
    label: "Plantão",
    icon: IconClock24,
    activeIcon: IconClock24,
    to: lastDutyPath,
    isActive: (p) => p.startsWith("/plantao"),
    // Farmácias e Funerárias são as duas raízes da aba
    isRoot: (p) => /^\/plantao\/[^/]+\/?$/.test(p),
  },
  {
    key: "avisos",
    label: "Avisos",
    icon: IconBell,
    activeIcon: IconBellFilled,
    to: () => "/comunicados",
    isActive: (p) => p.startsWith("/comunicados"),
    isRoot: (p) => p === "/comunicados",
  },
];

/** Perfil (trilho lateral e avatar): mesma regra das abas. */
export const PROFILE_ROOT = "/perfil";

export type TabState = "root" | "nested" | "inactive";

export function tabState(item: Pick<NavItem, "isActive" | "isRoot">, pathname: string): TabState {
  if (!item.isActive(pathname)) return "inactive";
  return item.isRoot(pathname) ? "root" : "nested";
}

/** "page" só na raiz da aba; nas telas empilhadas a aba segue destacada ("true"). */
export function ariaCurrentFor(state: TabState): "page" | "true" | undefined {
  if (state === "root") return "page";
  return state === "nested" ? "true" : undefined;
}

/** Tocar de novo na aba ativa leva ao topo da tela. */
export function scrollToTop(): void {
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
}
