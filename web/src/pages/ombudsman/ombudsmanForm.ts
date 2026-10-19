import type { NewOmbudsmanInput } from "@/data/requests";
import type { OmbudsmanType } from "@/domain/catalog";
import type { Building } from "@/domain/types";
import { lastReachableStep } from "@/pages/issues/flow/steps";

export interface OmbudsmanFormValues {
  type: OmbudsmanType | "";
  buildingId: string | null;
  occurrenceDate: string;
  occurrenceTime: string;
  title: string;
  description: string;
}

/** O assunto, onde e quando, o relato e a revisão. */
export const OMBUDSMAN_TOTAL_STEPS = 4;

/** Campos validados em cada passo do assistente. */
export const OMBUDSMAN_STEP_FIELDS: ReadonlyArray<ReadonlyArray<keyof OmbudsmanFormValues>> = [
  ["type"],
  ["buildingId", "occurrenceDate", "occurrenceTime"],
  ["title", "description"],
];

export function initialOmbudsman(today: string): OmbudsmanFormValues {
  return { type: "", buildingId: null, occurrenceDate: today, occurrenceTime: "", title: "", description: "" };
}

/** Regras do formulário; `today` no formato AAAA-MM-DD limita a data do ocorrido. */
export function ombudsmanValidators(today: string) {
  return {
    type: (v: OmbudsmanType | "") => (v ? null : "Escolha o assunto"),
    buildingId: (v: string | null) => (v ? null : "Escolha a unidade"),
    occurrenceDate: (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) && v <= today ? null : "Informe uma data até hoje"),
    occurrenceTime: (v: string) => (!v || /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? null : "Horário inválido"),
    title: (v: string) => (v.trim().length >= 5 && v.trim().length <= 120 ? null : "Resuma em 5 a 120 caracteres"),
    description: (v: string) => (v.trim().length >= 10 ? null : "Descreva com pelo menos 10 caracteres"),
  };
}

/** Último passo que pode ser aberto com o que já foi preenchido. */
export function ombudsmanReachableStep(values: OmbudsmanFormValues, today: string): number {
  return lastReachableStep(values, ombudsmanValidators(today), OMBUDSMAN_STEP_FIELDS, OMBUDSMAN_TOTAL_STEPS);
}

/** Monta o relato; null quando falta o assunto. */
export function ombudsmanDraft(values: OmbudsmanFormValues, unit: Pick<Building, "id" | "name">): NewOmbudsmanInput | null {
  if (!values.type) return null;
  return {
    title: values.title,
    description: values.description,
    type: values.type,
    buildingId: unit.id,
    buildingName: unit.name,
    occurrenceDate: values.occurrenceDate,
    occurrenceTime: values.occurrenceTime || null,
  };
}
