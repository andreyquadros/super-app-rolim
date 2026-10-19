import { Badge, type BadgeProps } from "@mantine/core";
import { BADGE_INK } from "@/components/StatusBadge";
import { ROLE_COLOR, ROLE_LABEL } from "@/domain/roles";
import type { Role } from "@/domain/types";
import classes from "./admin.module.css";

interface RoleBadgeProps extends Omit<BadgeProps, "color" | "children"> {
  role: Role;
}

// Rótulos longos ("Responsável por plantão") quebram a linha em vez de ganhar reticências
const WRAP = { root: classes.wrapBadge, label: classes.wrapBadgeLabel };

/** Selo do acesso. Ipê cheio com texto escuro (o "light" do Mantine fica claro demais em amarelo). */
export function RoleBadge({ role, ...props }: RoleBadgeProps) {
  const ipe = role === "DUTY_MANAGER";
  return (
    <Badge
      variant={ipe ? "filled" : "light"}
      color={ipe ? "ipe.4" : ROLE_COLOR[role]}
      c={ipe ? "#3a2a00" : BADGE_INK[ROLE_COLOR[role]]}
      tt="none"
      classNames={WRAP}
      {...props}
    >
      {ROLE_LABEL[role]}
    </Badge>
  );
}
