import { Alert, Group, Switch, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBellRinging } from "@tabler/icons-react";
import { useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { errorMessage } from "@/lib/errors";
import { isIos, isStandalone } from "@/lib/platform";
import { currentPushState, disablePush, enablePush, type PushState } from "@/lib/push";

const HINTS: Partial<Record<PushState, string>> = {
  denied: "As notificações estão bloqueadas. Libere nas configurações do navegador para este site.",
  unsupported: isIos() && !isStandalone()
    ? "No iPhone, instale o app na Tela de Início para receber avisos."
    : "Este navegador não suporta notificações.",
};

export function PushToggle() {
  const { user } = useAuth();
  const [state, setState] = useState<PushState>(currentPushState);
  const [busy, setBusy] = useState(false);

  // Sem chave de push configurada neste ambiente: não oferece o que não funciona
  if (!user || state === "unconfigured") return null;

  const toggle = async (checked: boolean) => {
    setBusy(true);
    try {
      if (checked) {
        const result = await enablePush(user.uid);
        setState(result);
        if (result === "enabled") notifications.show({ message: "Pronto! Você receberá os avisos da prefeitura.", color: "mata" });
      } else {
        await disablePush();
        setState("disabled");
      }
    } catch (error: unknown) {
      notifications.show({ title: "Não foi possível ativar", message: errorMessage(error), color: "barro" });
    } finally {
      setBusy(false);
    }
  };

  const hint = HINTS[state];
  return (
    <div>
      <Group justify="space-between" wrap="nowrap">
        <Group gap="sm" wrap="nowrap">
          <IconBellRinging size={22} stroke={1.6} />
          <div>
            <Text fw={600}>Avisos no celular</Text>
            <Text size="xs" c="dimmed">
              Comunicados e andamento das suas solicitações
            </Text>
          </div>
        </Group>
        <Switch
          size="md"
          checked={state === "enabled"}
          disabled={busy || state === "unsupported" || state === "denied"}
          onChange={(e) => toggle(e.currentTarget.checked)}
          aria-label="Ativar avisos no celular"
        />
      </Group>
      {hint && (
        <Alert mt="sm" variant="light" color="gray" p="xs">
          <Text size="xs">{hint}</Text>
        </Alert>
      )}
    </div>
  );
}
