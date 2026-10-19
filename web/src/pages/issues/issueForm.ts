import type { IssueCategory } from "@/domain/catalog";
import { isInsideMunicipality, type LatLng } from "@/domain/geo";
import { lastReachableStep } from "./flow/steps";

export interface IssueFormValues {
  category: IssueCategory | null;
  point: LatLng | null;
  streetType: string;
  streetName: string;
  number: string;
  neighborhood: string;
  complement: string;
  title: string;
  description: string;
}

export const INITIAL_ISSUE: IssueFormValues = {
  category: null,
  point: null,
  streetType: "Rua",
  streetName: "",
  number: "",
  neighborhood: "",
  complement: "",
  title: "",
  description: "",
};

/** O problema, o local, os detalhes e a revisão. */
export const ISSUE_TOTAL_STEPS = 4;

/** Campos validados em cada passo do assistente. */
export const STEP_FIELDS: ReadonlyArray<ReadonlyArray<keyof IssueFormValues>> = [
  ["category"],
  ["point", "streetName", "neighborhood"],
  ["title", "description"],
];

export const issueValidators = {
  category: (v: IssueCategory | null) => (v ? null : "Escolha o tipo de problema"),
  point: (v: LatLng | null) => {
    if (!v) return "Marque o local no mapa";
    return isInsideMunicipality(v) ? null : "O local precisa estar dentro do município";
  },
  streetName: (v: string) => (v.trim().length >= 1 ? null : "Informe o logradouro"),
  neighborhood: (v: string) => (v.trim().length >= 2 ? null : "Informe o bairro"),
  title: (v: string) => (v.trim().length >= 5 && v.trim().length <= 120 ? null : "Resuma em 5 a 120 caracteres"),
  description: (v: string) =>
    v.trim().length >= 10 && v.trim().length <= 2000 ? null : "Descreva com pelo menos 10 caracteres",
};

/** Último passo que pode ser aberto com o que já foi preenchido. */
export function issueReachableStep(values: IssueFormValues): number {
  return lastReachableStep(values, issueValidators, STEP_FIELDS, ISSUE_TOTAL_STEPS);
}

/** "Avenida Norte Sul, 1200 – Centro" */
export function formatIssueAddress(values: Pick<IssueFormValues, "streetType" | "streetName" | "number" | "neighborhood">): string {
  const number = values.number.trim() ? `, ${values.number.trim()}` : "";
  const street = `${values.streetType} ${values.streetName.trim()}${number}`;
  const neighborhood = values.neighborhood.trim();
  return neighborhood ? `${street} – ${neighborhood}` : street;
}
