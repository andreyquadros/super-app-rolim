import { useEffect } from "react";

/** Barras, trilho e alvos de toque: partes do app, não links de site. */
const CHROME_SELECTOR = ".tab-bar-vt, .app-bar-vt, .nav-rail-vt, [data-press]";

/**
 * No app instalado, segurar o dedo numa aba ou num botão não abre o menu de
 * link do navegador ("Abrir em nova aba"...). No navegador comum, nada muda.
 */
export function useChromeContextMenu(): void {
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const standalone = window.matchMedia("(display-mode: standalone)");
    const onContextMenu = (event: MouseEvent) => {
      if (!standalone.matches) return;
      if (event.target instanceof Element && event.target.closest(CHROME_SELECTOR)) event.preventDefault();
    };
    document.addEventListener("contextmenu", onContextMenu);
    return () => document.removeEventListener("contextmenu", onContextMenu);
  }, []);
}
