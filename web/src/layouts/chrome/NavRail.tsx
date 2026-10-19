import { IconLayoutDashboard, IconLogin2, IconPlus } from "@tabler/icons-react";
import { useLocation } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { AppLink } from "@/components/AppLink";
import { MaintainerCredit } from "@/components/brand/MaintainerCredit";
import { withNext } from "@/pages/auth/nextPath";
import { ariaCurrentFor, NAV_ITEMS, PROFILE_ROOT, tabState } from "./navItems";
import classes from "./NavRail.module.css";
import { ProfileAvatar } from "./ProfileAvatar";
import { useTabPress } from "./tabHistory";

interface NavRailProps {
  sheetOpen: boolean;
  onRequest: () => void;
  hasUnreadNotices: boolean;
}

const PROFILE_ITEM = {
  isActive: (p: string) => p.startsWith(PROFILE_ROOT),
  isRoot: (p: string) => p === PROFILE_ROOT,
};

/** Trilho lateral (tablet e computador): as mesmas abas da barra inferior. */
export function NavRail({ sheetOpen, onRequest, hasUnreadNotices }: NavRailProps) {
  const { pathname, search } = useLocation();
  const { user, staff } = useAuth();
  const onPress = useTabPress();
  const profileState = tabState(PROFILE_ITEM, pathname);

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
          const state = tabState(item, pathname);
          const Icon = state === "inactive" ? item.icon : item.activeIcon;
          const unread = item.key === "avisos" && hasUnreadNotices;
          const to = item.to();
          return (
            <li key={item.key}>
              <AppLink
                to={to}
                nav="tab"
                className={classes.item}
                aria-current={ariaCurrentFor(state)}
                onClick={(event) => onPress(event, state, to)}
              >
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
              <span className={classes.pill} aria-hidden />
              <IconLayoutDashboard size={24} stroke={1.8} aria-hidden className={classes.icon} />
            </span>
            <span className={classes.label}>Painel</span>
          </AppLink>
        )}
        {user ? (
          <AppLink
            to={PROFILE_ROOT}
            nav="tab"
            className={classes.item}
            aria-current={ariaCurrentFor(profileState)}
            onClick={(event) => onPress(event, profileState, PROFILE_ROOT)}
          >
            <span className={classes.iconWrap}>
              <span className={classes.pill} aria-hidden />
              <ProfileAvatar size={30} className={classes.avatar} />
            </span>
            <span className={classes.label}>Perfil</span>
          </AppLink>
        ) : (
          <AppLink to={withNext("/entrar", pathname + search)} nav="flow" className={classes.item}>
            <span className={classes.iconWrap}>
              <span className={classes.pill} aria-hidden />
              <IconLogin2 size={24} stroke={1.8} aria-hidden className={classes.icon} />
            </span>
            <span className={classes.label}>Entrar</span>
          </AppLink>
        )}
        <MaintainerCredit variant="rail" className={classes.maintainer} />
      </div>
    </nav>
  );
}
