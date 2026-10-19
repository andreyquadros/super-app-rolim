import { useCallback, useEffect, useRef } from "react";

const LOCK_CLASS = "sheet-open";

interface LockTarget {
  classList: Pick<DOMTokenList, "add" | "remove">;
}

// Folhas abertas agora: com duas empilhadas, fechar uma não solta a rolagem
let held = 0;

/**
 * Trava a rolagem do <html> (classe sheet-open). Devolve a função que solta
 * esta trava; a classe só sai quando a última trava é solta.
 */
export function acquireScrollLock(target: LockTarget = document.documentElement): () => void {
  held += 1;
  target.classList.add(LOCK_CLASS);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    held = Math.max(0, held - 1);
    if (held === 0) target.classList.remove(LOCK_CLASS);
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
