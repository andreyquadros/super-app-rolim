import { describe, expect, it } from "vitest";
import { chooseLayout, clampToViewport, holePath, holeRadius, inflate, intersects, unionRect, type LayoutInput, type Rect, type Typo } from "./tourGeometry";

const r = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });
const shift = (rect: Rect, dy: number): Rect => ({ ...rect, y: rect.y - dy });

/** Celular sem login, sem barra de sistema; os números vêm da tabela de medidas de DESIGN.md §11 */
function phone(vw: number, vh: number, heights: [number, number, number], over: Partial<LayoutInput>): LayoutInput {
  return {
    vw,
    vh,
    wide: false,
    barBottom: 56,
    tabTop: vh - 72,
    railRight: 0,
    insetTop: 0,
    insetBottom: 0,
    card: { w: Math.min(512, vw - 24), h: { normal: heights[0], compacto: heights[1], curto: heights[2] }, centerH: heights[0] },
    zone: "page",
    candidates: [],
    targetRadius: 24,
    calls: [],
    strictCalls: false,
    scrollY: 0,
    scrollHeight: 1500,
    ...over,
  };
}

function desktop(vw: number, vh: number, over: Partial<LayoutInput>): LayoutInput {
  return {
    vw,
    vh,
    wide: true,
    barBottom: 56,
    tabTop: vh,
    railRight: 88,
    insetTop: 0,
    insetBottom: 0,
    card: { w: Math.min(416, vw - 88 - 32), h: { normal: 246, compacto: 220, curto: 200 }, centerH: 246 },
    zone: "page",
    candidates: [],
    targetRadius: 24,
    calls: [],
    strictCalls: false,
    scrollY: 0,
    scrollHeight: 1200,
    ...over,
  };
}

function cardRect(input: LayoutInput, layout: ReturnType<typeof chooseLayout>): Rect {
  const h = layout.place === "centro" ? input.card.centerH : input.card.h[layout.typo];
  return r(layout.card.x, layout.card.y, input.card.w, h);
}

describe("retângulos", () => {
  it("une, infla e prende dentro da tela", () => {
    expect(unionRect([r(10, 20, 30, 40), r(50, 0, 10, 10)])).toEqual(r(10, 0, 50, 60));
    expect(inflate(r(10, 10, 20, 20), 8)).toEqual(r(2, 2, 36, 36));
    expect(clampToViewport(r(-10, 600, 400, 60), 360, 640)).toEqual(r(4, 600, 352, 36));
    expect(intersects(r(0, 0, 10, 10), r(10, 0, 5, 5))).toBe(false);
    expect(intersects(r(0, 0, 10, 10), r(9, 9, 5, 5))).toBe(true);
  });

  it("raio do furo: alvo + 8 entre 12 e 28; pílulas e círculos usam metade da altura", () => {
    expect(holeRadius(24, 176, 192)).toBe(28);
    expect(holeRadius(0, 100, 116)).toBe(12);
    expect(holeRadius(14, 72, 88)).toBe(22);
    expect(holeRadius(999, 40, 56)).toBe(28);
    expect(holeRadius(20, 40, 46)).toBe(23);
  });
});

describe("holePath", () => {
  const signature = (path: string) => path.replace(/[^A-Za-z]/g, "");
  const ROUNDED = "MHAVAHAVAZ";
  const EXPECTED = `MHVHZ${ROUNDED}${ROUNDED}${ROUNDED}`;

  it("tem sempre a mesma lista de comandos, inclusive com furos de tamanho zero", () => {
    const zero = { x: 100, y: 100, w: 0, h: 0, r: 0 };
    const big = { x: 20, y: 60, w: 300, h: 200, r: 28 };
    const pill = { x: 240, y: 300, w: 90, h: 56, r: 28 };
    const cases = [
      holePath(360, 640, big, [pill, zero]),
      holePath(360, 640, null, [zero, zero]),
      holePath(1024, 768, { ...big, r: 0 }, [zero, pill]),
      holePath(320, 568, { x: 4, y: 4, w: 10, h: 10, r: 40 }, [pill, pill]),
    ];
    for (const path of cases) {
      expect(path.startsWith('path(evenodd, "')).toBe(true);
      expect(signature(path.slice('path(evenodd, "'.length, -2))).toBe(EXPECTED);
    }
  });

  it("nunca usa raio maior que metade do lado", () => {
    const path = holePath(360, 640, { x: 0, y: 0, w: 20, h: 10, r: 28 }, [
      { x: 0, y: 0, w: 0, h: 0, r: 0 },
      { x: 0, y: 0, w: 0, h: 0, r: 0 },
    ]);
    expect(path).toContain("A5 5 ");
    expect(path).not.toContain("A28");
  });
});

