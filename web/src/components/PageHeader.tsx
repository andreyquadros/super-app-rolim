import { ActionIcon, Group, Stack, Text, Title } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";

interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  description?: ReactNode;
  back?: string | true;
  actions?: ReactNode;
}

export function PageHeader({ title, eyebrow, description, back, actions }: PageHeaderProps) {
  const navigate = useNavigate();
  const goBack = () => (back === true ? navigate(-1) : navigate(back ?? "/"));

  return (
    <Group justify="space-between" align="flex-start" wrap="wrap" mb="lg" gap="sm">
      <Group align="flex-start" gap="xs" wrap="nowrap">
        {back && (
          <ActionIcon size="lg" variant="subtle" color="gray" onClick={goBack} aria-label="Voltar" mt={4}>
            <IconArrowLeft size={22} />
          </ActionIcon>
        )}
        <Stack gap={4}>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <Title order={1}>{title}</Title>
          {description && (
            <Text c="dimmed" maw={560}>
              {description}
            </Text>
          )}
        </Stack>
      </Group>
      {actions && <div style={{ flexShrink: 0 }}>{actions}</div>}
    </Group>
  );
}
