import { anotherDialogOpen } from "@/components/sheet/openDialogs";
import { viewTransitionActive } from "./tourDom";

// Esperas do passeio, sempre por verificações periódicas (nenhum laço de quadros).

/** Chama `tick` a cada `every` ms até ele devolver true; devolve a função que para. */
export const poll = (every: number, tick: () => boolean): (() => void) => {
  const timer = setInterval(() => tick() && clearInterval(timer), every);
  return () => clearInterval(timer);
};

const CHECK_MS = 600;
/** 1,2 s desde que o passeio montou: o mesmo prazo da Novidade */
const MIN_CHECKS = 2;
/** Sem resposta do login em 6 s: oferece assim mesmo (o passo 5 fica "carregando") */
const AUTH_CHECKS = 10;
const INPUTS = ["pointerdown", "keydown", "wheel", "scroll"] as const;

/**
 * Momento calmo da oferta, verificado a cada 600 ms: nenhuma folha ou diálogo
 * aberto (a trava html.sheet-open só existe com uma folha aberta), a página à
 * vista, sem transição de tela e nenhum toque, tecla ou rolagem desde a
 * verificação anterior (a folha nunca sobe sob o dedo).
 */
export function waitForOfferMoment(authReady: () => boolean, onReady: () => void): () => void {
  let checks = 0;
  let touched = false;
  const off = new AbortController();
  INPUTS.forEach((type) => addEventListener(type, () => (touched = true), { capture: true, passive: true, signal: off.signal }));
  const stopPoll = poll(CHECK_MS, () => {
    const calm =
      ++checks >= MIN_CHECKS &&
      !touched &&
      !anotherDialogOpen() &&
      document.visibilityState === "visible" &&
      !viewTransitionActive() &&
      (authReady() || checks >= AUTH_CHECKS);
    touched = false;
    // true já para a verificação: falta só soltar os ouvintes
    if (calm) {
      off.abort();
      onReady();
    }
    return calm;
  });
  return () => {
    stopPoll();
    off.abort();
  };
}
