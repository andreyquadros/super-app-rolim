import { ActionIcon, Avatar, Button, Drawer, Group, Stack, Text, ThemeIcon, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBell,
  IconChevronRight,
  IconHome,
  IconLayoutDashboard,
  IconListCheck,
  IconMessages,
  IconPill,
  IconPlus,
  IconTools,
} from "@tabler/icons-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { CITY_NAME } from "@/config/city";
import classes from "./CitizenLayout.module.css";

const TABS = [
  { to: "/", label: "Início", icon: IconHome, end: true },
  { to: "/protocolos", label: "Protocolos", icon: IconListCheck, end: false },
  { to: "/farmacias", label: "Farmácias", icon: IconPill, end: false },
  { to: "/comunicados", label: "Avisos", icon: IconBell, end: false },
] as const;

function Brand() {
  return (
    <UnstyledButton component={Link} to="/" className={classes.brand} aria-label="Início">
      <img src="/logo.svg" alt="" width={36} height={36} />
      <div>
        <Text className="eyebrow" lh={1.1}>
          Prefeitura de
        </Text>
        <Text ff="heading" fw={600} fz="lg" lh={1.1}>
          {CITY_NAME}
        </Text>
      </div>
    </UnstyledButton>
  );
}

interface NewRequestSheetProps {
  opened: boolean;
  onClose: () => void;
}

/** Folha inferior com os dois tipos de solicitação. */
export function NewRequestSheet({ opened, onClose }: NewRequestSheetProps) {
  const navigate = useNavigate();
  const go = (to: string) => {
    onClose();
    navigate(to);
  };
  const options = [
    { to: "/zeladoria/nova", icon: IconTools, title: "Zeladoria", text: "Problema na rua: buraco, iluminação, lixo, mato", color: "mata" },
    { to: "/ouvidoria/nova", icon: IconMessages, title: "Ouvidoria", text: "Elogio, sugestão ou reclamação sobre uma unidade", color: "ipe" },
  ];
  return (
    <Drawer opened={opened} onClose={onClose} position="bottom" size="auto" title="O que você quer registrar?" classNames={{ content: classes.sheet }}>
      <Stack gap="sm" pb="md">
        {options.map((o) => (
          <UnstyledButton key={o.to} className={classes.sheetOption} onClick={() => go(o.to)}>
            <ThemeIcon size={48} radius="md" color={o.color} variant="light">
              <o.icon size={26} />
            </ThemeIcon>
            <div style={{ flex: 1 }}>
              <Text fw={700}>{o.title}</Text>
              <Text size="sm" c="dimmed">
                {o.text}
              </Text>
            </div>
            <IconChevronRight size={18} />
          </UnstyledButton>
        ))}
      </Stack>
    </Drawer>
  );
}

export function CitizenLayout() {
  const { user, profile, staff } = useAuth();
  const [sheetOpened, sheet] = useDisclosure(false);

  return (
    <div className={classes.shell}>
      <header className={classes.header}>
        <div className={classes.headerInner}>
          <Brand />
          <nav className={classes.desktopNav} aria-label="Navegação principal">
            {TABS.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.end} className={classes.desktopLink}>
                {t.label}
              </NavLink>
            ))}
            <Button size="sm" leftSection={<IconPlus size={16} />} onClick={sheet.open}>
              Solicitar
            </Button>
          </nav>
          <Group gap="xs" wrap="nowrap">
            {staff && (
              <Button component={Link} to="/painel" size="xs" variant="light" leftSection={<IconLayoutDashboard size={14} />}>
                Painel
              </Button>
            )}
            {user ? (
              <ActionIcon component={Link} to="/perfil" size={40} variant="subtle" aria-label="Meu perfil">
                <Avatar name={profile?.fullName ?? user.email ?? "?"} color="initials" size={34} />
              </ActionIcon>
            ) : (
              <Button component={Link} to="/entrar" size="xs" variant="default">
                Entrar
              </Button>
            )}
          </Group>
        </div>
      </header>

      <main className={classes.main}>
        <Outlet context={{ openNewRequest: sheet.open }} />
      </main>

      <nav className={classes.tabbar} aria-label="Navegação principal">
        {TABS.slice(0, 2).map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={classes.tab}>
            <t.icon size={22} stroke={1.7} />
            <span>{t.label}</span>
          </NavLink>
        ))}
        <button type="button" className={classes.fab} onClick={sheet.open} aria-label="Nova solicitação">
          <IconPlus size={28} stroke={2.2} />
        </button>
        {TABS.slice(2).map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={classes.tab}>
            <t.icon size={22} stroke={1.7} />
            <span>{t.label}</span>
          </NavLink>
        ))}
      </nav>

      <NewRequestSheet opened={sheetOpened} onClose={sheet.close} />
    </div>
  );
}
