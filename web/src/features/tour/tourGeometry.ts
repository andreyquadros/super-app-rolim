// Geometria do passeio (pura): furo no véu, raio, caminho do clip-path e a
// escolha de onde o cartão fica. Tudo em pixels da janela (getBoundingClientRect).

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Hole extends Rect {
  r: number;
}

export type Typo = "normal" | "compacto" | "curto";
export const TYPOS: readonly Typo[] = ["normal", "compacto", "curto"];
/** Onde está o alvo: na página (rola) ou numa barra fixa */
export type Zone = "page" | "tabbar" | "appbar" | "rail";
export type Place = "embaixo" | "emcima" | "abaixo" | "acima" | "esquerda" | "direita" | "trilho" | "espiada" | "centro";
export type CaretSide = "top" | "bottom" | "left" | "right";

export interface LayoutInput {
  vw: number;
  vh: number;
  /** ≥ 48em: cartão ancorado, com seta */
  wide: boolean;
  /** Fundo da AppBar (cresce com a faixa "Sem internet") */
  barBottom: number;
  /** Topo da TabBar visível (ou vh) */
  tabTop: number;
  /** Borda direita do trilho visível (ou 0) */
  railRight: number;
  insetTop: number;
  insetBottom: number;
  card: {
    w: number;
    h: Readonly<Record<Typo, number>>;
    /** Altura atual (modo centro, com as cópias) */
    centerH: number;
  };
  zone: Zone;
  /** Grupos do alvo, do maior para o menor; vazio = alvo ausente */
  candidates: readonly Rect[];
  /** border-radius do alvo */
  targetRadius: number;
  /** "Ligar" da Início (até 2) */
  calls: readonly Rect[];
  /** Passo 2: o cartão nunca cobre um "Ligar" (senão, centro com cópias) */
  strictCalls: boolean;
  scrollY: number;
  scrollHeight: number;
}

export interface Layout {
  typo: Typo;
  place: Place;
  /** Índice do grupo destacado; -1 no centro */
  candidate: number;
  scrollDelta: number;
  /** Furo principal, já na posição depois da rolagem */
  hole: Rect | null;
  radius: number;
  card: { x: number; y: number };
  caret: { side: CaretSide; at: number } | null;
  callCopies: boolean;
  /** "Ligar" acesos: inteiros na faixa visível, fora do cartão e fora do furo */
  lit: number[];
  /** As 2 vagas de "Ligar" no véu (tamanho zero, no centro do link, quando apagadas) */
  callHoles: [Hole, Hole];
  /** O cartão na posição escolhida (largura e altura do tipo) */
  box: Rect;
}

const GAP = 16;
/** Folga das bordas e das barras (também a do foco de saída, em HomeTour) */
export const EDGE = 12;
const PAD = 8;
const PEEK_MIN = 56;
const CARET_MIN = 28;
const MAX_R = 28;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const bottom = (rect: Rect) => rect.y + rect.h;
const right = (rect: Rect) => rect.x + rect.w;
const moved = (rect: Rect, delta: number): Rect => ({ ...rect, y: rect.y - delta });
const center = (rect: Rect): Hole => ({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2, w: 0, h: 0, r: 0 });

export function unionRect(rects: readonly Rect[]): Rect {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  return { x, y, w: Math.max(...rects.map(right)) - x, h: Math.max(...rects.map(bottom)) - y };
}

export function inflate(rect: Rect, by: number): Rect {
  return { x: rect.x - by, y: rect.y - by, w: rect.w + 2 * by, h: rect.h + 2 * by };
}

/** Preso 4 px dentro da tela */
export function clampToViewport(rect: Rect, vw: number, vh: number): Rect {
  const x = Math.max(rect.x, 4);
  const y = Math.max(rect.y, 4);
  return { x, y, w: Math.max(0, Math.min(right(rect), vw - 4) - x), h: Math.max(0, Math.min(bottom(rect), vh - 4) - y) };
}

export function intersects(a: Rect, b: Rect): boolean {
  return a.x < right(b) && b.x < right(a) && a.y < bottom(b) && b.y < bottom(a);
}

/** Pílulas e círculos acompanham a altura; o resto, o raio do alvo + 8 (entre 12 e 28). */
export function holeRadius(targetRadius: number, targetH: number, holeH: number): number {
  return targetRadius * 2 >= targetH ? Math.min(holeH / 2, MAX_R) : clamp(targetRadius + PAD, 12, MAX_R);
}

/** Coordenadas inteiras: o caminho fica curto e o furo, nítido */
const num = Math.round;

function roundedRect({ x, y, w, h, r }: Hole): string {
  const k = num(Math.max(0, Math.min(r, w / 2, h / 2)));
  const [l, t, rt, b] = [x, y, x + w, y + h].map(num);
  const arc = (ex: number, ey: number) => `A${k} ${k} 0 0 1 ${num(ex)} ${num(ey)}`;
  return `M${num(l + k)} ${t}H${num(rt - k)}${arc(rt, t + k)}V${num(b - k)}${arc(rt - k, b)}H${num(l + k)}${arc(l, b - k)}V${num(t + k)}${arc(l + k, t)}Z`;
}

