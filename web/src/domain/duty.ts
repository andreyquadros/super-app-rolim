import type { BuildingType, DutyType } from "./types";

export const DUTY_TYPES: readonly DutyType[] = ["PHARMACY", "FUNERAL"];

export interface DutyMeta {
  singular: string;
  plural: string;
  /** Caminho público da lista */
  path: string;
  /** Frase do estado "de plantão" */
  onDutyHint: string;
}

export const DUTY_META: Record<DutyType, DutyMeta> = {
  PHARMACY: { singular: "Farmácia", plural: "Farmácias", path: "/plantao/farmacias", onDutyHint: "de plantão agora" },
  FUNERAL: { singular: "Funerária", plural: "Funerárias", path: "/plantao/funerarias", onDutyHint: "de plantão agora" },
};

export const BUILDING_TYPE_LABEL: Record<BuildingType, string> = {
  PUBLIC: "Unidade pública",
  PHARMACY: "Farmácia",
  FUNERAL: "Funerária",
};

export function isDutyType(value: unknown): value is DutyType {
  return value === "PHARMACY" || value === "FUNERAL";
}

/** "/plantao/farmacias" → "PHARMACY" (caminhos em português para o cidadão). */
export function dutyTypeFromSlug(slug: string | undefined): DutyType | null {
  if (slug === "farmacias") return "PHARMACY";
  if (slug === "funerarias") return "FUNERAL";
  return null;
}
