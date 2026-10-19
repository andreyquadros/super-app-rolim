import type { Role } from "./types";

export const ROLE_LABEL: Record<Role, string> = {
  ROOT: "Administrador",
  CIVIL_SERVANT: "Servidor",
  DUTY_MANAGER: "Responsável por plantão",
};

export const ROLE_COLOR: Record<Role, string> = {
  ROOT: "barro",
  CIVIL_SERVANT: "mata",
  DUTY_MANAGER: "ipe",
};
