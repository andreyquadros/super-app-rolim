import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initNavMotion, kindForHistoryPop, setNavKind, type HistoryPop } from "./navMotion";

const pop = (over: Partial<HistoryPop>): HistoryPop => ({
  requested: null,
  leaving: "push",
  arrivalIdx: 3,
  flowOpenedFrom: undefined,
  ...over,
});

describe("kindForHistoryPop", () => {
  it("sair de uma tela empilhada desliza de volta", () => {
    expect(kindForHistoryPop(pop({ leaving: "push" }))).toBe("pop");
    expect(kindForHistoryPop(pop({ leaving: undefined }))).toBe("pop");
  });

  it("voltar a partir de uma aba usa o esmaecer das abas", () => {
    expect(kindForHistoryPop(pop({ leaving: "root" }))).toBe("tab");
    expect(kindForHistoryPop(pop({ leaving: "home" }))).toBe("tab");
  });

  it("voltar para onde o fluxo foi aberto desce o fluxo", () => {
    expect(kindForHistoryPop(pop({ leaving: "flow", arrivalIdx: 2, flowOpenedFrom: 2 }))).toBe("flow-exit");
    expect(kindForHistoryPop(pop({ leaving: "flow", arrivalIdx: 1, flowOpenedFrom: 2 }))).toBe("flow-exit");
  });

  it("um passo atrás dentro do fluxo continua sendo pop", () => {
    expect(kindForHistoryPop(pop({ leaving: "flow", arrivalIdx: 3, flowOpenedFrom: 2 }))).toBe("pop");
    expect(kindForHistoryPop(pop({ leaving: "flow", arrivalIdx: 3, flowOpenedFrom: undefined }))).toBe("pop");
  });

  it("o tipo pedido pelo app para sair do fluxo vale", () => {
    expect(kindForHistoryPop(pop({ requested: "flow-exit", leaving: "flow", arrivalIdx: 9, flowOpenedFrom: 2 }))).toBe("flow-exit");
  });
});

describe("popstate", () => {
  let dataset: Record<string, string | undefined>;
  let chrome: string | undefined;
  let historyState: { idx: number } | null;
  let onPop: (() => void) | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    dataset = {};
    chrome = "push";
    historyState = { idx: 0 };
    onPop = undefined;
    vi.stubGlobal("document", {
      documentElement: { dataset },
      querySelector: () => (chrome ? { dataset: { chrome } } : null),
    });
    vi.stubGlobal("window", {
      history: {
        get state() {
          return historyState;
        },
      },
      addEventListener: (type: string, listener: () => void) => {
        if (type === "popstate") onPop = listener;
      },
    });
    vi.stubGlobal("navigator", {});
    initNavMotion();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("fechar um fluxo aberto daqui desce a tela, mesmo pelo voltar do sistema", () => {
    historyState = { idx: 4 };
    setNavKind("flow");
    chrome = "flow";
    historyState = { idx: 4 };
    onPop?.();
    expect(dataset.nav).toBe("flow-exit");
  });

  it("o escopo da troca Farmácias|Funerárias não sobrevive ao voltar", () => {
    setNavKind("tab");
    dataset.navScope = "duty";
    chrome = "root";
    onPop?.();
    expect(dataset.nav).toBe("tab");
    expect(dataset.navScope).toBeUndefined();
  });

  it("o flow-exit pedido pelo app vale só para o popstate seguinte", () => {
    setNavKind("flow-exit");
    chrome = "push";
    onPop?.();
    expect(dataset.nav).toBe("flow-exit");
    onPop?.();
    expect(dataset.nav).toBe("pop");
  });

  it("o pedido expira se nenhum popstate chegar", () => {
    setNavKind("flow-exit");
    vi.advanceTimersByTime(1500);
    chrome = "push";
    onPop?.();
    expect(dataset.nav).toBe("pop");
  });
});
