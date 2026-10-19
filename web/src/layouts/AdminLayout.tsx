import { AppShell, Avatar, Burger, Menu, NavLink as MantineNavLink, ScrollArea, UnstyledButton } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  IconBell,
  IconBuildingCommunity,
  IconChartBar,
  IconChevronDown,
  IconClock24,
  IconLogout,
  IconMessages,
  IconSmartHome,
  IconTools,
  IconUsersGroup,
  type Icon,
} from "@tabler/icons-react";
import { Link, Outlet, useLocation } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { BrandMark } from "@/components/brand/BrandMark";
import { MaintainerCredit } from "@/components/brand/MaintainerCredit";
import { APP_NAME } from "@/config/city";
import { firstName } from "@/domain/format";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { RoleBadge } from "@/pages/admin/RoleBadge";
import classes from "./AdminLayout.module.css";

interface Access {
  isRoot: boolean;
  isManager: boolean;
  isDutyManager: boolean;
}

interface Item {
  to: string;
  label: string;
  icon: Icon;
  show: (a: Access) => boolean;
}

const ITEMS: Item[] = [
  { to: "/painel/inicio", label: "Visão geral", icon: IconChartBar, show: (a) => a.isManager },
  { to: "/painel/zeladoria", label: "Zeladoria", icon: IconTools, show: (a) => a.isManager },
  { to: "/painel/ouvidoria", label: "Ouvidoria", icon: IconMessages, show: (a) => a.isManager },
  { to: "/painel/comunicados", label: "Comunicados", icon: IconBell, show: (a) => a.isManager },
  { to: "/painel/meus-plantoes", label: "Meus plantões", icon: IconClock24, show: (a) => a.isDutyManager || a.isRoot },
  { to: "/painel/unidades", label: "Unidades e plantões", icon: IconBuildingCommunity, show: (a) => a.isRoot },
  { to: "/painel/equipe", label: "Equipe e acessos", icon: IconUsersGroup, show: (a) => a.isRoot },
];

const NAV_CLASSES = { root: classes.navLink, label: classes.navLabel, section: classes.navIcon };

function TeamChip({ className }: { className?: string }) {
  return <span className={`${classes.chip} ${className ?? ""}`}>Painel da equipe</span>;
}

/** Acessos e a linha da prefeitura: no pé do menu lateral ou, sem menu, no fim da página. */
function PanelFooter({ className }: { className: string }) {
  const { staff } = useAuth();
  return (
    <div className={className}>
      {staff && staff.roles.length > 0 && (
        <div className={classes.roles}>
          <span className="visually-hidden">Seus acessos:</span>
          {staff.roles.map((r) => (
            <RoleBadge key={r} role={r} size="md" radius="sm" />
          ))}
        </div>
      )}
      <MaintainerCredit className={classes.maintainer} />
    </div>
  );
}

function UserMenu() {
  const { actor, signOut } = useAuth();
  const name = actor?.name ?? "";
  return (
    <Menu position="bottom-end" width={240}>
      <Menu.Target>
        <UnstyledButton className={classes.user} aria-label={name ? `Menu do usuário, ${name}` : "Menu do usuário"}>
          {/* Verde fixo da marca: branco sobre mata-8 (5,4:1); "initials" sorteava tons sem contraste */}
          <Avatar name={name} color="mata" variant="filled" size={34} aria-hidden />
          {name && <span className={classes.userName}>{firstName(name)}</span>}
          <IconChevronDown size={16} aria-hidden className={classes.userChevron} />
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{name}</Menu.Label>
        <Menu.Item component={Link} to="/" leftSection={<IconSmartHome size={18} aria-hidden />}>
          Abrir o app do cidadão
        </Menu.Item>
        <Menu.Item color="barro" leftSection={<IconLogout size={18} aria-hidden />} onClick={() => void signOut()}>
          Sair
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

const MAIN_ID = "painel-conteudo";
const NAV_ID = "painel-menu";

export function AdminLayout() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const { pathname } = useLocation();
  const { isRoot, isManager, isDutyManager } = useAuth();
  const items = ITEMS.filter((i) => i.show({ isRoot, isManager, isDutyManager }));
  // Só uma área (o responsável por plantão): sem menu lateral nem botão de menu
  const single = items.length <= 1;
  // Celular com o menu fechado: o menu sai da tela e também do Tab e do leitor de tela
  const isMobile = useMediaQuery("(max-width: 47.99em)", false, { getInitialValueInEffect: false });
  const current = items.find((i) => pathname.startsWith(i.to));
  useDocumentTitle(current ? `${current.label} · Painel` : "Painel");

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 272, breakpoint: "sm", collapsed: { desktop: single, mobile: single || !opened } }}
      padding={{ base: "md", sm: "xl" }}
      classNames={{ header: classes.header, navbar: classes.navbar, main: classes.main }}
    >
      <a href={`#${MAIN_ID}`} className="skip-link">
        Pular para o conteúdo
      </a>
      <AppShell.Header>
        <div className={classes.headerRow}>
          <div className={classes.headerStart}>
            {!single && (
              <Burger
                opened={opened}
                onClick={toggle}
                hiddenFrom="sm"
                size="md"
                className={classes.burger}
                aria-label={opened ? "Fechar menu" : "Abrir menu"}
                aria-expanded={opened}
                aria-controls={NAV_ID}
              />
            )}
            <Link to="/painel" className={classes.brandLink} aria-label={`${APP_NAME}, início do painel`}>
              <BrandMark variant="onPaper" compact />
            </Link>
            <TeamChip className={classes.chipHeader} />
          </div>
          <UserMenu />
        </div>
      </AppShell.Header>

      {!single && (
        <AppShell.Navbar p="sm" id={NAV_ID} inert={isMobile && !opened ? true : undefined}>
          <TeamChip className={classes.chipNavbar} />
          <AppShell.Section grow component={ScrollArea}>
            <nav aria-label="Áreas do painel">
              <ul className={classes.navList}>
                {items.map((item) => (
                  <li key={item.to}>
                    <MantineNavLink
                      component={Link}
                      to={item.to}
                      label={item.label}
                      leftSection={<item.icon size={22} stroke={1.7} aria-hidden />}
                      active={item === current}
                      aria-current={item === current ? "page" : undefined}
                      onClick={close}
                      variant="light"
                      classNames={NAV_CLASSES}
                    />
                  </li>
                ))}
              </ul>
            </nav>
          </AppShell.Section>
          <AppShell.Section>
            <PanelFooter className={classes.navFooter} />
          </AppShell.Section>
        </AppShell.Navbar>
      )}

      <AppShell.Main id={MAIN_ID} tabIndex={-1}>
        {/* Painel: só um esmaecer curto na troca de tela */}
        <div key={pathname} className={classes.content} data-single={single || undefined}>
          <Outlet />
        </div>
        {single && <PanelFooter className={classes.pageFooter} />}
      </AppShell.Main>
    </AppShell>
  );
}
