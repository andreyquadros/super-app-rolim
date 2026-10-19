import { describe, expect, it } from "vitest";
import { safeNextPath, withNext } from "./nextPath";

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

  it("usa o destino de reserva informado", () => {
    expect(safeNextPath("javascript:alert(1)", origin, "/perfil")).toBe("/perfil");
  });
});

describe("withNext", () => {
  it("não acrescenta ?next quando o destino é a Início", () => {
    expect(withNext("/cadastro", "/")).toBe("/cadastro");
  });

  it("codifica o destino com busca", () => {
    expect(withNext("/cadastro", "/protocolos?filtro=all")).toBe("/cadastro?next=%2Fprotocolos%3Ffiltro%3Dall");
  });
});