describe("chooseLayout: medidas de referência", () => {
  it("360×640, passo 2: linhas, tipo normal, cartão embaixo (livre 243)", () => {
    const input = phone(360, 640, [301, 261, 236], {
      candidates: [r(16, 522, 328, 294), r(33, 595, 294, 214)],
      calls: [r(246, 635, 81, 49), r(246, 742, 81, 52)],
      strictCalls: true,
      scrollHeight: 1432,
    });
    const layout = chooseLayout(input);
    expect(layout).toMatchObject({ typo: "normal", place: "embaixo", candidate: 1, callCopies: false });
    expect(layout.card).toEqual({ x: 12, y: 327 });
    // O topo do furo vai para o topo da faixa livre (fundo da AppBar + 12)
    expect(layout.scrollDelta).toBe(587 - 68);
    expect(layout.hole).toEqual(r(25, 68, 310, 230));
    // Faixa livre: [68, 311]
    expect(327 - 16 - 68).toBe(243);
    for (const call of input.calls) expect(intersects(cardRect(input, layout), shift(call, layout.scrollDelta))).toBe(false);
  });

  it("medidas fracionárias (getBoundingClientRect) não derrubam o passo 2 para o centro", () => {
    const layout = chooseLayout(
      phone(375, 812, [263, 251, 226], {
        candidates: [r(16, 423.828125, 343, 294.0625), r(33, 496.515625, 309, 214.375)],
        calls: [r(261.0625, 537.265625, 80.9375, 49.1875), r(261.0625, 643.546875, 80.9375, 52)],
        strictCalls: true,
        scrollY: 98,
        scrollHeight: 1346,
      }),
    );
    // A seção inteira cabe: o maior grupo vence
    expect(layout).toMatchObject({ place: "embaixo", candidate: 0, callCopies: false, scrollDelta: 347 });
    expect(layout.hole?.y).toBeGreaterThanOrEqual(68);
  });

  it("360×640, passo 1: primeira fileira, tipo normal", () => {
    const li = [r(16, 174, 158, 176), r(186, 174, 158, 176)];
    const layout = chooseLayout(
      phone(360, 640, [300, 262, 236], { candidates: [r(16, 174, 328, 320), unionRect(li), li[0]], scrollHeight: 1432 }),
    );
    expect(layout).toMatchObject({ typo: "normal", place: "embaixo", candidate: 1 });
  });

  it("375×667 com texto grande, passo 2: linhas com texto curto (livre 325)", () => {
    const layout = chooseLayout(
      phone(375, 667, [318, 274, 246], {
        candidates: [r(16, 595, 343, 367), r(33, 673, 309, 282)],
        calls: [r(89, 768, 114, 48), r(85, 897, 114, 48)],
        strictCalls: true,
        scrollHeight: 1640,
      }),
    );
    expect(layout).toMatchObject({ typo: "curto", place: "embaixo", candidate: 1, callCopies: false });
    expect(layout.card.y).toBe(667 - 12 - 246);
    expect(layout.card.y - 16 - 68).toBe(325);
  });

  it("320×568 com texto muito grande, passo 2: centro com cópias de Ligar", () => {
    const input = phone(320, 568, [399, 346, 315], {
      card: { w: 296, h: { normal: 399, compacto: 346, curto: 315 }, centerH: 471 },
      candidates: [r(16, 674, 288, 463), r(33, 758, 254, 372)],
      calls: [r(89, 913, 119, 48), r(85, 1072, 119, 48)],
      strictCalls: true,
      scrollHeight: 1935,
    });
    const layout = chooseLayout(input);
    expect(layout).toMatchObject({ place: "centro", callCopies: true, hole: null, scrollDelta: 0, lit: [] });
    // Posições inteiras: texto nítido com transform
    expect(layout.card).toEqual({ x: 12, y: Math.round((568 - 471) / 2) });

    // Com as cópias, o texto curto: as cópias são o principal
    expect(layout.typo).toBe("curto");
  });

  it("320×568 com texto muito grande, passo 1: 1º bloco com texto curto (livre 156)", () => {
    const li = [r(16, 224, 288, 109), r(16, 345, 288, 109)];
    const layout = chooseLayout(
      phone(320, 568, [400, 350, 316], {
        card: { w: 296, h: { normal: 400, compacto: 350, curto: 316 }, centerH: 400 },
        candidates: [r(16, 224, 288, 422), unionRect(li), li[0]],
        scrollHeight: 1935,
      }),
    );
    expect(layout).toMatchObject({ typo: "curto", place: "embaixo", candidate: 2 });
    expect(layout.card.y - 16 - 68).toBe(156);
    expect(layout.scrollDelta).toBe(216 - 68);
  });

  it("768×1024, passo 2: acima do plantão (x 220, y 260)", () => {
    const layout = chooseLayout(
      desktop(768, 1024, {
        candidates: [r(104, 530, 648, 220), r(121, 585, 614, 158)],
        calls: [r(626, 605, 109, 48), r(626, 685, 109, 48)],
        strictCalls: true,
        scrollHeight: 1194,
      }),
    );
    expect(layout).toMatchObject({ place: "acima", candidate: 0, typo: "normal", scrollDelta: 0 });
    expect(layout.card).toEqual({ x: 220, y: 260 });
    expect(layout.caret).toEqual({ side: "bottom", at: 208 });
  });

  it("768×1024, passo 1: abaixo dos serviços", () => {
    const layout = chooseLayout(desktop(768, 1024, { candidates: [r(104, 326, 648, 176)], scrollHeight: 1194 }));
    expect(layout).toMatchObject({ place: "abaixo", candidate: 0 });
    expect(layout.caret?.side).toBe("top");
  });

  it("1024×768 (duas colunas), passo 2: ao lado, à esquerda (x 203, y 303), com os Ligar livres", () => {
    const input = desktop(1024, 768, {
      candidates: [r(643, 288, 365, 276), r(660, 343, 331, 214)],
      calls: [r(910, 383, 81, 49), r(910, 490, 81, 52)],
      strictCalls: true,
      scrollHeight: 867,
    });
    const layout = chooseLayout(input);
    expect(layout).toMatchObject({ place: "esquerda", candidate: 0 });
    expect(layout.card).toEqual({ x: 203, y: 303 });
    expect(layout.caret?.side).toBe("right");
    for (const call of input.calls) expect(intersects(cardRect(input, layout), call)).toBe(false);
  });

  it("1024×768, passo 1: primeira fileira, abaixo", () => {
    const li = [r(104, 326, 250, 93), r(366, 326, 250, 93)];
    const layout = chooseLayout(
      desktop(1024, 768, {
        candidates: [r(104, 326, 511, 189), unionRect(li), li[0]],
        calls: [r(910, 383, 81, 49), r(910, 490, 81, 52)],
        scrollHeight: 867,
      }),
    );
    expect(layout).toMatchObject({ place: "abaixo", candidate: 1 });
    // Os "Ligar" continuam acesos, fora do cartão
    expect(layout.lit).toEqual([0, 1]);
  });

  it("alvo no trilho: cartão à direita, com x ≥ 104", () => {
    const layout = chooseLayout(desktop(1024, 768, { zone: "rail", candidates: [r(16, 80, 56, 76)] }));
    expect(layout.place).toBe("trilho");
    expect(layout.card.x).toBe(104);
    expect(layout.card.y).toBe(12);
    expect(layout.caret?.side).toBe("left");
    expect(layout.scrollDelta).toBe(0);

    const low = chooseLayout(desktop(1024, 768, { zone: "rail", candidates: [r(8, 640, 72, 64)] }));
    expect(low.card).toEqual({ x: 104, y: Math.min(672 - 123, 768 - 12 - 246) });
  });
});

