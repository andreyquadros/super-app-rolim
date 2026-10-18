import { AppShell, Avatar, Badge, Burger, Button, Group, Menu, NavLink as MantineNavLink, ScrollArea, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBell,
  IconBuildingCommunity,
  IconChartBar,
  IconLogout,
  IconMessages,
  IconPill,
  IconSmartHome,
  IconTools,
  IconUsersGroup,
  type Icon,
} from "@tabler/icons-react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { ROLE_COLOR, ROLE_LABEL } from "@/domain/roles";

interface Item {
  to: string;
  label: string;
  icon: Icon;
  show: (a: { isRoot: boolean; isManager: boolean; isPharmacist: boolean }) => boolean;
}

const ITEMS: Item[] = [
  { to: "/painel/inicio", label: "Visão geral", icon: IconChartBar, show: (a) => a.isManager },
  { to: "/painel/zeladoria", label: "Zeladoria", icon: IconTools, show: (a) => a.isManager },
  { to: "/painel/ouvidoria", label: "Ouvidoria", icon: IconMessages, show: (a) => a.isManager },
  { to: "/painel/comunicados", label: "Comunicados", icon: IconBell, show: (a) => a.isManager },
  { to: "/painel/minhas-farmacias", label: "Minhas farmácias", icon: IconPill, show: (a) => a.isPharmacist },
  { to: "/painel/unidades", label: "Unidades e farmácias", icon: IconBuildingCommunity, show: (a) => a.isRoot },
  { to: "/painel/equipe", label: "Equipe e acessos", icon: IconUsersGroup, show: (a) => a.isManager },
];

export function AdminLayout() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { actor, staff, isRoot, isManager, isPharmacist, signOut } = useAuth();
  const items = ITEMS.filter((i) => i.show({ isRoot, isManager, isPharmacist }));

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 264, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding={{ base: "md", sm: "lg" }}
      styles={{ main: { background: "var(--app-paper)" } }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="Abrir menu" />
            <img src="/logo.svg" alt="" width={32} height={32} />
            <div>
              <Text className="eyebrow" lh={1.1}>
                Painel da prefeitura
              </Text>
              <Text ff="heading" fw={600} lh={1.1}>
                Rolim de Moura
              </Text>
            </div>
          </Group>
          <Menu position="bottom-end" width={220}>
            <Menu.Target>
              <Button variant="subtle" color="gray" px="xs" rightSection={null} aria-label="Menu do usuário">
                <Avatar name={actor?.name} color="initials" size={32} />
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>{actor?.name}</Menu.Label>
              <Menu.Item component={Link} to="/" leftSection={<IconSmartHome size={16} />}>
                App do cidadão
              </Menu.Item>
              <Menu.Item color="red" leftSection={<IconLogout size={16} />} onClick={() => { navigate("/", { replace: true }); void signOut(); }}>
                Sair
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <AppShell.Section grow component={ScrollArea}>
          <Stack gap={2}>
            {items.map((item) => (
              <MantineNavLink
                key={item.to}
                component={Link}
                to={item.to}
                label={item.label}
                leftSection={<item.icon size={20} stroke={1.6} />}
                active={pathname.startsWith(item.to)}
                onClick={close}
                variant="light"
                style={{ borderRadius: "var(--mantine-radius-md)" }}
              />
            ))}
          </Stack>
        </AppShell.Section>
        <AppShell.Section>
          <Group gap={6} p="xs">
            {staff?.roles.map((r) => (
              <Badge key={r} color={ROLE_COLOR[r]} size="sm">
                {ROLE_LABEL[r]}
              </Badge>
            ))}
          </Group>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <div style={{ maxWidth: 1200, marginInline: "auto" }}>
          <Outlet />
        </div>
      </AppShell.Main>
    </AppShell>
  );
}
