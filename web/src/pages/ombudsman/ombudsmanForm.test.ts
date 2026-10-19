import { describe, expect, it } from "vitest";
import { initialOmbudsman, ombudsmanDraft, ombudsmanReachableStep, ombudsmanValidators, type OmbudsmanFormValues } from "./ombudsmanForm";

const TODAY = "2026-10-19";

const complete: OmbudsmanFormValues = {
  type: "compliment",
  buildingId: "ubs-centro",
  occurrenceDate: "2026-10-18",
  occurrenceTime: "14:30",
  title: "Ótimo atendimento",
  description: "Fui muito bem atendida na recepção.",
};

describe("ombudsmanReachableStep", () => {
  it("formulário novo fica no passo 1", () => {
    expect(ombudsmanReachableStep(initialOmbudsman(TODAY), TODAY)).toBe(1);
  });

  it("com o assunto escolhido, libera onde e quando", () => {
    expect(ombudsmanReachableStep({ ...initialOmbudsman(TODAY), type: "suggestion" }, TODAY)).toBe(2);
  });

  it("data no futuro segura no passo 2", () => {
    expect(ombudsmanReachableStep({ ...complete, occurrenceDate: "2026-10-20" }, TODAY)).toBe(2);
  });

  it("horário inválido segura no passo 2; vazio é aceito", () => {
    expect(ombudsmanReachableStep({ ...complete, occurrenceTime: "25:00" }, TODAY)).toBe(2);
    expect(ombudsmanReachableStep({ ...complete, occurrenceTime: "" }, TODAY)).toBe(4);
  });

  it("relato curto segura no passo 3", () => {
    expect(ombudsmanReachableStep({ ...complete, description: "ruim" }, TODAY)).toBe(3);
  });
});

describe("ombudsmanValidators", () => {
  it("mantém as mensagens de antes", () => {
    const rules = ombudsmanValidators(TODAY);
    expect(rules.type("")).toBe("Escolha o assunto");
    expect(rules.buildingId(null)).toBe("Escolha a unidade");
    expect(rules.title("oi")).toBe("Resuma em 5 a 120 caracteres");
  });
});

describe("ombudsmanDraft", () => {
  const unit = { id: "ubs-centro", name: "Unidade Básica de Saúde Centro" };

  it("leva o nome inteiro da unidade e o horário opcional", () => {
    expect(ombudsmanDraft(complete, unit)).toEqual({
      title: "Ótimo atendimento",
      description: "Fui muito bem atendida na recepção.",
      type: "compliment",
      buildingId: "ubs-centro",
      buildingName: "Unidade Básica de Saúde Centro",
      occurrenceDate: "2026-10-18",
      occurrenceTime: "14:30",
    });
    expect(ombudsmanDraft({ ...complete, occurrenceTime: "" }, unit)?.occurrenceTime).toBeNull();
  });

  it("sem o assunto não há relato", () => {
    expect(ombudsmanDraft({ ...complete, type: "" }, unit)).toBeNull();
  });
});
