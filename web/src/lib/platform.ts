// Detecção simples do aparelho (sem dependências: pode ir no pacote inicial).

export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** Aberto como app instalado (tela inicial), e não pelo navegador. */
export function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}
