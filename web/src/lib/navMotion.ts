// Tipo de navegação usado pelas transições de tela (View Transitions).
// "flow-exit": sair de uma tarefa em tela cheia (desce, em vez de deslizar de lado).
export type NavKind = "push" | "pop" | "tab" | "flow" | "flow-exit";

const root = () => document.documentElement;
const historyIdx = (): number | undefined => (window.history.state as { idx?: number } | null)?.idx;

/** Prazo para o popstate de um navigate(-n) do próprio app chegar */
const ARMED_MS = 1000;

// "flow-exit" pedido pelo app logo antes de um navigate(-n): o popstate seguinte o respeita
let armed: NavKind | null = null;
let armedTimer: ReturnType<typeof setTimeout> | undefined;
// Entrada do histórico de onde o último fluxo foi aberto (voltar para ela ou antes = sair do fluxo)
let flowOpenedFrom: number | undefined;

function apply(kind: NavKind): void {
  root().dataset.nav = kind;
  // Escopo (ex.: "duty" na troca Farmácias|Funerárias) vale só para uma navegação
  delete root().dataset.navScope;
}

function disarm(): void {
  armed = null;
  clearTimeout(armedTimer);
}

export function setNavKind(kind: NavKind): void {
  apply(kind);
  disarm();
  if (kind === "flow") flowOpenedFrom = historyIdx();
  if (kind !== "pop" && kind !== "flow-exit") return;
  armed = kind;
  armedTimer = setTimeout(disarm, ARMED_MS);
}

export interface HistoryPop {
  /** Tipo pedido pelo app antes do navigate(-n), se houver */
  requested: NavKind | null;
  /** Casca da tela que sai (data-chrome), lida antes de o roteador trocá-la */
  leaving: string | undefined;
  /** Índice do histórico (RR) da entrada de chegada */
  arrivalIdx: number | undefined;
  /** Índice de onde o fluxo foi aberto */
  flowOpenedFrom: number | undefined;
}

/** Voltar (do app, do navegador ou do sistema): o movimento desfaz o da tela que sai. */
export function kindForHistoryPop({ requested, leaving, arrivalIdx, flowOpenedFrom: openedFrom }: HistoryPop): NavKind {
  if (requested === "flow-exit") return "flow-exit";
  if (leaving === "flow") {
    // Dentro do fluxo, voltar é um passo atrás; sair é voltar para onde ele foi aberto
    const leftFlow = arrivalIdx !== undefined && openedFrom !== undefined && arrivalIdx <= openedFrom;
    return leftFlow ? "flow-exit" : "pop";
  }
  if (leaving === "root" || leaving === "home") return "tab";
  return "pop";
}

function onPopState(): void {
  const kind = kindForHistoryPop({
    requested: armed,
    leaving: document.querySelector<HTMLElement>("[data-chrome]")?.dataset.chrome,
    arrivalIdx: historyIdx(),
    flowOpenedFrom,
  });
  disarm();
  apply(kind);
}

/** "Reduzir movimento" ligado no sistema. */
export function reducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Movimento desligado por preferência do sistema ou aparelho modesto. */
export function motionAllowed(): boolean {
  if (typeof window === "undefined") return false;
  if (reducedMotion()) return false;
  return root().dataset.motion !== "lite";
}

interface NetworkInfo {
  saveData?: boolean;
}

/**
 * Chamado no main.tsx antes do roteador: o listener de popstate roda antes
 * do dele, com a tela que sai ainda montada.
 */
export function initNavMotion(): void {
  window.addEventListener("popstate", onPopState);
  const nav = navigator as Navigator & { connection?: NetworkInfo; deviceMemory?: number };
  if (nav.connection?.saveData || (nav.deviceMemory !== undefined && nav.deviceMemory <= 2)) {
    root().dataset.motion = "lite";
  }
}
