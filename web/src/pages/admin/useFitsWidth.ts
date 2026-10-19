import { useLayoutEffect, useState } from "react";

const FALLBACK_ROOT_PX = 16;

/** A largura medida comporta `minRem` no tamanho de texto atual (100%, 112,5% ou 125%)? */
export function fitsWidth(widthPx: number, minRem: number, rootPx: number): boolean {
  const root = Number.isFinite(rootPx) && rootPx > 0 ? rootPx : FALLBACK_ROOT_PX;
  return widthPx >= minRem * root;
}

function rootFontPx(): number {
  return parseFloat(getComputedStyle(document.documentElement).fontSize);
}

/**
 * Tabela ou cartões pela largura da área, não da janela: o menu lateral de 272 px
 * e o tamanho do texto mudam o espaço útil. Mede antes da pintura (sem piscar).
 */
export function useFitsWidth<T extends HTMLElement>(minRem: number): { ref: (node: T | null) => void; fits: boolean } {
  const [node, setNode] = useState<T | null>(null);
  const [fits, setFits] = useState(false);

  useLayoutEffect(() => {
    if (!node) return undefined;
    const measure = () => setFits(fitsWidth(node.getBoundingClientRect().width, minRem, rootFontPx()));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, minRem]);

  return { ref: setNode, fits };
}
