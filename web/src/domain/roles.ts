import type { Role } from "./types";

export const ROLE_LABEL: Record<Role, string> = {
  ROOT: "Administrador",
  CIVIL_SERVANT: "Servidor",
  PHARMACY_MANAGER: "Farmácia",
};

export const ROLE_COLOR: Record<Role, string> = {
  ROOT: "barro",
  CIVIL_SERVANT: "mata",
  PHARMACY_MANAGER: "ipe",
};
