import { Paper, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Nível do título: 2 quando não há outro h2 antes (telas das abas) */
  order?: 2 | 3 | 4;
}

export function EmptyState({ icon, title, description, action, order = 3 }: EmptyStateProps) {
  return (
    <Paper p="xl" withBorder style={{ borderStyle: "dashed", background: "transparent" }}>
      <Stack align="center" gap="xs" ta="center">
        <ThemeIcon size={56} radius="xl" variant="light" color="mata">
          {icon}
        </ThemeIcon>
        <Title order={order} mt="xs">
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