/**
 * Véu com 3 furos (o principal e as 2 vagas de "Ligar"). A lista de comandos
 * é sempre a mesma (vaga sem uso = tamanho zero), para a transição interpolar.
 */
export function holePath(vw: number, vh: number, main: Hole | null | undefined, calls: readonly Hole[]): string {
  const first = main ?? center({ x: 0, y: 0, w: vw, h: vh });
  const zero = center(first);
  return `path(evenodd, "M0 0H${num(vw)}V${num(vh)}H0Z${[first, calls[0] ?? zero, calls[1] ?? zero].map(roundedRect).join("")}")`;
}

interface Option {
  typo: Typo;
  place: Place;
  candidate: number;
  delta: number;
  x: number;
  y: number;
}

/** Lado da seta: voltado para o alvo (só no cartão ancorado) */
const CARET_SIDE: Partial<Record<Place, CaretSide>> = { abaixo: "top", acima: "bottom", esquerda: "right", direita: "left", trilho: "left" };

const cardHeight = (input: LayoutInput, typo: Typo, place: Place) => (place === "centro" ? input.card.centerH : input.card.h[typo]);

function covers(input: LayoutInput, option: Option): boolean {
  const box = { x: option.x, y: option.y, w: input.card.w, h: cardHeight(input, option.typo, option.place) };
  return input.calls.some((call) => intersects(box, moved(call, option.delta)));
}

/**
 * Rolagem (em px inteiros, para baixo do alvo nunca passar do ponto) que leva
 * o furo para `to`, presa às bordas da página; barras fixas não rolam.
 */
function scrollFor(input: LayoutInput, hole: Rect, to: number): number {
  if (input.zone !== "page") return 0;
  return Math.floor(clamp(hole.y - to, -input.scrollY, Math.max(0, input.scrollHeight - input.vh - input.scrollY)));
}

type Pass = (typo: Typo, candidate: number, hole: Rect) => Option[];

/** Nada coube: null ou undefined (o cartão vai para o centro) */
function pickOption(input: LayoutInput): Option | null | undefined {
  const { vw, vh, card, candidates, barBottom, railRight } = input;
  if (candidates.length === 0) return null;
  const { w } = card;
  const top = barBottom + EDGE;
  const ceil = EDGE + input.insetTop;
  const floor = vh - EDGE - input.insetBottom;
  // Encaixado: centrado na área ao lado do trilho (no celular, a tela toda)
  const dockX = railRight + (vw - railRight - w) / 2;

  // Trilho: cartão à direita, na altura do alvo
  if (input.wide && input.zone === "rail") {
    const hole = inflate(candidates[0], PAD);
    const typo = TYPOS.find((t) => card.h[t] <= floor - ceil) ?? "curto";
    const h = card.h[typo];
    const y = clamp(hole.y + hole.h / 2 - h / 2, ceil, floor - h);
    return { typo, place: "trilho", candidate: 0, delta: 0, x: railRight + GAP, y };
  }

  /** Abaixo, acima, à esquerda e à direita de um furo à vista (≥ 48em) */
  const anchored = (typo: Typo, candidate: number, hole: Rect, delta: number): Option[] => {
    const h = card.h[typo];
    const minX = railRight + GAP;
    const maxX = vw - GAP - w;
    const cx = hole.x + hole.w / 2;
    const sideY = clamp(hole.y + hole.h / 2 - h / 2, top, floor - h);
    // Abaixo e acima: centrado no furo e, depois, o mais à esquerda que a seta ainda
    // alcança o centro do furo (os "Ligar" ficam na borda direita do plantão)
    const spots: [Place, number, number][] = [
      ...[clamp(cx - w / 2, minX, maxX), clamp(cx + CARET_MIN - w, minX, maxX)].flatMap((x): [Place, number, number][] => [
        ["abaixo", x, bottom(hole) + GAP],
        ["acima", x, hole.y - GAP - h],
      ]),
      ["esquerda", hole.x - GAP - w, sideY],
      ["direita", right(hole) + GAP, sideY],
    ];
    return spots
      .filter(([, sx, sy]) => sx >= minX && sx <= maxX && sy >= top && sy + h <= floor)
      .map(([place, sx, sy]) => ({ typo, place, candidate, delta, x: sx, y: sy }));
  };

  // Celular (e o encaixe no computador): escada normal → compacto → curto; o cartão
  // embaixo, ou em cima no fim da página
  const phone: Pass = (typo, candidate, hole) => {
    const h = card.h[typo];
    const downY = floor - h;
    const down = scrollFor(input, hole, top);
    const up = scrollFor(input, hole, ceil + h + GAP);
    const below = clampToViewport(moved(hole, down), vw, vh);
    const above = clampToViewport(moved(hole, up), vw, vh);
    const base = { typo, candidate, x: dockX };
    const options: Option[] = [];
    if (below.y >= (input.zone === "page" ? top : 0) && bottom(below) + GAP <= downY) options.push({ ...base, place: "embaixo", delta: down, y: downY });
    if (above.y >= ceil + h + GAP && bottom(above) <= (input.zone === "page" ? input.tabTop - EDGE : vh)) options.push({ ...base, place: "emcima", delta: up, y: ceil });
    return options;
  };

  const visibleNow = (rect: Rect) => rect.y >= barBottom && bottom(rect) <= floor + EDGE;
  const passes: Pass[] = input.wide
    ? [
        (typo, candidate, hole) => (visibleNow(inflate(hole, -PAD)) ? anchored(typo, candidate, hole, 0) : []),
        // Rola o alvo para baixo da AppBar e tenta abaixo
        (typo, candidate, hole) => {
          const delta = scrollFor(input, hole, top);
          return anchored(typo, candidate, moved(hole, delta), delta).filter((o) => o.place === "abaixo");
        },
        // Encaixado embaixo (ou em cima, no fim da página)
        phone,
      ]
    : [phone];

  // A primeira posição válida que não cobre um "Ligar", em qualquer passada ou
  // candidato (no passo 2, obrigatório); se todas cobrem, a primeira válida. Fora
  // do passo 2 a preferência não encurta o texto: só no tipo da primeira válida
  let first: Option | undefined;
  for (const pass of passes) {
    for (const typo of TYPOS) {
      for (const [candidate, rect] of candidates.entries()) {
        for (const option of pass(typo, candidate, inflate(rect, PAD))) {
          first ??= option;
          if (!covers(input, option) && (input.strictCalls || option.typo === first.typo)) return option;
        }
      }
    }
  }
  if (input.strictCalls) return null;
  if (first || input.wide) return first;

  // Espiada: menor grupo e texto curto, com pelo menos 56 px do alvo à vista
  const candidate = candidates.length - 1;
  const rect = candidates[candidate];
  const h = card.h.curto;
  const atTop = input.zone === "tabbar";
  const y = atTop ? ceil : floor - h;
  const delta = scrollFor(input, inflate(rect, PAD), top);
  const target = moved(rect, delta);
  const visible = atTop ? bottom(target) - Math.max(target.y, y + h) : Math.min(bottom(target), y) - Math.max(target.y, barBottom);
  return visible >= Math.min(PEEK_MIN, rect.h) ? { typo: "curto", place: "espiada", candidate, delta, x: dockX, y } : null;
}

