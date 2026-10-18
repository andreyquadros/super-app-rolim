import { Paper, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Paper p="xl" withBorder style={{ borderStyle: "dashed", background: "transparent" }}>
      <Stack align="center" gap="xs" ta="center">
        <ThemeIcon size={56} radius="xl" variant="light" color="mata">
          {icon}
        </ThemeIcon>
        <Title order={3} mt="xs">
          {title}
        </Title>
        {description && (
          <Text c="dimmed" maw={420}>
            {description}
          </Text>
        )}
        {action && <div style={{ marginTop: 8 }}>{action}</div>}
      </Stack>
    </Paper>
  );
}
