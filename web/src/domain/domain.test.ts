import { describe, expect, it } from "vitest";
import { CITY_CENTER } from "@/config/city";
import { categoryOf, splitStreet } from "./catalog";
import { formatCpf, formatPhone, isValidCpf, isValidPhone, maskCpf, onlyDigits } from "./documents";
import { firstName, greeting, relativeTime, toIsoDate } from "./format";
import { distanceMeters, formatDistance, isInsideMunicipality, pointInPolygon } from "./geo";
import { isProtocol, makeProtocol } from "./protocol";
import { canTransition, isOpenStatus, nextStatuses, requiresResponse } from "./status";

describe("fluxo de status", () => {
  it("segue recebida → análise → andamento → concluída", () => {
    expect(nextStatuses("RECEIVED")).toEqual(["UNDER_ANALYSIS", "REJECTED"]);
    expect(canTransition("UNDER_ANALYSIS", "IN_PROGRESS")).toBe(true);
    expect(canTransition("IN_PROGRESS", "RESOLVED")).toBe(true);
  });

  it("não permite pular etapas nem reabrir", () => {
    expect(canTransition("RECEIVED", "RESOLVED")).toBe(false);
    expect(canTransition("RESOLVED", "IN_PROGRESS")).toBe(false);
    expect(canTransition("IN_PROGRESS", "REJECTED")).toBe(false);
  });

  it("identifica status finais e exigência de justificativa", () => {
    expect(isOpenStatus("RECEIVED")).toBe(true);
    expect(isOpenStatus("CANCELED")).toBe(false);
    expect(requiresResponse("REJECTED")).toBe(true);
    expect(requiresResponse("RESOLVED")).toBe(false);
  });
});

describe("protocolo", () => {
  it("gera no formato validado pelas regras", () => {
    const protocol = makeProtocol("ZEL", new Date(2026, 9, 18));
    expect(protocol).toMatch(/^ZEL-2026-[A-Z0-9]{8}$/);
    expect(isProtocol(protocol)).toBe(true);
  });

  it("evita caracteres ambíguos", () => {
    const protocol = makeProtocol("OUV", new Date(2026, 0, 1), (n) => Array.from({ length: n }, (_, i) => i));
    expect(protocol).toBe("OUV-2026-ABCDEFGH");
    const suffix = makeProtocol("OUV", new Date(), (n) => Array.from({ length: n }, (_, i) => i * 4)).split("-")[2];
    expect(suffix).not.toMatch(/[IO01]/);
  });
});

describe("CPF e telefone", () => {
  it("valida dígitos verificadores", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("529.982.247-24")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("123")).toBe(false);
  });

  it("formata e mascara", () => {
    expect(formatCpf("52998224725")).toBe("529.982.247-25");
    expect(maskCpf("52998224725")).toBe("***.982.247-**");
    expect(onlyDigits("(69) 99999-0000")).toBe("69999990000");
  });

  it("valida e formata telefones", () => {
    expect(isValidPhone("(69) 99999-0000")).toBe(true);
    expect(isValidPhone("(69) 3442-1234")).toBe(true);
    expect(isValidPhone("(09) 99999-0000")).toBe(false);
    expect(formatPhone("69999990000")).toBe("(69) 99999-0000");
    expect(formatPhone("6934421234")).toBe("(69) 3442-1234");
  });
});

describe("geografia", () => {
  it("reconhece o centro da cidade dentro do município", () => {
    expect(isInsideMunicipality(CITY_CENTER)).toBe(true);
  });

  it("recusa Ariquemes e Porto Velho", () => {
    expect(isInsideMunicipality({ lat: -9.9133, lng: -63.0408 })).toBe(false);
    expect(isInsideMunicipality({ lat: -8.7608, lng: -63.9039 })).toBe(false);
  });

  it("ray casting num quadrado simples", () => {
    const square = [[0, 0], [10, 0], [10, 10], [0, 10]] as const;
    expect(pointInPolygon({ lat: 5, lng: 5 }, square)).toBe(true);
    expect(pointInPolygon({ lat: 15, lng: 5 }, square)).toBe(false);
  });

  it("calcula e formata distâncias", () => {
    const d = distanceMeters(CITY_CENTER, { lat: CITY_CENTER.lat + 0.01, lng: CITY_CENTER.lng });
    expect(d).toBeGreaterThan(1100);
    expect(d).toBeLessThan(1120);
    expect(formatDistance(347)).toBe("350 m");
    expect(formatDistance(1234)).toBe("1,2 km");
  });
});

describe("catálogo e formatação", () => {
  it("separa tipo e nome do logradouro", () => {
    expect(splitStreet("Avenida Norte Sul")).toEqual({ streetType: "Avenida", streetName: "Norte Sul" });
    expect(splitStreet("Av. 25 de Agosto")).toEqual({ streetType: "Avenida", streetName: "25 de Agosto" });
    expect(splitStreet("Linha 184")).toEqual({ streetType: "Linha", streetName: "184" });
    expect(splitStreet("Corredor Verde")).toEqual({ streetType: "Rua", streetName: "Corredor Verde" });
  });

  it("cai em 'outros' para categoria desconhecida", () => {
    expect(categoryOf("xyz").value).toBe("others");
    expect(categoryOf("lighting").department).toBe("Iluminação Pública");
  });

  it("formata tempo relativo, saudação e datas", () => {
    const now = new Date(2026, 9, 18, 10, 0, 0);
    expect(relativeTime(new Date(2026, 9, 15, 10, 0, 0), now)).toBe("há 3 dias");
    expect(relativeTime(new Date(2026, 9, 18, 9, 59, 40), now)).toBe("agora mesmo");
    expect(greeting(now)).toBe("Bom dia");
    expect(greeting(new Date(2026, 9, 18, 19))).toBe("Boa noite");
    expect(firstName(" Maria  Souza")).toBe("Maria");
    expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
