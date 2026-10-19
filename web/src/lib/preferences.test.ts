import { describe, expect, it } from "vitest";
import { parseTextSize } from "./preferences";

describe("tamanho do texto", () => {
  it("aceita os valores conhecidos e volta ao normal nos demais", () => {
    expect(parseTextSize("grande")).toBe("grande");
    expect(parseTextSize("muito-grande")).toBe("muito-grande");
    expect(parseTextSize("enorme")).toBe("normal");
    expect(parseTextSize(null)).toBe("normal");
  });
});
