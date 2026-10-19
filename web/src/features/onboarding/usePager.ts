import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { motionAllowed } from "@/lib/navMotion";

/** Espera depois do último evento de rolagem (navegadores sem "scrollend"). */
const SETTLE_MS = 120;

export interface Pager {
  ref: RefObject<HTMLDivElement | null>;
  index: number;
  goTo: (index: number) => void;
}

/**
 * Pager horizontal com scroll-snap: o dedo arrasta de verdade (rolagem
 * nativa) e os botões/teclas levam ao slide pedido.
 */
export function usePager(count: number): Pager {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const clamp = useCallback((value: number) => Math.min(count - 1, Math.max(0, value)), [count]);

  // Arrasto: o slide atual é decidido quando a rolagem para
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let timer = 0;
    const settle = () => {
      window.clearTimeout(timer);
      setIndex(clamp(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))));
    };
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(settle, SETTLE_MS);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("scrollend", settle);
    return () => {
      window.clearTimeout(timer);
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("scrollend", settle);
    };
  }, [clamp]);

  // Girar o celular ou mudar o tamanho do texto não pode trocar de slide
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => {
      el.scrollTo({ left: indexRef.current * el.clientWidth, behavior: "instant" });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const goTo = useCallback(
    (target: number) => {
      const next = clamp(target);
      const el = ref.current;
      setIndex(next);
      el?.scrollTo({ left: next * el.clientWidth, behavior: motionAllowed() ? "smooth" : "instant" });
    },
    [clamp],
  );

  return { ref, index, goTo };
}
