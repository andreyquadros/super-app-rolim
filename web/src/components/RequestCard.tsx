import { Group, Stack, Text, ThemeIcon, UnstyledButton } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import { Link } from "react-router";
import { categoryOf, ombudsmanTypeOf } from "@/domain/catalog";
import { relativeTime } from "@/domain/format";
import { STATUS_META } from "@/domain/status";
import type { CitizenRequest } from "@/domain/types";
import { CATEGORY_ICONS, OMBUDSMAN_ICONS } from "./icons";
import { StatusBadge } from "./StatusBadge";
import classes from "./RequestCard.module.css";

export function requestPath(request: CitizenRequest): string {
  return `/protocolos/${request.kind === "issues" ? "zeladoria" : "ouvidoria"}/${request.id}`;
}

export function requestSubtitle(request: CitizenRequest): string {
  if (request.kind === "issues") {
    const { streetType, streetName, neighborhood } = request.address;
    return `${categoryOf(request.category).label} · ${streetType} ${streetName}, ${neighborhood}`;
  }
  return `${ombudsmanTypeOf(request.type).label} · ${request.buildingName}`;
}

interface RequestCardProps {
  request: CitizenRequest;
  to?: string;
  onClick?: () => void;
}

export function RequestCard({ request, to, onClick }: RequestCardProps) {
  const Icon = request.kind === "issues" ? CATEGORY_ICONS[request.category] : OMBUDSMAN_ICONS[request.type];
  const color = STATUS_META[request.status].color;
  const content = (
    <Group wrap="nowrap" gap="md" align="flex-start">
      <ThemeIcon size={44} radius="md" variant="light" color={color}>
        <Icon size={24} stroke={1.6} />
      </ThemeIcon>
      <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <Text size="xs" className="protocol" c="dimmed">
            {request.protocol}
          </Text>
          <StatusBadge status={request.status} size="sm" />
        </Group>
        <Text fw={600} lineClamp={1}>
          {request.title}
        </Text>
        <Text size="sm" c="dimmed" lineClamp={1}>
          {requestSubtitle(request)}
        </Text>
        <Text size="xs" c="dimmed">
          Aberta {relativeTime(request.createdAt)}
        </Text>
      </Stack>
      <IconChevronRight size={18} className={classes.chevron} />
    </Group>
  );

  if (onClick) {
    return (
      <UnstyledButton className={classes.card} onClick={onClick} data-status={request.status}>
        {content}
      </UnstyledButton>
    );
  }
  return (
    <UnstyledButton component={Link} to={to ?? requestPath(request)} className={classes.card} data-status={request.status}>
      {content}
    </UnstyledButton>
  );
}
