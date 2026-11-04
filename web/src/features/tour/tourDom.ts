import type { Rect, Zone } from "./tourGeometry";
import type { StepId } from "./tourSteps";

// Acesso ao DOM do passeio: só por atributos de dados (data-tour,
// data-tour-part), nunca por classes com hash dos CSS Modules.

/** O que conta como controle: tocar nele (aceso) sai do passeio antes da ação */
export const CONTROLS = "a,button,input,select,textarea,summary,label,[role=button]";
// As partes acesas da Início não têm controles desativados
const FOCUSABLE = "a[href],button,input,select,textarea,summary,[tabindex]:not([tabindex='-1'])";

export function rectOf(el: Element): Rect {
  const { x, y, width, height } = el.getBoundingClientRect();
  return { x, y, w: width, h: height };
}

/** Tem área (logo, tem caixa) e não está com visibility: hidden */
function shown(el: Element): boolean {
  const { w, h } = rectOf(el);
  return w * h > 0 && getComputedStyle(el).visibility !== "hidden";
}

/** O primeiro elemento visível do seletor */
export const visible = (selector: string): HTMLElement | undefined => [...document.querySelectorAll<HTMLElement>(selector)].find(shown);

const warned = new Set<string>();

/** O primeiro [data-tour=id] visível: escolhe sozinho entre a TabBar e o NavRail. */
export const findTarget = (id: StepId): HTMLElement | undefined => {
  const found = visible(`[data-tour="${id}"]`);
  if (import.meta.env.DEV && !found && !warned.has(id)) {
    warned.add(id);
    console.warn("[passeio] alvo ausente", id);
  }
  return found;
};

/** Grupos destacáveis do alvo, do maior para o menor (o retângulo é a união). */
export function candidateGroups(id: StepId, target: HTMLElement): Element[][] {
  const only = (...els: (Element | null | undefined)[]) => els.filter((el): el is Element => !!el && shown(el));
  const [first, second] = target.children;
  const groups =
    id === "servicos"
      ? [[target], only(first, second), only(first)]
      : id === "plantao"
        ? [[target], only(target.querySelector("[data-tour-part=linhas]"))]
        : // Solicitar e abas somam o círculo que sobe da TabBar; a conta é o próprio elemento
          [only(target, target.querySelector("[data-tour-part=fab]"))];
  return groups.filter((group) => group.length > 0);
}

/** Faixa visível da página: do fundo da AppBar (mais alta com a faixa "Sem internet") ao topo da TabBar (ou `vh`). */
export const band = (vh: number): [number, number] => [
  Math.max(0, visible(".app-bar-vt")?.getBoundingClientRect().bottom ?? 0),
  visible(".tab-bar-vt")?.getBoundingClientRect().top ?? vh,
];

export const zoneOf = (el: Element): Zone =>
  el.closest(".tab-bar-vt") ? "tabbar" : el.closest(".nav-rail-vt") ? "rail" : el.closest(".app-bar-vt") ? "appbar" : "page";

/** "Ligar" da Início (os da página, nunca as cópias do cartão). */
export const telLinks = (): HTMLAnchorElement[] => [...document.querySelectorAll<HTMLAnchorElement>('main a[href^="tel:"]')].filter(shown).slice(0, 2);

/** Controles focáveis de um elemento vivo (incluindo ele mesmo). */
export const focusablesIn = (el: Element): HTMLElement[] =>
  [el, ...el.querySelectorAll(FOCUSABLE)].filter(
    (node): node is HTMLElement => node instanceof HTMLElement && node.matches(FOCUSABLE) && !node.closest("[inert]") && shown(node),
  );

/**
 * Deixa vivos só os elementos indicados: sobe de cada um até o <body> e marca
 * como inert cada irmão fora do caminho (pula a camada e o que já era inerte).
 * `covered` torna inerte um controle vivo inteiramente sob o cartão.
 * Devolve a função que desfaz tudo.
 */
export function makeLive(live: readonly Element[], layer: Element, covered: (el: Element) => boolean): () => void {
  const roots = live.filter((el) => !live.some((other) => other !== el && other.contains(el)));
  const path = new Set<Element>();
  for (const root of roots) {
    for (let node: Element | null = root; node && node !== document.body; node = node.parentElement) path.add(node);
  }
  const marked: HTMLElement[] = [];
  const mark = (el: Element) => {
    if (el !== layer && el instanceof HTMLElement && !el.inert) marked.push(Object.assign(el, { inert: true }));
  };
  for (const parent of [document.body, ...path]) {
    if (!roots.includes(parent)) for (const child of parent.children) if (!path.has(child)) mark(child);
  }
  for (const root of roots) focusablesIn(root).filter(covered).forEach(mark);
  return () => marked.forEach((el) => (el.inert = false));
}

// CloseWatcher ainda não está no lib.dom do TypeScript
interface CloseWatcherLike {
  onclose: (() => void) | null;
  destroy(): void;
}

/**
 * Voltar do Android e Esc. Sem CloseWatcher (WebKit, Firefox no Android), só
 * o Esc pelo keydown: o Voltar segue o histórico (risco aceito em DESIGN.md §11).
 */
export function onCloseRequest(handler: () => void): () => void {
  const Watcher = (window as { CloseWatcher?: new () => CloseWatcherLike }).CloseWatcher;
  if (Watcher) {
    const watcher = new Watcher();
    watcher.onclose = handler;
    return () => watcher.destroy();
  }
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape" && !event.defaultPrevented) handler();
  };
  addEventListener("keydown", onKey);
  return () => removeEventListener("keydown", onKey);
}

/**
 * Fim da rolagem suave: chama `then` no scrollend ou, no máximo, em 800 ms (o
 * iOS anterior ao 26, sem scrollend, espera o prazo; nenhum laço de quadros).
 * O que vier primeiro desliga o outro: nenhum ouvinte fica na janela.
 */
export function waitForScrollEnd(then: () => void): void {
  const end = () => {
    clearTimeout(timer);
    removeEventListener("scrollend", end);
    then();
  };
  const timer = setTimeout(end, 800);
  addEventListener("scrollend", end);
}

/** Duração de um token de movimento (--motion-*), em ms: os tokens são sempre em ms (theme/motion.css). */
export const readMs = (token: string): number => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(token)) || 0;

export function viewTransitionActive(): boolean {
  try {
    return document.documentElement.matches(":active-view-transition");
  } catch {
    return false;
  }
}

/** Foca sem rolar; false se não pegou o foco (ausente, inerte ou não focável). */
export const focusQuietly = (el: Element | null | undefined): boolean => {
  (el as HTMLElement | null | undefined)?.focus({ preventScroll: true });
  return !!el && document.activeElement === el;
};
