import { useEffect, useRef, useState } from "react";
import { useNavigation } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { anotherDialogOpen } from "@/components/sheet/openDialogs";
import { motionAllowed } from "@/lib/navMotion";
import { band, findTarget, focusQuietly, rectOf, viewTransitionActive } from "./tourDom";
import { EDGE } from "./tourGeometry";
import { TourLayer, type LayerExit } from "./TourLayer";
import { TourOffer } from "./TourOffer";
import { markTourDone, markTourOffered, shouldOfferTour, type TourMode, type TourOutcome, type TourRequest } from "./tourState";
import { STEP_IDS, toAccountVariant } from "./tourSteps";
import { poll, waitForOfferMoment } from "./tourWait";

// Pedaço sob demanda: nunca importado de forma estática pelo pacote inicial.

/** Depois de tocar num controle aceso: a folha do Solicitar surge em até 300 ms */
const SHEET_WAIT_MS = 300;
/** Cerca de 2 quadros */
const CALM_POLL_MS = 32;

export interface HomeTourProps {
  /** "oferta": espera → folha → passeio; "manual": começa direto no passo 1 */
  mode: TourMode;
  request: TourRequest | null;
  /** Fim do passeio (não é chamado ao desmontar por troca de rota) */
  onDone(outcome: TourOutcome): void;
}

type Stage = "espera" | "oferta" | "passeio" | "pausa";

/** Sair, Esc e Voltar: o foco vai para o que o passo mostrava (alvo ausente: o main h1). */
function exitTarget(step: number): Element | null | undefined {
  const target = findTarget(STEP_IDS[step]);
  // Passo 1: o primeiro bloco; 2: o título do plantão; 3: Solicitar; 4: a aba atual;
  // 5: Entrar ou o avatar (a reserva da conta, carregando, não pega foco: vai o main h1)
  const inside = ["a", "h2", "", "[aria-current]", ""][step];
  return inside ? target?.querySelector(inside) : target;
}

/**
 * Máquina do passeio. Oferta: espera → folha → passeio → fim. Manual: espera
 * a transição → passeio. Ao desmontar (troca de rota), desfaz tudo sem onDone.
 */
export default function HomeTour({ mode, request, onDone }: HomeTourProps) {
  const { loading, user } = useAuth();
  const idle = useNavigation().state === "idle";
  const [stage, setStage] = useState<Stage>("espera");
  const [step, setStep] = useState(0);
  const self = useRef({ onDone, request, loading, step, idle, returnTo: 0 }).current;
  useEffect(() => {
    Object.assign(self, { onDone, request, loading, step, idle });
  });

  useEffect(() => {
    if (stage === "oferta" || stage === "passeio") return;
    if (mode === "oferta" && stage === "espera") {
      return waitForOfferMoment(
        () => !self.loading,
        () => {
          // Outra aba pode ter concluído enquanto esperávamos
          if (!shouldOfferTour()) return self.onDone("dispensou");
          markTourOffered();
          setStage("oferta");
        },
      );
    }
    // Manual: começa quando a transição de tela termina. Pausa (depois de um
    // toque aceso): se em até 300 ms abrir uma folha (Solicitar), espera ela
    // fechar e volta no mesmo passo, se a pessoa continuar na Início
    const start = performance.now();
    let sheet = stage === "espera";
    let calm = 0;
    // A folha abre logo depois do toque (o passeio já saiu): o atributo open
    // avisa na hora, mesmo que ela feche antes da próxima verificação
    const opened = new MutationObserver(() => (sheet = true));
    opened.observe(document.body, { subtree: true, attributeFilter: ["open"] });
    const stop = poll(CALM_POLL_MS, () => {
      if (anotherDialogOpen()) {
        calm = 0;
        return false;
      }
      // Calma: duas verificações seguidas sem folha, sem navegação e sem transição de tela
      calm = self.idle && !viewTransitionActive() ? calm + 1 : 0;
      if (sheet ? calm < 2 : performance.now() - start < SHEET_WAIT_MS) return false;
      if (!sheet) {
        // Sem folha: a ação seguiu (Ligar, Entrar...)
        self.onDone("acao");
      } else {
        if (stage === "espera") {
          // Qualquer passeio que começa: nunca mais automático
          markTourDone();
          self.returnTo = scrollY;
        }
        setStage("passeio");
      }
      return true;
    });
    return () => {
      stop();
      opened.disconnect();
    };
  }, [stage, mode, self]);

  const layerExit = (outcome: LayerExit) => {
    if (outcome === "acao") return setStage("pausa");
    const title = document.querySelector("main h1");
    if (self.request?.source === "ajuda") {
      // Vindo de "Como usar o app": volta para onde a pessoa estava, com o foco na linha
      // (scrollTo e scrollBy com números são instantâneos: o html não tem scroll-behavior)
      scrollTo(0, self.returnTo);
      focusQuietly(self.request.origin) || focusQuietly(title);
    } else if (outcome === "concluido") {
      scrollTo({ top: 0, behavior: motionAllowed() ? "smooth" : "instant" });
      focusQuietly(title);
    } else {
      // A rolagem fica, a não ser que o alvo da página (passos 1 e 2) esteja sob a AppBar ou a
      // TabBar (no passo 2, o título sobe para baixo da AppBar): rola só o necessário para ele
      // ficar a 12 px das barras medidas (a AppBar cresce com a faixa "Sem internet")
      const target = exitTarget(self.step);
      if (target && self.step < 2) {
        const [top, end] = band(innerHeight);
        const { y, h } = rectOf(target);
        // Sobe o necessário para o topo sair de baixo da AppBar ou desce para o pé sair de baixo
        // da TabBar; se o alvo não couber inteiro, o topo vence
        scrollBy(0, Math.min(Math.max(0, y + h - end + EDGE), y - top - EDGE));
      }
      focusQuietly(target) || focusQuietly(title);
    }
    self.onDone(outcome);
  };

  if (stage === "oferta") {
    return <TourOffer onClosed={(show) => (show ? setStage("passeio") : self.onDone(show === null ? "dispensou" : "recusou"))} />;
  }
  return stage === "passeio" && <TourLayer step={step} account={toAccountVariant({ loading, signedIn: !!user })} onStep={setStep} onExit={layerExit} />;
}