describe("chooseLayout: barras do celular", () => {
  it("Solicitar: o furo une o botão e o círculo, e o cartão fica em cima", () => {
    const button = r(144, 569, 72, 71);
    const fab = r(150, 543, 60, 60);
    const layout = chooseLayout(phone(360, 640, [280, 250, 220], { zone: "tabbar", candidates: [unionRect([button, fab])] }));
    expect(layout).toMatchObject({ place: "emcima", typo: "normal", scrollDelta: 0 });
    expect(layout.card.y).toBe(12);
    expect(layout.hole?.y).toBe(543 - 8);
    // Preso 4 px dentro da tela
    expect((layout.hole?.y ?? 0) + (layout.hole?.h ?? 0)).toBe(636);
  });

  it("Conta no celular: cartão embaixo, sem rolar", () => {
    const layout = chooseLayout(phone(360, 640, [280, 250, 220], { zone: "appbar", candidates: [r(267, 8, 81, 40)], targetRadius: 999 }));
    expect(layout).toMatchObject({ place: "embaixo", typo: "normal", scrollDelta: 0 });
    expect(layout.card.y).toBe(640 - 12 - 280);
    expect(layout.hole).toEqual(r(259, 4, 97, 52));
    expect(layout.radius).toBe(26);
  });

  it("respeita a área segura do iPhone", () => {
    const layout = chooseLayout(
      phone(390, 844, [280, 250, 220], { insetTop: 47, insetBottom: 34, barBottom: 103, tabTop: 844 - 72 - 34, zone: "appbar", candidates: [r(290, 55, 81, 40)] }),
    );
    expect(layout.card.y).toBe(844 - 12 - 34 - 280);
  });
});

