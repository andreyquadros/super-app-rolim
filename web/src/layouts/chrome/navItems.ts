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
  isActive: (pathname: string) => boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { key: "inicio", label: "Início", icon: IconHome, activeIcon: IconHomeFilled, to: () => "/", isActive: (p) => p === "/" },
  {
    key: "pedidos",
    label: "Pedidos",
    icon: IconListCheck,
    activeIcon: IconListCheck,
    to: () => "/protocolos",
    isActive: (p) => p.startsWith("/protocolos"),
  },
  {
    key: "plantao",
    label: "Plantão",
    icon: IconClock24,
    activeIcon: IconClock24,
    to: lastDutyPath,
    isActive: (p) => p.startsWith("/plantao"),
  },
  {
    key: "avisos",
    label: "Avisos",
    icon: IconBell,
    activeIcon: IconBellFilled,
    to: () => "/comunicados",
    isActive: (p) => p.startsWith("/comunicados"),
  },
];

/** Tocar de novo na aba ativa leva ao topo da tela. */
export function scrollToTop(): void {
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
}
