import { IconPlus } from "@tabler/icons-react";
import { useLocation } from "react-router";
import { AppLink } from "@/components/AppLink";
import { ariaCurrentFor, NAV_ITEMS, tabState, type NavItem } from "./navItems";
import classes from "./TabBar.module.css";
import { useTabPress } from "./tabHistory";

interface TabBarProps {
  sheetOpen: boolean;
  onRequest: () => void;
  hasUnreadNotices: boolean;
}

interface TabProps {
  item: NavItem;
  pathname: string;
  unread: boolean;
  onPress: ReturnType<typeof useTabPress>;
}

function Tab({ item, pathname, unread, onPress }: TabProps) {
  const state = tabState(item, pathname);
  const Icon = state === "inactive" ? item.icon : item.activeIcon;
  const to = item.to();
  return (
    <AppLink
      to={to}
      nav="tab"
      className={classes.tab}
      aria-current={ariaCurrentFor(state)}
      onClick={(event) => onPress(event, state, to)}
      data-press
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
  );
}

/** Barra inferior do celular: 4 abas e o botão central "Solicitar". */
export function TabBar({ sheetOpen, onRequest, hasUnreadNotices }: TabBarProps) {
  const { pathname } = useLocation();
  const onPress = useTabPress();
  const [first, second, ...rest] = NAV_ITEMS;
  const tab = (item: NavItem) => (
    <Tab key={item.key} item={item} pathname={pathname} unread={item.key === "avisos" && hasUnreadNotices} onPress={onPress} />
  );
  return (
    <nav className={`${classes.bar} tab-bar-vt`} aria-label="Navegação principal">
      {tab(first)}
      {tab(second)}
      <button
        type="button"
        className={classes.request}
        onClick={onRequest}
        aria-haspopup="dialog"
        aria-expanded={sheetOpen}
        data-open={sheetOpen || undefined}
      >
        <span className={classes.fab} aria-hidden>
          <IconPlus size={30} stroke={2.4} className={classes.plus} />
        </span>
        <span className={classes.label}>Solicitar</span>
      </button>
      {rest.map(tab)}
    </nav>
  );
}
