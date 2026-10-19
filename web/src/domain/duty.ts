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

export type DutyFilter = "plantao" | "abertas" | "todas";

interface DutyLike {
  name: string;
  isOpen: boolean;
  isOnDuty: boolean;
  lat: number;
  lng: number;
  updatedAt: Date | null;
}

export function isDutyFilter(value: unknown): value is DutyFilter {
  return value === "plantao" || value === "abertas" || value === "todas";
}

export function dutyCounts(list: readonly DutyLike[]): Record<DutyFilter, number> {
  return {
    plantao: list.filter((u) => u.isOnDuty).length,
    abertas: list.filter((u) => u.isOpen || u.isOnDuty).length,
    todas: list.length,
  };
}

export function filterDuty<T extends DutyLike>(list: readonly T[], filter: DutyFilter): T[] {
  if (filter === "plantao") return list.filter((u) => u.isOnDuty);
  if (filter === "abertas") return list.filter((u) => u.isOpen || u.isOnDuty);
  return [...list];
}

const rank = (u: DutyLike) => (u.isOnDuty ? 0 : u.isOpen ? 1 : 2);

/**
 * Plantão primeiro, depois abertas, depois fechadas; dentro de cada grupo,
 * a mais perto (se houver localização) e depois o nome.
 */
export function sortDuty<T extends DutyLike>(list: readonly T[], distanceOf?: (u: T) => number | null): T[] {
  return [...list].sort((a, b) => {
    const byRank = rank(a) - rank(b);
    if (byRank !== 0) return byRank;
    const da = distanceOf?.(a) ?? null;
    const db = distanceOf?.(b) ?? null;
    if (da !== null && db !== null && da !== db) return da - db;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

const STALE_AFTER_MS = 24 * 3600 * 1000;

/** Informação de plantão sem atualização há mais de 24 h. */
export function isStale(updatedAt: Date | null, now: Date = new Date()): boolean {
  return updatedAt === null || now.getTime() - updatedAt.getTime() > STALE_AFTER_MS;
}

export interface DutyCopy {
  title: string;
  hint: string;
  openLabel: string;
  closedLabel: string;
  empty: string;
  whatsappText: string;
}

export const DUTY_COPY: Record<DutyType, DutyCopy> = {
  PHARMACY: {
    title: "Farmácias de plantão",
    hint: "Informado pelas próprias farmácias. Ligue antes para confirmar.",
    openLabel: "Aberta agora",
    closedLabel: "Fechada",
    empty: "Nenhuma farmácia informou plantão agora",
    whatsappText: "Olá! Vi no SUPER APP Rolim de Moura que vocês estão de plantão.",
  },
  FUNERAL: {
    title: "Funerárias de plantão",
    hint: "Informado pelas próprias funerárias. Quando estão de plantão, atendem por telefone a qualquer hora.",
    openLabel: "Atendendo agora",
    closedLabel: "Fora do horário",
    empty: "Nenhuma funerária informou plantão agora",
    whatsappText: "Olá! Vi no SUPER APP Rolim de Moura que vocês estão de plantão.",
  },
};
