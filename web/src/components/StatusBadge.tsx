import { Badge, type BadgeProps } from "@mantine/core";
import type { CSSProperties } from "react";
import { STATUS_META, type RequestStatus, type StatusColor } from "@/domain/status";

interface StatusBadgeProps extends Omit<BadgeProps, "color" | "children"> {
  status: RequestStatus;
}

/** Texto de selo claro com contraste AA nos dois temas (o tom padrão do Mantine fica abaixo de 4,5:1). */
export const BADGE_INK: Record<StatusColor, string> = {
  slate: "light-dark(var(--mantine-color-slate-9), var(--mantine-color-slate-2))",
  ipe: "light-dark(#3a2a00, var(--mantine-color-ipe-3))",
  mata: "light-dark(var(--mantine-color-mata-9), var(--mantine-color-mata-3))",
  barro: "light-dark(var(--mantine-color-barro-9), var(--mantine-color-barro-3))",
  gray: "light-dark(var(--mantine-color-gray-8), var(--mantine-color-gray-4))",
};

// O nome da situação nunca é cortado com reticências
const STYLES: Record<"root" | "label", CSSProperties> = {
  root: { flexShrink: 0, overflow: "visible", fontSize: "0.75rem" },
  label: { overflow: "visible", textOverflow: "clip" },
};

/**
 * Situação do pedido em texto (sem CAIXA ALTA), usada no painel.
 * "Concluída" é o único selo cheio: distingue do "Em andamento", que usa o mesmo verde.
 */
export function StatusBadge({ status, ...props }: StatusBadgeProps) {
  const meta = STATUS_META[status];
  const filled = status === "RESOLVED";
  return (
    <Badge
      color={meta.color}
      variant={filled ? "filled" : "light"}
      tt="none"
      c={filled ? undefined : BADGE_INK[meta.color]}
      styles={STYLES}
      {...props}
    >
      {meta.label}
    </Badge>
  );
}
