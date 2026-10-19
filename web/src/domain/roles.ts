import type { Role } from "./types";

export const ROLE_LABEL: Record<Role, string> = {
  ROOT: "Administrador",
  CIVIL_SERVANT: "Servidor",
  DUTY_MANAGER: "Responsável por plantão",
};

/** Barro fica para problemas: o administrador usa a ardósia (neutra), o servidor o verde e o plantão o ipê. */
export const ROLE_COLOR: Record<Role, "slate" | "mata" | "ipe"> = {
  ROOT: "slate",
  CIVIL_SERVANT: "mata",
  DUTY_MANAGER: "ipe",
};
