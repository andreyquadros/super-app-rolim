import { describe, expect, it } from "vitest";
import { CITY_CENTER } from "@/config/city";
import { formatAddressLine } from "@/domain/format";
import { INITIAL_ISSUE, issueDraft, issueReachableStep, type IssueFormValues } from "./issueForm";

const complete: IssueFormValues = {
  ...INITIAL_ISSUE,
  category: "lighting",
  point: { lat: CITY_CENTER.lat, lng: CITY_CENTER.lng },
  streetType: "Avenida",
  streetName: "Norte Sul",
  number: "1200",
  neighborhood: "Centro",
  title: "Poste apagado na esquina",
  description: "O poste está apagado há uma semana.",
};

describe("issueReachableStep", () => {
  it("formulário vazio fica no passo 1 (?passo=3 sem dados volta ao início)", () => {
    expect(issueReachableStep(INITIAL_ISSUE)).toBe(1);
  });

  it("com o problema escolhido, libera o local", () => {
    expect(issueReachableStep({ ...INITIAL_ISSUE, category: "pavement" })).toBe(2);
  });

  it("ponto fora do município segura no passo do local", () => {
    expect(issueReachableStep({ ...complete, point: { lat: 0, lng: 0 } })).toBe(2);
  });

  it("descrição curta segura nos detalhes", () => {
    expect(issueReachableStep({ ...complete, description: "curta" })).toBe(3);
  });

  it("tudo certo libera a revisão", () => {
    expect(issueReachableStep(complete)).toBe(4);
  });
});

describe("endereço da revisão", () => {
  it("usa o mesmo formato do detalhe do pedido", () => {
    expect(formatAddressLine(complete)).toBe("Avenida Norte Sul, 1200 · Centro");
    expect(formatAddressLine({ ...complete, number: " ", neighborhood: "" })).toBe("Avenida Norte Sul");
  });
});

describe("issueDraft", () => {
  it("monta o pedido com o ponto e o endereço (opcionais vazios viram null)", () => {
    expect(issueDraft(complete, "abc")).toEqual({
      id: "abc",
      title: "Poste apagado na esquina",
      description: "O poste está apagado há uma semana.",
      category: "lighting",
      lat: CITY_CENTER.lat,
      lng: CITY_CENTER.lng,
      address: { streetType: "Avenida", streetName: "Norte Sul", number: "1200", neighborhood: "Centro", complement: null },
    });
    expect(issueDraft({ ...complete, number: "" }, "abc")?.address.number).toBeNull();
  });

  it("sem o tipo ou sem o ponto não há pedido", () => {
    expect(issueDraft({ ...complete, category: null }, "abc")).toBeNull();
    expect(issueDraft({ ...complete, point: null }, "abc")).toBeNull();
  });
});
