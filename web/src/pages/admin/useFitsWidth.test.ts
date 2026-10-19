import { describe, expect, it } from "vitest";
import { fitsWidth } from "./useFitsWidth";

describe("fitsWidth", () => {
  it("cabe quando a área tem ao menos a largura pedida", () => {
    expect(fitsWidth(760, 47.5, 16)).toBe(true);
    expect(fitsWidth(759, 47.5, 16)).toBe(false);
  });

  it("a área de 688 px (1024 px menos o menu lateral) não comporta a tabela de pedidos", () => {
    expect(fitsWidth(688, 47.5, 16)).toBe(false);
  });

  it("com o texto em 125% a tabela pede mais espaço", () => {
    expect(fitsWidth(864, 47.5, 16)).toBe(true);
    expect(fitsWidth(864, 47.5, 20)).toBe(false);
  });

  it("usa 16 px quando o tamanho da fonte não pode ser lido", () => {
    expect(fitsWidth(760, 47.5, Number.NaN)).toBe(true);
    expect(fitsWidth(700, 47.5, 0)).toBe(false);
  });
});
