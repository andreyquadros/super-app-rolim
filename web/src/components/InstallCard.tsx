import { Button, CloseButton, Group, Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconDeviceMobileDown, IconShare2 } from "@tabler/icons-react";
import { useState } from "react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { storageGet, storageSet } from "@/lib/safeStorage";

const DISMISS_KEY = "rolim.installDismissed";

/** Convite para instalar o app na tela inicial (sem passar por lojas). */
export function InstallCard({ force = false }: { force?: boolean }) {
  const { canPrompt, needsIosInstructions, installed, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(() => !force && storageGet(DISMISS_KEY) === "1");

  if (installed || dismissed || (!canPrompt && !needsIosInstructions)) return null;

  const dismiss = () => {
    storageSet(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <Paper p="md" withBorder radius="lg" bg="var(--mantine-color-ipe-light)">
      <Group align="flex-start" wrap="nowrap" gap="md">
        <ThemeIcon size={44} radius="md" color="ipe" variant="filled">
          <IconDeviceMobileDown size={24} color="#3a2a00" />
        </ThemeIcon>
        <Stack gap={6} style={{ flex: 1 }}>
          <Text fw={700}>Instale o app no seu celular</Text>
          {needsIosInstructions ? (
            <Text size="sm">
              No iPhone, toque em <IconShare2 size={14} style={{ verticalAlign: "-2px" }} /> <b>Compartilhar</b> e depois em{" "}
              <b>Adicionar à Tela de Início</b>. Assim você também recebe os avisos da prefeitura.
            </Text>
          ) : (
            <Text size="sm">Acesso com um toque, funciona sem internet e não ocupa espaço como os apps das lojas.</Text>
          )}
          {canPrompt && (
            <Group mt={4}>
              <Button color="dark" size="sm" onClick={() => install().catch(() => undefined)}>
                Instalar agora
              </Button>
            </Group>
          )}
        </Stack>
        {!force && <CloseButton aria-label="Dispensar" onClick={dismiss} />}
      </Group>
    </Paper>
  );
}
