import { useCallback, useEffect, useRef } from "react";

const LOCK_CLASS = "sheet-open";
/** Barra de rolagem clássica (computador): o global.css reserva a calha durante a trava */
export const SCROLL_GUTTER_ATTR = "data-scroll-gutter";

interface LockTarget {
  classList: Pick<DOMTokenList, "add" | "remove">;
  /** Largura sem a barra de rolagem */
  clientWidth: number;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

interface LockView {
  /** Largura com a barra de rolagem */
  innerWidth: number;
}

// Folhas abertas agora: com duas empilhadas, fechar uma não solta a rolagem
let held = 0;

/**
 * Trava a rolagem do <html> (classe sheet-open). Devolve a função que solta
 * esta trava; a classe só sai quando a última trava é solta. Com barra
 * clássica, marca a calha para a página não pular para o lado; no celular
 * (barra sobreposta) nada muda.
 */
export function acquireScrollLock(target: LockTarget = document.documentElement, view: LockView = window): () => void {
  if (held === 0 && view.innerWidth > target.clientWidth) target.setAttribute(SCROLL_GUTTER_ATTR, "");
  held += 1;
  target.classList.add(LOCK_CLASS);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    held = Math.max(0, held - 1);
    if (held > 0) return;
    target.classList.remove(LOCK_CLASS);
    target.removeAttribute(SCROLL_GUTTER_ATTR);
  };
}

/** Uma trava por folha: lock/unlock podem ser chamados mais de uma vez; desmontar solta. */
export function useScrollLock(): { lock: () => void; unlock: () => void } {
  const release = useRef<(() => void) | null>(null);
  const lock = useCallback(() => {
    release.current ??= acquireScrollLock();
  }, []);
  const unlock = useCallback(() => {
    release.current?.();
    release.current = null;
  }, []);
  useEffect(() => unlock, [unlock]);
  return { lock, unlock };
}
