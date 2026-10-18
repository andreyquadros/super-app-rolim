import { describe, expect, it } from "vitest";
import { safeNextPath } from "./AuthFrame";

const origin = "https://app.rolimdemoura.ro.gov.br";

describe("safeNextPath", () => {
  it("aceita caminhos internos com busca", () => {
    expect(safeNextPath("/protocolos?filtro=all", origin)).toBe("/protocolos?filtro=all");
  });

  it("recusa endereços externos disfarçados", () => {
    expect(safeNextPath("//evil.com", origin)).toBe("/");
    expect(safeNextPath("/\\evil.com", origin)).toBe("/");
    expect(safeNextPath("https://evil.com", origin)).toBe("/");
    expect(safeNextPath(null, origin)).toBe("/");
  });
});
