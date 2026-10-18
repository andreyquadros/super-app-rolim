import { Center, Loader, Stack, Text } from "@mantine/core";

export function LoadingScreen({ label = "Carregando…" }: { label?: string }) {
  return (
    <Center mih="50dvh" role="status" aria-live="polite">
      <Stack align="center" gap="sm">
        <Loader color="mata" type="dots" />
        <Text c="dimmed" size="sm">
          {label}
        </Text>
      </Stack>
    </Center>
  );
}
