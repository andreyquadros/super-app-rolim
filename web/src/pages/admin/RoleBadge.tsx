import { Badge, type BadgeProps } from "@mantine/core";
import { ROLE_COLOR, ROLE_LABEL } from "@/domain/roles";
import type { Role } from "@/domain/types";

interface RoleBadgeProps extends Omit<BadgeProps, "color" | "children"> {
  role: Role;
}

/** Selo do acesso. Ipê com texto escuro (o "light" do Mantine fica claro demais em amarelo). */
export function RoleBadge({ role, ...props }: RoleBadgeProps) {
  if (role === "DUTY_MANAGER") {
    return (
      <Badge variant="filled" color="ipe.4" c="#3a2a00" tt="none" {...props}>
        {ROLE_LABEL[role]}
      </Badge>
    );
  }
  return (
    <Badge color={ROLE_COLOR[role]} tt="none" {...props}>
      {ROLE_LABEL[role]}
    </Badge>
  );
}
