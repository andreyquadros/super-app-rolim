import { Button, Group, Paper, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCloudOff, IconRefresh } from "@tabler/icons-react";
import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useAuth } from "@/auth/AuthContext";
import { useOnline } from "@/hooks/useOnline";
import { listenForegroundPush } from "@/lib/push";
import classes from "./AppStatus.module.css";

/** Aviso fixo quando o aparelho está sem internet. */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className={classes.offline} role="status">
      <IconCloudOff size={18} aria-hidden />
      <span>Sem internet · dados salvos</span>
    </div>
  );
}

/** "Nova versão disponível" quando o service worker detecta atualização. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Verifica atualizações a cada hora com o app aberto
      setInterval(() => registration.update().catch(() => undefined), 60 * 60 * 1000);
    },
  });

  if (!needRefresh) return null;
  return (
    <Paper className={classes.update} shadow="lg" p="md" withBorder>
      <Group justify="space-between" gap="sm" wrap="nowrap">
        <Text size="sm" fw={500}>
          Há uma nova versão do app.
        </Text>
        <Group gap="xs" wrap="nowrap">
          <Button size="xs" variant="subtle" color="gray" onClick={() => setNeedRefresh(false)}>
            Depois
          </Button>
          <Button size="xs" leftSection={<IconRefresh size={14} />} onClick={() => updateServiceWorker(true)}>
            Atualizar
          </Button>
        </Group>
      </Group>
    </Paper>
  );
}

/** Exibe como aviso os pushes recebidos com o app em primeiro plano. */
export function ForegroundPush() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return undefined;
    let stop: (() => void) | undefined;
    let cancelled = false;
    listenForegroundPush((title, message) => notifications.show({ title, message, color: "mata", autoClose: 8000 }))
      .then((unsubscribe) => (cancelled ? unsubscribe() : (stop = unsubscribe)))
      .catch(() => undefined);
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [user]);
  return null;
}
