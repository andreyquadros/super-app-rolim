// Regras puras dos fluxos em passos (?passo=N): leitura do parâmetro e
// até onde a pessoa pode ir com o que já preencheu.

/** Regra de validação no formato do @mantine/form (null = válido). */
type Rule<T, K extends keyof T> = (value: T[K], values: T) => unknown;

export type StepValidators<T> = { [K in keyof T]?: Rule<T, K> };

/** Lê ?passo=N; qualquer valor fora de 1..total vira 1. */
export function parseStep(raw: string | null, total: number): number {
  const step = Number(raw);
  return Number.isInteger(step) && step >= 1 && step <= total ? step : 1;
}

/** O campo passa nas regras? (sem regra = sempre válido) */
function fieldValid<T>(values: T, validators: StepValidators<T>, field: keyof T): boolean {
  const rule = validators[field] as Rule<T, keyof T> | undefined;
  return rule ? rule(values[field], values) == null : true;
}

/**
 * Último passo que pode ser aberto: o primeiro com algum campo inválido
 * (a pessoa precisa resolver ali antes de seguir) ou `total` quando tudo
 * o que vem antes da revisão está certo.
 */
export function lastReachableStep<T>(
  values: T,
  validators: StepValidators<T>,
  stepFields: ReadonlyArray<ReadonlyArray<keyof T>>,
  total: number,
): number {
  const incomplete = stepFields.findIndex((fields) => fields.some((field) => !fieldValid(values, validators, field)));
  return incomplete === -1 ? total : Math.min(incomplete + 1, total);
}
