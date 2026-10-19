import { useEffect, useRef } from "react";

/**
 * Depois de cada troca de tela, leva o foco ao título (H1) da nova tela,
 * sem rolar: leitores de tela anunciam onde a pessoa chegou. Na abertura do
 * app o foco fica no começo da página (o primeiro Tab chega ao "Pular para o
 * conteúdo").
 */
export function useFocusOnNavigate(pathname: string): void {
  const previous = useRef<string | null>(null);
  useEffect(() => {
    const from = previous.current;
    previous.current = pathname;
    // Primeira tela, ou o mesmo efeito repetido (StrictMode): nada a fazer
    if (from === null || from === pathname) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>("main h1") ?? document.getElementById("conteudo");
      if (!target) return;
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);
}