export function chooseLayout(input: LayoutInput): Layout {
  const { vw, vh, card, calls, railRight } = input;
  const callCopies = input.strictCalls && calls.length > 0;
  // Nada coube: centro (no passo 2, com as cópias de "Ligar" e o texto curto, porque as cópias são o principal)
  const { typo, place, candidate, delta, x, y } = pickOption(input) ?? {
    typo: callCopies ? "curto" : "normal",
    place: "centro",
    candidate: -1,
    delta: 0,
    x: railRight + (vw - railRight - card.w) / 2,
    y: Math.max(EDGE + input.insetTop, (vh - card.centerH) / 2),
  };
  const rect = input.candidates[candidate];
  const hole = rect ? clampToViewport(moved(inflate(rect, PAD), delta), vw, vh) : null;
  const position = { x: num(x), y: num(y) };
  const box = { ...position, w: card.w, h: cardHeight(input, typo, place) };
  const copies = place === "centro" && callCopies;

  // "Ligar" acesos: inteiros na faixa visível, fora do cartão e do furo (no centro do passo 2, as cópias)
  const lit: number[] = [];
  const spot = (index: number): Hole => {
    const call = calls[index];
    if (!call) return center(hole ?? { x: 0, y: 0, w: vw, h: vh });
    const at = moved(call, delta);
    const free = at.y >= input.barBottom && bottom(at) <= input.tabTop && at.x >= 0 && right(at) <= vw && !intersects(at, box);
    if (copies || !free || (hole && intersects(at, hole))) return center(at);
    lit.push(index);
    const padded = clampToViewport(inflate(at, 4), vw, vh);
    return { ...padded, r: Math.min(padded.h / 2, MAX_R) };
  };
  const callHoles: [Hole, Hole] = [spot(0), spot(1)];
  const side = input.wide && hole ? CARET_SIDE[place] : undefined;
  const across = side === "top" || side === "bottom";
  const at = hole ? (across ? hole.x + hole.w / 2 - position.x : hole.y + hole.h / 2 - position.y) : 0;
  return {
    typo,
    place,
    candidate,
    scrollDelta: delta,
    hole,
    radius: rect && hole ? holeRadius(input.targetRadius, rect.h, hole.h) : 0,
    card: position,
    caret: side ? { side, at: num(clamp(at, CARET_MIN, (across ? box.w : box.h) - CARET_MIN)) } : null,
    callCopies: copies,
    lit,
    callHoles,
    box,
  };
}
