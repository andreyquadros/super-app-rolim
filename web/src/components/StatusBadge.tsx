import { Badge, type BadgeProps } from "@mantine/core";
import { STATUS_META, type RequestStatus } from "@/domain/status";

interface StatusBadgeProps extends Omit<BadgeProps, "color" | "children"> {
  status: RequestStatus;
}

export function StatusBadge({ status, ...props }: StatusBadgeProps) {
  const meta = STATUS_META[status];
  return (
    <Badge color={meta.color} variant="light" {...props}>
      {meta.label}
    </Badge>
  );
}
