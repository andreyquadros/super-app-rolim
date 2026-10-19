import { useLayoutEffect, type RefObject } from "react";
import { motionAllowed } from "@/lib/navMotion";

const ENTRANCE_MS = 200;
const EASE_ENTER = "cubic-bezier(0.16, 1, 0.3, 1)";

function supportsViewTransitions(): boolean {
  return typeof CSS !== "undefined" && CSS.supports("view-transition-name: none");
}

/**
 * Navegadores sem View Transitions (DESIGN §7): entrada simples a cada troca
 * de tela, sem remontar a tela (o estado fica). Só opacidade: um transform no
 * conteúdo prenderia os rodapés fixos das tarefas (Voltar/Continuar) a ele
 * durante a animação.
 */
export function useScreenEntrance(ref: RefObject<HTMLElement | null>, screenKey: string): void {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof element.animate !== "function" || supportsViewTransitions() || !motionAllowed()) return undefined;
    const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ENTRANCE_MS, easing: EASE_ENTER });
    return () => animation.cancel();
  }, [ref, screenKey]);
}
