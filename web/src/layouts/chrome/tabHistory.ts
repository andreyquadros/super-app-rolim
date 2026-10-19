import { useCallback, useEffect, type MouseEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { motionAllowed, setNavKind } from "@/lib/navMotion";
import { scrollToTop, type TabState } from "./navItems";

// Caminho de cada entrada do histórico desta sessão, pelo índice do roteador
// (history.state.idx). Serve para saber se a tela anterior é a lista da aba.
const trail = new Map<number, string>();

function historyIndex(): number | undefined {
  const idx = (window.history.state as { idx?: unknown } | null)?.idx;
  return typeof idx === "number" ? idx : undefined;
}

/** CitizenLayout: anota o caminho da entrada atual a cada troca de tela. */
export function useHistoryTrail(): void {
  const { pathname, key } = useLocation();
  useEffect(() => {
    const idx = historyIndex();
    if (idx !== undefined) trail.set(idx, pathname);
  }, [pathname, key]);
}

/**
 * Como voltar à raiz da aba a partir de uma tela empilhada: se a anterior é
 * a própria lista, "voltar" (como nos apps); senão a lista substitui a tela.
 */
export function popStrategy(previousPath: string | undefined, root: string): "back" | "replace" {
  return previousPath === root ? "back" : "replace";
}

/**
 * Toque numa aba: na raiz, rola até o topo; numa tela empilhada da aba,
 * volta para a lista; em outra aba, segue o link normalmente.
 */
export function useTabPress(): (event: MouseEvent, state: TabState, root: string) => void {
  const navigate = useNavigate();
  return useCallback(
    (event: MouseEvent, state: TabState, root: string) => {
      if (state === "inactive") return;
      event.preventDefault();
      if (state === "root") {
        scrollToTop();
        return;
      }
      setNavKind("pop");
      const idx = historyIndex();
      const previous = idx !== undefined && idx > 0 ? trail.get(idx - 1) : undefined;
      if (popStrategy(previous, root) === "back") navigate(-1);
      else navigate(root, { replace: true, viewTransition: motionAllowed() });
    },
    [navigate],
  );
}
