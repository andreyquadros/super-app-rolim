import { IconChevronRight, IconHelpCircle } from "@tabler/icons-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { requestTour, useTourRequest } from "@/features/tour/tourState";
import { motionAllowed } from "@/lib/navMotion";
import classes from "./HomeHelp.module.css";

/** Depois disso a linha avisa que o passeio está abrindo (o pedaço ainda baixa) */
const SLOW_MS = 400;
/** Camada do passeio, num portal no <body>: quando aparece, o passeio abriu */
const TOUR_LAYER = "[data-tour-layer]";
const ENTRANCE_STYLE = { "--i": 1 } as CSSProperties;

type Phase = "idle" | "opening" | "failed";

/**
 * "Como usar o app": abre o passeio pela tela inicial a qualquer hora, também
 * sem conta. Fica antes do convite (que pode surgir tarde) para nada a empurrar.
 */
export function HomeHelp() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [slow, setSlow] = useState(false);
  // O pedido sai do armazém quando o passeio termina ou falha: para de esperar
  const request = useTourRequest();
  const waiting = phase === "opening" && request !== null;

  useEffect(() => {
    if (!waiting) return undefined;
    const timer = window.setTimeout(() => setSlow(true), SLOW_MS);
    const checkOpened = () => {
      if (document.querySelector(TOUR_LAYER)) setPhase("idle");
    };
    const observer = new MutationObserver(checkOpened);
    observer.observe(document.body, { childList: true });
    checkOpened();
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [waiting]);

  // Linha no pé da tela: o aviso de falha não pode ficar escondido sob a barra de abas
  useEffect(() => {
    if (phase !== "failed") return;
    alertRef.current?.scrollIntoView({ block: "nearest", behavior: motionAllowed() ? "smooth" : "auto" });
  }, [phase]);

  const open = () => {
    if (waiting) return;
    setSlow(false);
    setPhase("opening");
    requestTour({ source: "ajuda", origin: buttonRef.current, onFail: () => setPhase("failed") });
  };

  const busy = waiting && slow;
  return (
    <section className={`${classes.section} enter-rise`} style={ENTRANCE_STYLE} aria-labelledby="home-ajuda">
      <h2 id="home-ajuda" className="visually-hidden">
        Ajuda
      </h2>
      <button
        ref={buttonRef}
        type="button"
        className={classes.row}
        onClick={open}
        aria-haspopup="dialog"
        aria-busy={busy || undefined}
        data-tour="ajuda"
        data-press
      >
        <span className={classes.icon} aria-hidden>
          <IconHelpCircle size={24} stroke={1.8} />
        </span>
        <span className={classes.text}>
          <span className={classes.title}>{busy ? "Abrindo o passeio…" : "Como usar o app"}</span>
          <span className={classes.hint}>Passeio guiado pela tela inicial</span>
        </span>
        <IconChevronRight size={20} aria-hidden className={classes.chevron} />
      </button>
      {phase === "failed" && (
        <p ref={alertRef} role="alert" className={classes.error}>
          Não foi possível abrir o passeio agora. Confira a internet e tente de novo.
        </p>
      )}
    </section>
  );
}
