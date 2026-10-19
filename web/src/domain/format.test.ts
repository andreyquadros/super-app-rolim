import { describe, expect, it } from "vitest";
import { formatAddressLine, formatDate, formatDateTime, formatOccurrence } from "./format";

describe("datas", () => {
  const at = new Date(2026, 9, 13, 1, 1);

  it("data e data com horário usam o mesmo formato de dia", () => {
    expect(formatDate(at)).toBe("13 de out. de 2026");
    expect(formatDateTime(at)).toBe("13 de out. de 2026, às\u00a001:01");
  });

  it("sem data vira travessão", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
  });

  it("o horário não se separa do \"às\" na quebra de linha", () => {
    expect(formatDateTime(at)).toContain("às\u00a001:01");
  });

  it("dia do ocorrido no mesmo formato, com horário quando houver", () => {
    expect(formatOccurrence("2026-10-18", "14:30")).toBe("18 de out. de 2026, às\u00a014:30");
    expect(formatOccurrence("2026-10-18", "")).toBe("18 de out. de 2026");
    expect(formatOccurrence("ontem", "")).toBe("—");
    expect(formatOccurrence(null)).toBe("—");
  });
});

describe("formatAddressLine", () => {
  it("monta logradouro, número e bairro com ponto separador", () => {
    expect(formatAddressLine({ streetType: "Avenida", streetName: "Norte Sul", number: "1200", neighborhood: "Centro" })).toBe(
      "Avenida Norte Sul, 1200 · Centro",
    );
  });

  it("omite número e bairro vazios e apara espaços", () => {
    expect(formatAddressLine({ streetType: "Rua", streetName: " Exemplo ", number: " ", neighborhood: "" })).toBe("Rua Exemplo");
    expect(formatAddressLine({ streetType: "Rua", streetName: "Exemplo", number: null, neighborhood: "Centro" })).toBe("Rua Exemplo · Centro");
  });
});