describe("chooseLayout: fim da página, espiada e centro", () => {
  it("no fim da página, quando a trava deixaria o alvo sob o cartão, o cartão vai para cima", () => {
    const layout = chooseLayout(phone(360, 640, [250, 220, 200], { candidates: [r(16, 500, 328, 100)], scrollHeight: 700 }));
    expect(layout).toMatchObject({ place: "emcima", typo: "normal", scrollDelta: 60 });
    expect(layout.card.y).toBe(12);
    expect(layout.hole?.y).toBe(432);
  });

  it("espiada: alvo grande demais, com pelo menos 56 px à vista acima do cartão", () => {
    const layout = chooseLayout(
      phone(320, 568, [400, 350, 316], { card: { w: 296, h: { normal: 400, compacto: 350, curto: 316 }, centerH: 400 }, candidates: [r(16, 300, 288, 420), r(16, 300, 288, 200)] }),
    );
    expect(layout).toMatchObject({ place: "espiada", typo: "curto", candidate: 1 });
    const holeTop = layout.hole?.y ?? 0;
    expect(layout.card.y - (holeTop + 8)).toBeGreaterThanOrEqual(56);
  });

  it("centro sem furo quando nem a espiada cabe", () => {
    const layout = chooseLayout(
      phone(320, 568, [480, 470, 460], { card: { w: 296, h: { normal: 480, compacto: 470, curto: 460 }, centerH: 480 }, candidates: [r(16, 300, 288, 420)] }),
    );
    expect(layout).toMatchObject({ place: "centro", hole: null, callCopies: false, candidate: -1 });
    expect(layout.card).toEqual({ x: 12, y: 44 });
  });

  it("centro com alvo ausente, sem mudar nada na página", () => {
    const layout = chooseLayout(phone(360, 640, [280, 250, 220], { candidates: [], calls: [r(246, 300, 81, 49)] }));
    expect(layout).toMatchObject({ place: "centro", hole: null, scrollDelta: 0, candidate: -1, callCopies: false });
    // O "Ligar" fora do cartão continua aceso
    expect(layout.lit).toEqual([]);
    const free = chooseLayout(phone(360, 640, [200, 180, 160], { candidates: [], calls: [r(246, 80, 81, 49)] }));
    expect(free.lit).toEqual([0]);
  });

  it("um Ligar pela metade fora da faixa visível não acende", () => {
    const layout = chooseLayout(phone(360, 640, [200, 180, 160], { candidates: [], calls: [r(246, 540, 81, 49)] }));
    expect(layout.lit).toEqual([]);
    expect(layout.callHoles[0].w).toBe(0);
    expect(layout.callHoles[0].x).toBeCloseTo(246 + 81 / 2);
  });
});

