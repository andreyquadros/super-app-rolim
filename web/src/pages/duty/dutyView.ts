import { DUTY_COPY, DUTY_META, type DutyFilter } from "@/domain/duty";
import type { Building, DutyType } from "@/domain/types";

export interface FilterOption {
  value: DutyFilter;
  label: string;
}

/**
 * Rótulos dos chips de filtro. Sem `counts` (lista ainda chegando ou com erro)
 * não mostra número: um "(0)" ali diria que não há nenhuma de plantão.
 */
export function filterOptions(type: DutyType, counts: Record<DutyFilter, number> | null): FilterOption[] {
  const label = (text: string, value: DutyFilter) => (counts ? `${text} (${counts[value]})` : text);
  return [
    { value: "plantao", label: label("De plantão", "plantao") },
    { value: "abertas", label: label(type === "FUNERAL" ? "Atendendo agora" : "Abertas agora", "abertas") },
    { value: "todas", label: label("Todas", "todas") },
  ];
}

export function emptyTitle(type: DutyType, filter: DutyFilter): string {
  if (filter === "plantao") return DUTY_COPY[type].empty;
  const noun = DUTY_META[type].singular.toLowerCase();
  if (filter === "abertas") return type === "FUNERAL" ? `Nenhuma ${noun} atendendo agora` : `Nenhuma ${noun} aberta agora`;
  return `Ainda não há ${DUTY_META[type].plural.toLowerCase()} cadastradas`;
}

/** O "Atualizado há…" da lista: o maior updatedAt. */
export function latestUpdate(list: readonly Pick<Building, "updatedAt">[]): Date | null {
  return list.reduce<Date | null>((max, u) => (u.updatedAt && (!max || u.updatedAt > max) ? u.updatedAt : max), null);
}

/** Cores dos marcadores do mapa (as mesmas da legenda). */
export const MARKER_COLOR = { duty: "#ffbb36", open: "#14874c", closed: "#868e96" } as const;

export function markerColor(unit: Pick<Building, "isOnDuty" | "isOpen">): string {
  if (unit.isOnDuty) return MARKER_COLOR.duty;
  return unit.isOpen ? MARKER_COLOR.open : MARKER_COLOR.closed;
}
