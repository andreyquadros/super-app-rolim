import { useEffect, useState, type RefObject } from "react";

/**
 * true quando o marcador (logo abaixo do título grande) passou por baixo da
 * barra superior: a barra então mostra o título compacto.
 */
export function useCollapsedTitle(
  sentinel: RefObject<HTMLElement | null>,
  bar: RefObject<HTMLElement | null>,
  enabled: boolean,
  resetKey: string,
): boolean {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    setCollapsed(false);
    const target = sentinel.current;
    const header = bar.current;
    if (!enabled || !target || !header || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setCollapsed(!entry.isIntersecting && entry.boundingClientRect.top < header.offsetHeight),
      { rootMargin: `-${header.offsetHeight}px 0px 0px 0px` },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [sentinel, bar, enabled, resetKey]);
  return collapsed;
}
