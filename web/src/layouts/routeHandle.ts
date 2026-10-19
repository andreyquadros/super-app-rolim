import { useMatches, type Params } from "react-router";

/**
 * Tipo de "casca" de cada tela:
 * - home: Início (barra com a marca)
 * - root: telas das abas (título grande que encolhe ao rolar)
 * - push: telas empilhadas (Voltar com rótulo)
 * - flow: tarefas em tela cheia (Fechar, sem barra de abas)
 */
export type Chrome = "home" | "root" | "push" | "flow";

export interface RouteHandle {
  chrome?: Chrome;
  /** Título da tela (texto fixo ou calculado pelos parâmetros da rota) */
  title?: string | ((params: Params) => string | undefined);
  /** Para onde o Voltar/Fechar leva quando não há histórico no app */
  back?: { to: string; label: string };
}

export interface ResolvedHandle {
  chrome: Chrome;
  title?: string;
  back: { to: string; label: string };
}

const DEFAULT_BACK = { to: "/", label: "Início" };

/** Handle da rota mais interna que declarou uma casca. */
export function useRouteHandle(): ResolvedHandle {
  const matches = useMatches();
  for (let i = matches.length - 1; i >= 0; i--) {
    const handle = matches[i].handle as RouteHandle | undefined;
    if (!handle?.chrome) continue;
    const title = typeof handle.title === "function" ? handle.title(matches[i].params) : handle.title;
    return { chrome: handle.chrome, title, back: handle.back ?? DEFAULT_BACK };
  }
  return { chrome: "root", back: DEFAULT_BACK };
}
