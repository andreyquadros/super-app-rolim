import { DUTY_TYPES } from "@/domain/duty";
import type { BuildingType, DutyType } from "@/domain/types";

/** O que o responsável liga e desliga no painel. */
export interface DutyState {
  isOpen: boolean;
  isOnDuty: boolean;
}

export function withOpen(state: DutyState, isOpen: boolean): DutyState {
  return { ...state, isOpen };
}

/** Ligar o plantão também liga "aberta"; desligar mantém "aberta" como estava. */
export function withDuty(state: DutyState, isOnDuty: boolean): DutyState {
  return { isOnDuty, isOpen: isOnDuty ? true : state.isOpen };
}

export function sameDutyState(a: DutyState, b: DutyState): boolean {
  return a.isOpen === b.isOpen && a.isOnDuty === b.isOnDuty;
}

/** Aviso mostrado quando o plantão muda (o "aberta" sozinho não gera aviso). */
export function dutyChangeNotice(name: string, prev: DutyState, next: DutyState): string | null {
  if (!prev.isOnDuty && next.isOnDuty) return `Plantão ligado. A cidade já vê ${name} em destaque.`;
  if (prev.isOnDuty && !next.isOnDuty) return `Plantão desligado. ${name} não aparece mais em destaque.`;
  return null;
}

export interface DutyGroup<T> {
  type: DutyType;
  units: T[];
}

/** Farmácias e depois funerárias, sem grupos vazios (a ordem de cada lista é mantida). */
export function groupDutyUnits<T extends { type: BuildingType }>(units: readonly T[]): DutyGroup<T>[] {
  return DUTY_TYPES.map((type) => ({ type, units: units.filter((u) => u.type === type) })).filter((g) => g.units.length > 0);
}
