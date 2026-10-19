import { describe, expect, it } from "vitest";
import type { CitizenRequest, HistoryEntry, Issue, Ombudsman } from "@/domain/types";
import {
  canCancel,
  filterRequests,
  groupRequests,
  issueAddressLine,
  latestResponse,
  parseRequestFilter,
  shareText,
} from "./requestModel";

const day = (n: number) => new Date(2026, 9, n, 10, 0);

function issue(id: string, status: Issue["status"], extra: Partial<Issue> = {}): Issue {
  return {
    id,
    kind: "issues",
    protocol: `ZEL-2026-${id.toUpperCase()}`,
    title: `Pedido ${id}`,
    description: "Relato",
    status,
    citizenId: "u1",
    citizenName: "Maria",
    lastResponse: null,
    createdAt: day(1),
    updatedAt: day(1),
    statusChangedAt: day(1),
    category: "lighting",
    department: "Iluminação Pública",
    lat: -11.7,
    lng: -61.7,
    address: { streetType: "Rua", streetName: "da Escola", number: "300", neighborhood: "Centro", complement: null },
    photoPath: null,
    ...extra,
  };
}

function ombudsman(id: string, status: Ombudsman["status"]): Ombudsman {
  return {
    id,
    kind: "ombudsman",
    protocol: `OUV-2026-${id.toUpperCase()}`,
    title: `Ouvidoria ${id}`,
    description: "Relato",
    status,
    citizenId: "u1",
    citizenName: "Maria",
    lastResponse: null,
    createdAt: day(2),
    updatedAt: day(2),
    statusChangedAt: day(2),
    type: "compliment",
    buildingId: "ubs",
    buildingName: "UBS Centro",
    occurrenceDate: "2026-10-10",
    occurrenceTime: null,
  };
}

function entry(to: HistoryEntry["to"], at: Date, officialResponse: string | null = null): HistoryEntry {
  return { id: to, from: "RECEIVED", to, officialResponse, byUid: "s1", byName: "Ana", at };
}

describe("filtro de Meus pedidos", () => {
  it("lê o ?filtro= em português, aceita os valores antigos e cai em 'Em aberto'", () => {
    expect(parseRequestFilter(null)).toBe("aberto");
    expect(parseRequestFilter("todos")).toBe("todos");
    expect(parseRequestFilter("ouvidoria")).toBe("ouvidoria");
    expect(parseRequestFilter("all")).toBe("todos");
    expect(parseRequestFilter("issues")).toBe("zeladoria");
    expect(parseRequestFilter("qualquer-coisa")).toBe("aberto");
  });

  it("filtra por situação e por tipo sem alterar a lista original", () => {
    const list: CitizenRequest[] = [issue("a", "IN_PROGRESS"), issue("b", "RESOLVED"), ombudsman("c", "RECEIVED"), ombudsman("d", "CANCELED")];
    const snapshot = [...list];
    expect(filterRequests(list, "aberto").map((r) => r.id)).toEqual(["a", "c"]);
    expect(filterRequests(list, "todos")).toHaveLength(4);
    expect(filterRequests(list, "zeladoria").map((r) => r.id)).toEqual(["a", "b"]);
    expect(filterRequests(list, "ouvidoria").map((r) => r.id)).toEqual(["c", "d"]);
    expect(list).toEqual(snapshot);
  });

  it("separa em andamento de concluídos e encerrados, mantendo a ordem", () => {
    const groups = groupRequests([issue("a", "RESOLVED"), issue("b", "RECEIVED"), issue("c", "REJECTED"), issue("d", "UNDER_ANALYSIS")]);
    expect(groups.open.map((r) => r.id)).toEqual(["b", "d"]);
    expect(groups.closed.map((r) => r.id)).toEqual(["a", "c"]);
  });
});

describe("detalhe do pedido", () => {
  it("mostra a resposta mais recente do histórico, com a data", () => {
    const request = issue("a", "IN_PROGRESS", { lastResponse: "Resposta nova" });
    const history = [entry("UNDER_ANALYSIS", day(3), "Resposta antiga"), entry("IN_PROGRESS", day(5), "Resposta nova")];
    expect(latestResponse(request, history)).toEqual({ text: "Resposta nova", at: day(5) });
  });

  it("usa a última resposta do pedido enquanto o histórico não chegou", () => {
    expect(latestResponse(issue("a", "REJECTED", { lastResponse: "Fora da área urbana" }), [])).toEqual({ text: "Fora da área urbana", at: null });
    expect(latestResponse(issue("a", "RECEIVED"), [])).toBeNull();
  });

  it("só deixa cancelar enquanto o pedido está recebido (regra do Firestore)", () => {
    expect(canCancel(issue("a", "RECEIVED"))).toBe(true);
    expect(canCancel(issue("a", "UNDER_ANALYSIS"))).toBe(false);
    expect(canCancel(issue("a", "CANCELED"))).toBe(false);
  });

  it("monta o endereço e o texto para compartilhar", () => {
    expect(issueAddressLine(issue("a", "RECEIVED"))).toBe("Rua da Escola, 300 · Centro");
    expect(issueAddressLine(issue("a", "RECEIVED", { address: { streetType: "Rua", streetName: "Exemplo", number: null, neighborhood: "", complement: null } }))).toBe(
      "Rua Exemplo",
    );
    expect(shareText("Poste apagado", "ZEL-2026-K7Q2MX9P")).toBe("Meu pedido no SUPER APP Rolim de Moura: Poste apagado. Protocolo ZEL-2026-K7Q2MX9P.");
  });
});
