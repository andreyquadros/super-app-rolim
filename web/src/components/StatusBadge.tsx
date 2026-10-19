import { Badge, type BadgeProps } from "@mantine/core";
import { STATUS_META, type RequestStatus } from "@/domain/status";

interface StatusBadgeProps extends Omit<BadgeProps, "color" | "children"> {
  status: RequestStatus;
}

// Texto escuro sobre o ipê claro (o tom padrão do Mantine fica sem contraste)
const IPE_TEXT = "light-dark(#3a2a00, var(--mantine-color-ipe-3))";

/** Situação do pedido em texto (sem CAIXA ALTA), usada no painel. */
export function StatusBadge({ status, ...props }: StatusBadgeProps) {
  const meta = STATUS_META[status];
  return (
    <Badge color={meta.color} variant="light" tt="none" c={meta.color === "ipe" ? IPE_TEXT : undefined} {...props}>
      {meta.label}
    </Badge>
  );
}
