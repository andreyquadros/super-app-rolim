import { describe, expect, it } from "vitest";
import { ariaCurrentFor, NAV_ITEMS, PROFILE_ROOT, tabState, type NavKey } from "./navItems";
import { popStrategy } from "./tabHistory";

const item = (key: NavKey) => {
  const found = NAV_ITEMS.find((i) => i.key === key);
  if (!found) throw new Error(`aba ${key} não existe`);
  return found;
};

describe("tabState", () => {
  it("marca a raiz da aba como a tela atual", () => {
    expect(tabState(item("pedidos"), "/protocolos")).toBe("root");
    expect(tabState(item("avisos"), "/comunicados")).toBe("root");
    expect(tabState(item("inicio"), "/")).toBe("root");
  });

  it("detalhe empilhado deixa a aba destacada, mas não como a tela atual", () => {
    expect(tabState(item("pedidos"), "/protocolos/ouvidoria/demo-demora")).toBe("nested");
  });

  it("Farmácias e Funerárias são as duas raízes da aba Plantão", () => {
    expect(tabState(item("plantao"), "/plantao/farmacias")).toBe("root");
    expect(tabState(item("plantao"), "/plantao/funerarias")).toBe("root");
  });

  it("outras abas ficam inativas", () => {
    expect(tabState(item("inicio"), "/protocolos")).toBe("inactive");
    expect(tabState(item("pedidos"), "/plantao/farmacias")).toBe("inactive");
  });

  it("vale também para o Perfil do trilho lateral", () => {
    const profile = { isActive: (p: string) => p.startsWith(PROFILE_ROOT), isRoot: (p: string) => p === PROFILE_ROOT };
    expect(tabState(profile, "/perfil")).toBe("root");
    expect(tabState(profile, "/perfil/dados")).toBe("nested");
  });
});

describe("ariaCurrentFor", () => {
  it('usa "page" só na raiz e "true" nas telas empilhadas', () => {
    expect(ariaCurrentFor("root")).toBe("page");
    expect(ariaCurrentFor("nested")).toBe("true");
    expect(ariaCurrentFor("inactive")).toBeUndefined();
  });
});

describe("popStrategy", () => {
  it("volta no histórico quando a tela anterior é a lista da aba", () => {
    expect(popStrategy("/protocolos", "/protocolos")).toBe("back");
  });

  it("troca a tela pela lista quando se chegou por outro caminho ou por link direto", () => {
    expect(popStrategy("/", "/protocolos")).toBe("replace");
    expect(popStrategy(undefined, "/protocolos")).toBe("replace");
  });
});
