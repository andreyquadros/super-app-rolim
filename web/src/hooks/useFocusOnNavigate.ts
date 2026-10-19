import { useEffect, useRef } from "react";

/**
 * Depois de cada troca de tela, leva o foco ao título (H1) da nova tela,
 * sem rolar: leitores de tela anunciam onde a pessoa chegou.
 */
export function useFocusOnNavigate(pathname: string): void {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return undefined;
    }
    const frame = window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>("main h1") ?? document.getElementById("conteudo");
      if (!target) return;
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);
}
