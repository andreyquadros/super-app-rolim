import { useState } from "react";
import { BottomSheet } from "@/components/sheet/BottomSheet";
import { markTourDone } from "./tourState";

interface TourOfferProps {
  /** Depois que a folha desceu: true (Mostrar), false (Agora não) ou null (fechou sem escolher) */
  onClosed: (show: boolean | null) => void;
}

/** Oferta do passeio, só no primeiro acesso (quem abre já gravou markTourOffered). */
export function TourOffer({ onClosed }: TourOfferProps) {
  // undefined: aberta; depois, a resposta (a primeira vale)
  const [answer, setAnswer] = useState<boolean | null>();
  const choose = (show: boolean) => {
    // As duas respostas encerram a oferta de vez
    markTourDone();
    setAnswer((current) => current ?? show);
  };
  return (
    <BottomSheet
      open={answer === undefined}
      onClose={() => setAnswer((current) => current ?? null)}
      onAfterClose={() => onClosed(answer ?? null)}
      title="Quer conhecer a tela inicial?"
      description="Um passeio mostra onde fica cada coisa, um passo de cada vez. São 5 passos curtos."
    >
      <div data-tour-offer>
        <p>Se preferir, veja depois em “Como usar o app”, no fim da tela inicial.</p>
        <button type="button" onClick={() => choose(true)} data-autofocus data-press>
          Mostrar o passeio
        </button>
        <button type="button" onClick={() => choose(false)} data-press>
          Agora não
        </button>
      </div>
    </BottomSheet>
  );
}
