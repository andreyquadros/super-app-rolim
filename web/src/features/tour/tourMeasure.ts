import { band, candidateGroups, findTarget, rectOf, telLinks, visible, zoneOf } from "./tourDom";
import { chooseLayout, TYPOS, unionRect, type Layout } from "./tourGeometry";
import { STEP_IDS, toDutyVariant, type DutyVariant, type NavVariant } from "./tourSteps";

// Leitura do DOM para a geometria pura: alvo, grupos, barras, área segura e
// as alturas do cartão nos três tipos (lidas antes de pintar).

/** Cópia de um "Ligar" da página (modo centro do passo 2) */
export interface CallCopy {
  href: string;
  label: string;
  /** data-variant do Mantine: "outline" na funerária */
  variant: string | undefined;
}

export interface StepMeasure {
  layout: Layout;
  /** Grupo destacado e "Ligar" acesos: a parte viva da página */
  live: Element[];
  /** Raiz do alvo (observada: os esqueletos dão lugar aos dados) */
  root: Element | undefined;
  nav: NavVariant;
  duty: DutyVariant;
  copies: CallCopy[];
  vw: number;
  vh: number;
}

/** `layer` traz a área segura no padding; `card` é medido nos três tipos. */
export function measureStep(step: number, layer: HTMLElement, card: HTMLElement): StepMeasure {
  const id = STEP_IDS[step];
  const target = findTarget(id);
  const groups = target ? candidateGroups(id, target) : [];
  const calls = telLinks();
  // A altura da página não depende do cartão (fixo na camada): lida junto com a largura
  const { clientWidth: vw, scrollHeight } = document.documentElement;
  const vh = visualViewport?.height ?? innerHeight;
  const insets = getComputedStyle(layer);
  // O trilho (NavRail) só aparece a partir de 48em: menu; senão, a barra de baixo
  const railRight = visible(".nav-rail-vt")?.getBoundingClientRect().right ?? 0;
  const nav: NavVariant = railRight > 0 ? "menu" : "barra";

  // 3 leituras trocando data-typo (sem as cópias de "Ligar"); o tipo atual
  // volta antes de soltar data-measure, para nada ficar em transição
  const centerH = card.offsetHeight;
  const typo = card.dataset.typo ?? "normal";
  card.dataset.measure = "";
  const [normal, compacto, curto] = TYPOS.map((t) => {
    card.dataset.typo = t;
    return card.offsetHeight;
  });
  card.dataset.typo = typo;
  delete card.dataset.measure;

  const [barBottom, tabTop] = band(vh);
  const layout = chooseLayout({
    vw,
    vh,
    wide: nav === "menu",
    barBottom,
    tabTop,
    railRight,
    insetTop: Number.parseFloat(insets.paddingTop) || 0,
    insetBottom: Number.parseFloat(insets.paddingBottom) || 0,
    card: { w: card.offsetWidth, h: { normal, compacto, curto }, centerH },
    zone: target ? zoneOf(target) : "page",
    candidates: groups.map((group) => unionRect(group.map(rectOf))),
    targetRadius: target ? Number.parseFloat(getComputedStyle(target).borderTopLeftRadius) || 0 : 0,
    calls: calls.map(rectOf),
    strictCalls: id === "plantao",
    scrollY,
    scrollHeight,
  });
  return {
    layout,
    live: [...(groups[layout.candidate] ?? []), ...layout.lit.map((i) => calls[i])],
    root: groups[0]?.[0],
    nav,
    duty: toDutyVariant(findTarget("plantao")?.dataset.tourState, calls.length > 0),
    copies: layout.callCopies
      ? calls.map((link) => ({ href: link.href, label: link.getAttribute("aria-label") ?? "Ligar", variant: link.dataset.variant }))
      : [],
    vw,
    vh: Math.max(vh, innerHeight),
  };
}
