import { describe, expect, it } from "vitest";
import { chooseLayout, intersects, type LayoutInput, type Rect } from "./tourGeometry";

// Preferência branda (DESIGN.md §11): entre as posições válidas de qualquer
// passada ou candidato, a que não cobre um "Ligar", sem encurtar o texto (fora
// do passo 2, só no tipo da primeira válida). Medidas reais no servidor de
// desenvolvimento (Chromium, sem login).

const r = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

/** Computador ou tablet com trilho: passo 1 (serviços), cartão de 416 px */
function step1(vw: number, vh: number, over: Partial<LayoutInput>): LayoutInput {
  return {
    vw,
    vh,
    wide: true,
    barBottom: 56,
    tabTop: vh,
    railRight: 88,
    insetTop: 0,
    insetBottom: 0,
    card: { w: 416, h: { normal: 263, compacto: 251, curto: 202 }, centerH: 263 },
    zone: "page",
    candidates: [],
    targetRadius: 0,
    calls: [],
    strictCalls: false,
    scrollY: 0,
    scrollHeight: 874,
    ...over,
  };
}

/** Os 3 grupos dos serviços (a grade, a 1ª fileira, o 1º bloco), lado a lado a partir de x */
const services = (x: number, widths: [number, number, number], h: number): Rect[] => widths.map((w) => r(x, 326, w, h));

function expectCallsFree(input: LayoutInput, layout: ReturnType<typeof chooseLayout>): void {
  for (const call of input.calls) expect(intersects(layout.box, { ...call, y: call.y - layout.scrollDelta })).toBe(false);
  expect(layout.lit).toEqual([0, 1]);
}

describe("chooseLayout: nenhum Ligar coberto quando há posição livre", () => {
  it("1366×768: a grade inteira só caberia com o cartão sobre o plantão; vai a 1ª fileira, à direita", () => {
    const input = step1(1366, 768, { candidates: services(223, [572, 280, 134], 196), calls: [r(1133, 363, 81, 49), r(1133, 443, 81, 52)] });
    const layout = chooseLayout(input);
    expect(layout).toMatchObject({ typo: "normal", place: "direita", candidate: 1, scrollDelta: 0 });
    expect(layout.card).toEqual({ x: 527, y: 293 });
    expect(layout.caret).toEqual({ side: "left", at: 131 });
    expectCallsFree(input, layout);
  });

  it("1280×800: o mesmo arranjo, sem rolar", () => {
    const input = step1(1280, 800, { candidates: services(180, [572, 280, 134], 196), calls: [r(1090, 363, 81, 49), r(1090, 443, 81, 52)] });
    const layout = chooseLayout(input);
    expect(layout).toMatchObject({ typo: "normal", place: "direita", candidate: 1, scrollDelta: 0 });
    expect(layout.card.x).toBe(484);
    expectCallsFree(input, layout);
  });

  it("768×1024: abaixo da grade inteira, deslocado para a esquerda (rente ao trilho), com a seta no centro do furo", () => {
    const input = step1(768, 1024, {
      candidates: services(104, [648, 318, 153], 176),
      calls: [r(626, 605, 109, 48), r(626, 685, 109, 48)],
      scrollHeight: 1194,
    });
    const layout = chooseLayout(input);
    // Centrado (x 220) cobriria 10 px dos Ligar (x 626); o mais à esquerda (x 40) passaria do trilho
    expect(layout).toMatchObject({ typo: "normal", place: "abaixo", candidate: 0, scrollDelta: 0 });
    expect(layout.card).toEqual({ x: 88 + 16, y: 526 });
    expect(layout.caret).toEqual({ side: "top", at: 428 - 104 });
    expectCallsFree(input, layout);
  });

  it("se toda posição válida cobre um Ligar, fica a primeira (celular 360×640, passo 1)", () => {
    const li = [r(16, 174, 158, 176), r(186, 174, 158, 176)];
    const layout = chooseLayout({
      ...step1(360, 640, {}),
      wide: false,
      tabTop: 568,
      railRight: 0,
      card: { w: 336, h: { normal: 300, compacto: 262, curto: 236 }, centerH: 300 },
      candidates: [r(16, 174, 328, 320), r(16, 174, 328, 176), li[0]],
      targetRadius: 24,
      // Depois de rolar 98 px, o 1º Ligar fica em y 537, sob o cartão em qualquer tipo
      calls: [r(246, 635, 81, 49), r(246, 742, 81, 52)],
      scrollHeight: 1432,
    });
    expect(layout).toMatchObject({ typo: "normal", place: "embaixo", candidate: 1, scrollDelta: 98 });
    expect(layout.lit).toEqual([]);
  });
});

/** Celular: o cartão de 388 px de 412×915 (sem login) */
const PHONE_412 = { vw: 412, vh: 915, wide: false, barBottom: 56, tabTop: 843, railRight: 0, insetTop: 0, insetBottom: 0 } as const;
const CARD_412 = { w: 388, h: { normal: 263, compacto: 251, curto: 202 }, centerH: 202 };

describe("chooseLayout: fora do passo 2, a preferência não encurta o texto", () => {
  it("412×915, passo 1: fica o texto normal embaixo, mesmo cobrindo o 2º Ligar (o curto o livraria)", () => {
    const layout = chooseLayout({
      ...PHONE_412,
      card: CARD_412,
      zone: "page",
      candidates: [r(16, 76.58, 380, 297.75), r(16, 76.58, 380, 153), r(16, 76.58, 184, 153)],
      targetRadius: 0,
      calls: [r(298.06, 505.64, 80.94, 49.19), r(298.06, 601.8, 80.94, 52)],
      strictCalls: false,
      scrollY: 97,
      scrollHeight: 1303,
    });
    expect(layout).toMatchObject({ typo: "normal", place: "embaixo", candidate: 0, scrollDelta: 0 });
    expect(layout.lit).toEqual([0]);
  });

  it("412×915, passo 3 (anônimo): o texto normal, com o aviso de entrar na conta", () => {
    const layout = chooseLayout({
      ...PHONE_412,
      card: CARD_412,
      zone: "tabbar",
      candidates: [r(164.8, 828.7, 82.39, 86.3)],
      targetRadius: 12,
      calls: [r(298.06, 214.64, 80.94, 49.19), r(298.06, 310.8, 80.94, 52)],
      strictCalls: false,
      scrollY: 388,
      scrollHeight: 1303,
    });
    expect(layout).toMatchObject({ typo: "normal", place: "emcima" });
    expect(layout.lit).toEqual([1]);
  });
});
