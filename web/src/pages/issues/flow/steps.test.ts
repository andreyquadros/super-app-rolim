import { describe, expect, it } from "vitest";
import { lastReachableStep, parseStep } from "./steps";

describe("parseStep", () => {
  it("aceita passos de 1 até o total", () => {
    expect(parseStep("1", 4)).toBe(1);
    expect(parseStep("4", 4)).toBe(4);
  });

  it("volta ao passo 1 com valores ausentes ou estranhos", () => {
    expect(parseStep(null, 4)).toBe(1);
    expect(parseStep("", 4)).toBe(1);
    expect(parseStep("0", 4)).toBe(1);
    expect(parseStep("5", 4)).toBe(1);
    expect(parseStep("2.5", 4)).toBe(1);
    expect(parseStep("abc", 4)).toBe(1);
  });
});

interface Values {
  kind: string;
  place: string;
  text: string;
}

const validators = {
  kind: (v: string) => (v ? null : "Escolha"),
  place: (v: string) => (v.length >= 2 ? null : "Informe o local"),
  text: (v: string) => (v.length >= 5 ? null : "Conte mais"),
};
const STEP_FIELDS: ReadonlyArray<ReadonlyArray<keyof Values>> = [["kind"], ["place"], ["text"]];

describe("lastReachableStep", () => {
  it("sem nada preenchido, só o passo 1 pode ser aberto", () => {
    expect(lastReachableStep({ kind: "", place: "", text: "" }, validators, STEP_FIELDS, 4)).toBe(1);
  });

  it("para no primeiro passo com campo inválido", () => {
    expect(lastReachableStep({ kind: "a", place: "", text: "" }, validators, STEP_FIELDS, 4)).toBe(2);
    expect(lastReachableStep({ kind: "a", place: "Centro", text: "" }, validators, STEP_FIELDS, 4)).toBe(3);
  });

  it("com tudo certo, libera a revisão (último passo)", () => {
    expect(lastReachableStep({ kind: "a", place: "Centro", text: "Poste apagado" }, validators, STEP_FIELDS, 4)).toBe(4);
  });

  it("um passo anterior inválido bloqueia os seguintes, mesmo preenchidos", () => {
    expect(lastReachableStep({ kind: "", place: "Centro", text: "Poste apagado" }, validators, STEP_FIELDS, 4)).toBe(1);
  });

  it("campos sem regra contam como válidos", () => {
    expect(lastReachableStep({ kind: "a", place: "", text: "" }, { kind: validators.kind }, STEP_FIELDS, 4)).toBe(4);
  });
});
