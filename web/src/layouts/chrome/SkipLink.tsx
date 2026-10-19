import type { MouseEvent } from "react";

const MAIN_ID = "conteudo";

/**
 * "Pular para o conteúdo": leva o foco ao título da tela sem mexer no
 * endereço (um "#conteudo" criaria uma entrada a mais no histórico e
 * confundiria o Voltar do app e do Android).
 */
export function SkipLink() {
  const skip = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const main = document.getElementById(MAIN_ID);
    const target = main?.querySelector<HTMLElement>("h1") ?? main;
    if (!target) return;
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    // scroll-margin-top (CitizenLayout.module.css) deixa o título abaixo da barra verde
    target.scrollIntoView({ block: "nearest" });
  };
  return (
    <a href={`#${MAIN_ID}`} className="skip-link" onClick={skip}>
      Pular para o conteúdo
    </a>
  );
}
