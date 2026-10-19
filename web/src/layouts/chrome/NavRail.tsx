import { Avatar } from "@mantine/core";
import { IconLayoutDashboard, IconLogin2, IconPlus } from "@tabler/icons-react";
import type { MouseEvent } from "react";
import { useLocation } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { AppLink } from "@/components/AppLink";
import { MAINTAINER_LINE } from "@/config/city";
import { NAV_ITEMS, scrollToTop } from "./navItems";
import classes from "./NavRail.module.css";

interface NavRailProps {
  sheetOpen: boolean;
  onRequest: () => void;
  hasUnreadNotices: boolean;
}

/** Trilho lateral (tablet e computador): as mesmas abas da barra inferior. */
export function NavRail({ sheetOpen, onRequest, hasUnreadNotices }: NavRailProps) {
  const { pathname } = useLocation();
  const { user, profile, staff } = useAuth();

  return (
    <nav className={`${classes.rail} nav-rail-vt`} aria-label="Navegação principal">
      <AppLink to="/" nav="tab" className={classes.logo} aria-label="SUPER APP Rolim de Moura, início">
        <img src="/logo-mono.svg" alt="" width={40} height={40} />
      </AppLink>

      <button type="button" className={classes.request} onClick={onRequest} aria-haspopup="dialog" aria-expanded={sheetOpen} data-press>
        <span className={classes.fab} aria-hidden>
          <IconPlus size={28} stroke={2.4} />
        </span>
        <span className={classes.label}>Solicitar</span>
      </button>

      <ul className={classes.items}>
        {NAV_ITEMS.map((item) => {
          const active = item.isActive(pathname);
          const Icon = active ? item.activeIcon : item.icon;
          const unread = item.key === "avisos" && hasUnreadNotices;
          const onClick = (event: MouseEvent) => {
            if (!active) return;
            event.preventDefault();
            scrollToTop();
          };
          return (
            <li key={item.key}>
              <AppLink to={item.to()} nav="tab" className={classes.item} aria-current={active ? "page" : undefined} onClick={onClick}>
                <span className={classes.iconWrap}>
                  <span className={classes.pill} aria-hidden />
                  <Icon size={26} stroke={1.8} aria-hidden className={classes.icon} />
                  {unread && <span className={classes.dot} aria-hidden />}
                </span>
                <span className={classes.label}>
                  {item.label}
                  {unread && <span className="visually-hidden">, há aviso novo</span>}
                </span>
              </AppLink>
            </li>
          );
        })}
      </ul>

      <div className={classes.footer}>
        {staff && (
          <AppLink to="/painel" className={classes.item}>
            <span className={classes.iconWrap}>
              <IconLayoutDashboard size={24} stroke={1.8} aria-hidden className={classes.icon} />
            </span>
            <span className={classes.label}>Painel</span>
          </AppLink>
        )}
        {user ? (
          <AppLink to="/perfil" nav="tab" className={classes.item} aria-current={pathname.startsWith("/perfil") ? "page" : undefined}>
            <Avatar name={profile?.fullName ?? user.email ?? "?"} color="mata" variant="white" size={36} className={classes.avatar} />
            <span className={classes.label}>Perfil</span>
          </AppLink>
        ) : (
          <AppLink to="/entrar" nav="flow" className={classes.item}>
            <span className={classes.iconWrap}>
              <IconLogin2 size={24} stroke={1.8} aria-hidden className={classes.icon} />
            </span>
            <span className={classes.label}>Entrar</span>
          </AppLink>
        )}
        <p className={classes.maintainer}>{MAINTAINER_LINE}</p>
      </div>
    </nav>
  );
}
