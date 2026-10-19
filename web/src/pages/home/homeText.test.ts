import { describe, expect, it } from "vitest";
import type { Building, CitizenRequest, Issue } from "@/domain/types";
import {
  callablePhone,
  chooseInvite,
  dutyCountLabel,
  dutyTileTarget,
  greetingParts,
  homeGreeting,
  latestUpdate,
  longDate,
  openRequestsPreview,
  pickOnDuty,
} from "./homeText";

const NIGHT = new Date(2026, 9, 19, 21, 0);
const MORNING = new Date(2026, 9, 19, 8, 0);

function unit(name: string, extra: Partial<Building> = {}): Building {
  return {
    id: name,
    name,
    type: "PHARMACY",
    address: "Av. Norte Sul, 1200",
    lat: -11.72,
    lng: -61.77,
    isOpen: true,
    isOnDuty: false,
    ownerIds: [],
    phones: [],
    openingHours: null,
    active: true,
    updatedAt: null,
    ...extra,
  };
}

function request(id: string, extra: Partial<Issue> = {}): CitizenRequest {
  return {
    kind: "issues",
    id,
    protocol: `ZEL-${id}`,
    title: `Pedido ${id}`,
    description: "",
    status: "RECEIVED",
    citizenId: "u1",
    citizenName: "Maria",
    lastResponse: null,
    createdAt: new Date(2026, 9, 1),
    updatedAt: null,
    statusChangedAt: null,
    category: "pavement",
    department: "obras",
    lat: 0,
    lng: 0,
    address: { streetType: "Rua", streetName: "da Escola", number: null, neighborhood: "Centro", complement: null },
    photoPath: null,
    ...extra,
  };
}

describe("cabeçalho da Início", () => {
  it("escreve a data por extenso com inicial maiúscula", () => {
    expect(longDate(NIGHT)).toBe("Segunda-feira, 19 de outubro");
  });

  it("cumprimenta pelo primeiro nome conforme a hora", () => {
    expect(homeGreeting({ loading: false, signedIn: true, name: "Maria" }, NIGHT)).toBe("Boa noite, Maria.");
    expect(homeGreeting({ loading: false, signedIn: true, name: "Maria" }, MORNING)).toBe("Bom dia, Maria.");
  });

  it("acolhe quem não entrou e não pisca enquanto carrega", () => {
    expect(homeGreeting({ loading: false, signedIn: false, name: "" }, NIGHT)).toBe("Olá! Que bom ter você aqui.");
    expect(homeGreeting({ loading: true, signedIn: false, name: "" }, NIGHT)).toBe("Boa noite!");
    expect(homeGreeting({ loading: false, signedIn: true, name: "" }, NIGHT)).toBe("Boa noite!");
  });

  it("separa o cumprimento (que não quebra) do nome", () => {
    expect(greetingParts("Boa noite, Maria.")).toEqual({ lead: "Boa noite,", rest: " Maria." });
    expect(greetingParts("Olá! Que bom ter você aqui.")).toEqual({ lead: "Olá!", rest: " Que bom ter você aqui." });
    expect(greetingParts("Boa noite!")).toEqual({ lead: "Boa noite!", rest: "" });
    expect(greetingParts("Bem-vindo")).toEqual({ lead: "Bem-vindo", rest: "" });
  });
});

describe("plantão na Início", () => {
  it("mostra a contagem ao vivo ou o texto de reserva", () => {
    expect(dutyCountLabel(1, "Ver abertas")).toBe("1 de plantão agora");
    expect(dutyCountLabel(3, "Ver abertas")).toBe("3 de plantão agora");
    expect(dutyCountLabel(0, "Ver lista")).toBe("Ver lista");
  });

  it("só manda para o filtro de reserva quando o servidor disse que ninguém está de plantão", () => {
    const path = "/plantao/farmacias";
    const ok = { loading: false, error: null };
    expect(dutyTileTarget({ ...ok, data: [unit("A")] }, path, "abertas")).toBe(`${path}?filtro=abertas`);
    expect(dutyTileTarget({ ...ok, data: [unit("A", { isOnDuty: true })] }, path, "abertas")).toBe(path);
    // Carregando ou sem resposta (lista vazia do cache): não afirma que ninguém está de plantão
    expect(dutyTileTarget({ loading: true, error: null, data: [] }, path, "abertas")).toBe(path);
    expect(dutyTileTarget({ loading: false, error: "Sem conexão", data: [] }, path, "abertas")).toBe(path);
  });

  it("escolhe a de plantão mais perto e conta as demais", () => {
    const list = [unit("B", { isOnDuty: true }), unit("A"), unit("C", { isOnDuty: true })];
    expect(pickOnDuty(list)).toEqual({ first: list[0], others: 1 });
    const near = pickOnDuty(list, (u) => (u.name === "C" ? 100 : 900));
    expect(near.first?.name).toBe("C");
    expect(pickOnDuty([unit("A")])).toEqual({ first: null, others: 0 });
  });

  it("acha a atualização mais recente", () => {
    const old = new Date(2026, 9, 18);
    const recent = new Date(2026, 9, 19);
    expect(latestUpdate([unit("A", { updatedAt: old }), unit("B", { updatedAt: recent }), unit("C")])).toBe(recent);
    expect(latestUpdate([unit("A")])).toBeNull();
  });

  it("liga para o primeiro telefone que não é só WhatsApp", () => {
    expect(
      callablePhone([
        { type: "WHATSAPP", number: "(69) 99999-1001" },
        { type: "LANDLINE", number: "(69) 3442-0001" },
      ]),
    ).toBe("tel:6934420001");
    expect(callablePhone([{ type: "WHATSAPP", number: "69999991001" }])).toBe("tel:69999991001");
    expect(callablePhone([])).toBeNull();
  });
});

describe("pedidos na Início", () => {
  it("mostra até 2 em andamento, o que mudou por último primeiro", () => {
    const list = [
      request("1", { statusChangedAt: new Date(2026, 9, 2) }),
      request("2", { status: "RESOLVED", statusChangedAt: new Date(2026, 9, 18) }),
      request("3", { status: "IN_PROGRESS", statusChangedAt: new Date(2026, 9, 15) }),
      request("4", { status: "UNDER_ANALYSIS", statusChangedAt: new Date(2026, 9, 10) }),
    ];
    expect(openRequestsPreview(list).map((r) => r.id)).toEqual(["3", "4"]);
    expect(list.map((r) => r.id)).toEqual(["1", "2", "3", "4"]);
  });
});

describe("convite da Início", () => {
  const base = {
    installable: false,
    installDismissed: false,
    signedIn: true,
    canPush: true,
    hasRequests: true,
    pushDismissed: false,
  };

  it("mostra um convite por vez, instalar antes dos avisos", () => {
    expect(chooseInvite({ ...base, installable: true })).toBe("install");
    expect(chooseInvite(base)).toBe("push");
    expect(chooseInvite({ ...base, installable: true, installDismissed: true })).toBe("push");
  });

  it("só oferece avisos a quem entrou, já fez pedido e não dispensou", () => {
    expect(chooseInvite({ ...base, signedIn: false })).toBeNull();
    expect(chooseInvite({ ...base, hasRequests: false })).toBeNull();
    expect(chooseInvite({ ...base, canPush: false })).toBeNull();
    expect(chooseInvite({ ...base, pushDismissed: true })).toBeNull();
  });
});
