import { Button, Group, Paper, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCloudOff, IconRefresh } from "@tabler/icons-react";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useAuth } from "@/auth/AuthContext";
import { useOnline } from "@/hooks/useOnline";
import { listenForegroundPush } from "@/lib/push";
import { dismissFailedPart, hasFailedPart, onFailedPartChange, reloadDidNotHelp, reloadForFailedPart } from "@/lib/staleChunks";
import classes from "./AppStatus.module.css";

export const OFFLINE_TEXT = "Sem internet · mostrando dados salvos";

/**
 * - bar: dentro da barra verde do cidadão, empurrando a tela para baixo
 *   (nunca por cima do título);
 * - top/bottom: pílula flutuante nas telas fora da casca (apresentação, painel).
 */
export type OfflinePlacement = "bar" | "top" | "bottom";

function OfflinePill() {
  return (
    <span className={classes.pill}>
      <IconCloudOff size={18} aria-hidden className={classes.icon} />
      <span className={classes.text}>{OFFLINE_TEXT}</span>
    </span>
  );
}

/** Aviso quando o aparelho está sem internet. */
export function OfflineBanner({ placement }: { placement: OfflinePlacement }) {
  const online = useOnline();
  if (placement === "bar") {
    // Região sempre presente: o leitor de tela anuncia quando a conexão cai
    return (
      <div className={classes.barSlot} role="status">
        {!online && <OfflinePill />}
      </div>
    );
  }
  if (online) return null;
  return (
    <div className={classes.floating} data-placement={placement} role="status">
      <OfflinePill />
    </div>
  );
}

/** Cartão fixo acima da barra de abas, com o texto à esquerda e as ações à direita. */
function NoticeCard({ children, actions }: { children: ReactNode; actions: ReactNode }) {
  return (
    <Paper className={classes.update} shadow="lg" p="md" withBorder role="status">
      <Group justify="space-between" gap="sm" wrap="nowrap">
        {children}
        <Group gap="xs" wrap="nowrap">
          {actions}
        </Group>
      </Group>
    </Paper>
  );
}

function LaterButton({ label = "Depois", onClick }: { label?: string; onClick: () => void }) {
  return (
    <Button size="xs" variant="subtle" color="gray" onClick={onClick}>
      {label}
    </Button>
  );
}

function ReloadButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button size="xs" leftSection={<IconRefresh size={14} />} onClick={onClick}>
      {label}
    </Button>
  );
}

/** Pedaço que não carregou: recarregar resolve; se já não resolveu, fechar e abrir o app. */
function FailedPartNotice() {
  if (reloadDidNotHelp()) {
    return (
      <NoticeCard actions={<LaterButton label="Entendi" onClick={dismissFailedPart} />}>
        <Stack gap={2}>
          <Text size="sm" fw={500}>
            Uma parte do app ainda não carregou.
          </Text>
          <Text size="sm" c="dimmed">
            Feche e abra o app de novo.
          </Text>
        </Stack>
      </NoticeCard>
    );
  }
  return (
    <NoticeCard
      actions={
        <>
          <LaterButton onClick={dismissFailedPart} />
          <ReloadButton label="Recarregar" onClick={reloadForFailedPart} />
        </>
      }
    >
      <Text size="sm" fw={500}>
        Uma parte do app não carregou.
      </Text>
    </NoticeCard>
  );
}

/**
 * "Nova versão disponível" quando o service worker detecta atualização e, no
 * mesmo lugar, "Uma parte do app não carregou" quando um pedaço falhou e só
 * recarregar resolve (lib/staleChunks). Esse espera a conexão voltar: sem
 * internet, recarregar não abriria o app. Se recarregar não adiantou (o
 * Safari guarda a falha), pede para fechar e abrir o app.
 */
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
  const online = useOnline();
  const partFailed = useSyncExternalStore(onFailedPartChange, hasFailedPart, () => false);

  if (needRefresh) {
    return (
      <NoticeCard
        actions={
          <>
            <LaterButton onClick={() => setNeedRefresh(false)} />
            <ReloadButton label="Atualizar" onClick={() => updateServiceWorker(true)} />
          </>
        }
      >
        <Text size="sm" fw={500}>
          Há uma nova versão do app.
        </Text>
      </NoticeCard>
    );
  }
  return partFailed && online ? <FailedPartNotice /> : null;
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
