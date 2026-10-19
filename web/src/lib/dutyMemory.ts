import type { DutyType } from "@/domain/types";
import { DUTY_META } from "@/domain/duty";

// Último tipo de plantão visto nesta sessão: a aba "Plantão" volta para ele.
const KEY = "rolim.plantao";

export function rememberDutyType(type: DutyType): void {
  try {
    window.sessionStorage.setItem(KEY, type);
  } catch {
    // sem armazenamento de sessão: a aba abre em farmácias
  }
}

export function lastDutyPath(): string {
  try {
    return window.sessionStorage.getItem(KEY) === "FUNERAL" ? DUTY_META.FUNERAL.path : DUTY_META.PHARMACY.path;
  } catch {
    return DUTY_META.PHARMACY.path;
  }
}
