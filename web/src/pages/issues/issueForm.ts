import type { NewIssueInput } from "@/data/requests";
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

/** O pedido montado a partir do formulário (a foto entra depois, já enviada). */
export type IssueDraft = Omit<NewIssueInput, "photoPath">;

/** Monta o pedido; null quando falta o tipo ou o ponto no mapa. */
export function issueDraft(values: IssueFormValues, id: string): IssueDraft | null {
  const { category, point } = values;
  if (!category || !point) return null;
  return {
    id,
    title: values.title,
    description: values.description,
    category,
    lat: point.lat,
    lng: point.lng,
    address: {
      streetType: values.streetType,
      streetName: values.streetName,
      number: values.number || null,
      neighborhood: values.neighborhood,
      complement: values.complement || null,
    },
  };
}