describe("chooseLayout: propriedade do passo 2", () => {
  // Gerador determinístico (mulberry32): o teste é igual em toda execução
  function random(seed: number): () => number {
    let a = seed;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Início sintética, calibrada pelas medidas de 320, 360, 375 e 430 px nos 3 tamanhos */
  function syntheticHome(vw: number, vh: number, scale: number, rand: () => number): LayoutInput {
    const narrow = 360 / vw;
    const cardW = Math.min(32 * 16 * scale, vw - 24);
    const normal = Math.round(301 * scale * Math.pow(336 / cardW, 0.7) * (0.92 + rand() * 0.16));
    const heights: Record<Typo, number> = { normal, compacto: Math.round(normal * 0.87), curto: Math.round(normal * 0.78) };
    const oneColumn = vw / scale < 300;
    const grid = (oneColumn ? 4 * 110 : 320) * scale * Math.pow(narrow, 0.4);
    const sectionTop = Math.round(174 * scale + grid + 28 + rand() * 40);
    const rowsTop = sectionTop + Math.round(73 * scale);
    const rowsH = Math.round(214 * scale * Math.pow(narrow, 0.5) * (0.95 + rand() * 0.2));
    const callW = Math.round(81 * scale);
    const first = r(vw - 16 - callW - 17, rowsTop + Math.round(40 * scale), callW, 49);
    const second = r(vw - 16 - callW - 17, rowsTop + rowsH - Math.round(60 * scale), callW, 52);
    const sectionH = rowsH + Math.round(80 * scale);
    const scrollHeight = sectionTop + sectionH + 400 + Math.round(rand() * 600);
    const scrollY = Math.round(rand() * Math.max(0, Math.min(400, scrollHeight - vh)));
    return {
      ...phone(vw, vh, [heights.normal, heights.compacto, heights.curto], {}),
      card: { w: cardW, h: heights, centerH: Math.min(vh - 24, heights.normal + 72) },
      candidates: [shift(r(16, sectionTop, vw - 32, sectionH), scrollY), shift(r(33, rowsTop, vw - 66, rowsH), scrollY)],
      calls: [shift(first, scrollY), shift(second, scrollY)],
      strictCalls: true,
      scrollY,
      scrollHeight,
    };
  }

  it("de 320 a 430 px de largura e 568 a 900 de altura, nos 3 tamanhos, o cartão nunca cruza um Ligar", () => {
    const rand = random(2026);
    let checked = 0;
    let centered = 0;
    for (let vw = 320; vw <= 430; vw += 10) {
      for (let vh = 568; vh <= 900; vh += 24) {
        for (const scale of [1, 1.125, 1.25]) {
          for (let k = 0; k < 3; k++) {
            const input = syntheticHome(vw, vh, scale, rand);
            const layout = chooseLayout(input);
            const card = cardRect(input, layout);
            const where = `${vw}×${vh} ×${scale} #${k} → ${layout.place}/${layout.typo}`;
            // Dentro da tela
            expect(card.x, where).toBeGreaterThanOrEqual(0);
            expect(card.y, where).toBeGreaterThanOrEqual(0);
            expect(card.x + card.w, where).toBeLessThanOrEqual(vw);
            expect(card.y + card.h, where).toBeLessThanOrEqual(vh);
            if (layout.callCopies) {
              expect(layout.place, where).toBe("centro");
              centered += 1;
            } else {
              for (const call of input.calls) expect(intersects(card, shift(call, layout.scrollDelta)), where).toBe(false);
            }
            checked += 1;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
    // O modelo tem telas apertadas o bastante para cair no centro
    expect(centered).toBeGreaterThan(0);
  });
});
