import { Alert, Paper, Skeleton, Stack, Text, Title } from "@mantine/core";
import { IconBell } from "@tabler/icons-react";
import { useAuth } from "@/auth/AuthContext";
import { EmptyState } from "@/components/EmptyState";
import { InstallCard } from "@/components/InstallCard";
import { PageHeader } from "@/components/PageHeader";
import { PushToggle } from "@/components/PushToggle";
import { formatDateTime, relativeTime } from "@/domain/format";
import { useSentNotifications } from "@/hooks/useCitizenData";

export default function NoticesPage() {
  const { user } = useAuth();
  const { data, loading, error } = useSentNotifications(50);

  return (
    <Stack gap="md">
      <PageHeader eyebrow="Prefeitura informa" title="Comunicados" description="Campanhas, avisos de serviço e alertas da prefeitura." />
      {user ? (
        <Paper withBorder p="md">
          <PushToggle />
        </Paper>
      ) : (
        <Text size="sm" c="dimmed">
          Entre na sua conta para receber os comunicados como aviso no celular.
        </Text>
      )}
      <InstallCard />
      {error && <Alert color="barro">{error}</Alert>}
      {loading ? (
        <Stack gap="sm">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} h={110} radius="lg" />
          ))}
        </Stack>
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon={<IconBell size={28} />} title="Nenhum comunicado ainda" description="Quando a prefeitura publicar, ele aparece aqui." />
      ) : (
        <Stack gap="sm" component="ol" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {(data ?? []).map((n) => (
            <Paper key={n.id} component="li" withBorder p="md">
              <Text size="xs" c="dimmed" title={formatDateTime(n.sentAt)}>
                {n.buildingName} · {relativeTime(n.sentAt)}
              </Text>
              <Title order={3} mt={4}>
                {n.title}
              </Title>
              <Text mt="xs" style={{ whiteSpace: "pre-line" }}>
                {n.body}
              </Text>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
