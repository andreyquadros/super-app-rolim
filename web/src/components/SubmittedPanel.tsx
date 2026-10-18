import { Alert, Button, CopyButton, Group, Paper, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconCheck, IconCloudUpload, IconCopy } from "@tabler/icons-react";
import { Link } from "react-router";

interface SubmittedPanelProps {
  protocol: string;
  detailPath: string;
  pendingSync: boolean;
}

/** Confirmação com o número de protocolo em destaque. */
export function SubmittedPanel({ protocol, detailPath, pendingSync }: SubmittedPanelProps) {
  return (
    <Stack align="center" ta="center" gap="lg" py="xl">
      <ThemeIcon size={72} radius="xl" color="mata">
        <IconCheck size={40} stroke={2.4} />
      </ThemeIcon>
      <Stack gap={6} align="center">
        <Title order={1}>Solicitação registrada</Title>
        <Text c="dimmed" maw={420}>
          Guarde o número do protocolo. Você será avisado a cada mudança de situação.
        </Text>
      </Stack>
      <Paper withBorder p="lg" radius="lg" w="100%" maw={420} bg="var(--app-surface)">
        <span className="eyebrow">Protocolo</span>
        <Group justify="center" gap="xs" mt={6}>
          <Text className="protocol" fz={26}>
            {protocol}
          </Text>
          <CopyButton value={protocol}>
            {({ copied, copy }) => (
              <Button size="xs" variant="light" onClick={copy} leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}>
                {copied ? "Copiado" : "Copiar"}
              </Button>
            )}
          </CopyButton>
        </Group>
      </Paper>
      {pendingSync && (
        <Alert icon={<IconCloudUpload size={18} />} color="ipe" variant="light" maw={420} ta="left">
          Você está sem internet. A solicitação fica salva no aparelho e será enviada automaticamente quando a conexão voltar.
        </Alert>
      )}
      <Group>
        <Button component={Link} to={detailPath} size="md">
          Acompanhar
        </Button>
        <Button component={Link} to="/" size="md" variant="default">
          Voltar ao início
        </Button>
      </Group>
    </Stack>
  );
}
