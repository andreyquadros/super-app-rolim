import { describe, expect, it } from "vitest";
import { dutyChangeNotice, groupDutyUnits, sameDutyState, withDuty, withOpen } from "./dutyState";

const closed = { isOpen: false, isOnDuty: false };

describe("withDuty", () => {
  it("ligar o plantão também liga 'aberta'", () => {
    expect(withDuty(closed, true)).toEqual({ isOpen: true, isOnDuty: true });
  });

  it("desligar o plantão mantém 'aberta' como estava", () => {
    expect(withDuty({ isOpen: true, isOnDuty: true }, false)).toEqual({ isOpen: true, isOnDuty: false });
  });

  it("não altera o estado original", () => {
    const original = { ...closed };
    withDuty(original, true);
    expect(original).toEqual(closed);
  });
});

describe("withOpen", () => {
  it("fechar durante o plantão mantém o plantão (atende só por telefone)", () => {
    expect(withOpen({ isOpen: true, isOnDuty: true }, false)).toEqual({ isOpen: false, isOnDuty: true });
  });
});

describe("sameDutyState", () => {
  it("compara aberta e plantão", () => {
    expect(sameDutyState(closed, { isOpen: false, isOnDuty: false })).toBe(true);
    expect(sameDutyState(closed, { isOpen: true, isOnDuty: false })).toBe(false);
  });
});

describe("dutyChangeNotice", () => {
  it("avisa quando o plantão liga", () => {
    expect(dutyChangeNotice("Farmácia Centro", closed, { isOpen: true, isOnDuty: true })).toBe(
      "Plantão ligado. A cidade já vê Farmácia Centro em destaque.",
    );
  });

  it("avisa quando o plantão desliga", () => {
    expect(dutyChangeNotice("Farmácia Centro", { isOpen: true, isOnDuty: true }, { isOpen: true, isOnDuty: false })).toBe(
      "Plantão desligado. Farmácia Centro não aparece mais em destaque.",
    );
  });

  it("não avisa quando só muda 'aberta'", () => {
    expect(dutyChangeNotice("Farmácia Centro", closed, { isOpen: true, isOnDuty: false })).toBeNull();
  });
});

describe("groupDutyUnits", () => {
  const unit = (name: string, type: "PHARMACY" | "FUNERAL" | "PUBLIC") => ({ name, type });

  it("separa farmácias e funerárias e omite grupos vazios", () => {
    const groups = groupDutyUnits([unit("B", "PHARMACY"), unit("UBS", "PUBLIC"), unit("A", "PHARMACY")]);
    expect(groups).toEqual([{ type: "PHARMACY", units: [unit("B", "PHARMACY"), unit("A", "PHARMACY")] }]);
  });

  it("farmácias vêm antes das funerárias", () => {
    const groups = groupDutyUnits([unit("Paz", "FUNERAL"), unit("Centro", "PHARMACY")]);
    expect(groups.map((g) => g.type)).toEqual(["PHARMACY", "FUNERAL"]);
  });
});
