import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { acquireScrollLock } from "@/components/sheet/scrollLock";
import { motionAllowed, reducedMotion } from "@/lib/navMotion";
import { CONTROLS, focusablesIn, focusQuietly, makeLive, onCloseRequest, readMs, rectOf, waitForScrollEnd } from "./tourDom";
import { holePath } from "./tourGeometry";
import { measureStep, type StepMeasure } from "./tourMeasure";
import { STEP_COUNT, stepContent, stepLabel, type AccountVariant } from "./tourSteps";
import classes from "./HomeTour.module.css";

/** Próximo ou Voltar repetidos dentro deste prazo são ignorados */
const DOUBLE_TAP_MS = 400;
const noop = () => {};
const ARROWS: Partial<Record<string, number>> = { ArrowLeft: -1, ArrowRight: 1 };

export type LayerExit = "saiu" | "concluido" | "acao";
/** open: a entrada do passeio; out: o conteúdo some na troca de passo; in: entra o passo novo */
type CardPhase = "open" | "in" | "out";

interface TourLayerProps {
  step: number;
  account: AccountVariant;
  onStep: (next: number) => void;
  /** Chamado depois de desfazer o inert, a trava de rolagem e o CloseWatcher */
  onExit: (outcome: LayerExit) => void;
}

interface Controls {
  /** Mede e aplica o passo (troca de passo ou de variante) */
  show: (step: number) => void;
  go: (next: number) => void;
  leave: () => void;
  nudge: () => void;
}

/** Duração de um token; zero sem movimento (o cartão mantém o esmaecer no lite). */
const ms = (token: string, keepInLite?: boolean) => (reducedMotion() || (!keepInLite && !motionAllowed()) ? 0 : readMs(token));

/**
 * Véu com furos, anel e cartão. O escuro segura o toque; o que está aceso
 * (o grupo destacado e os "Ligar") funciona, e o resto fica inert.
 */
export function TourLayer({ step, account, onStep, onExit }: TourLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const [view, setView] = useState<StepMeasure | null>(null);
  const [phase, setPhase] = useState<CardPhase>("open");
  const [ringOn, setRingOn] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const controls = useRef<Controls>(null);
  const latest = useRef({ onStep, onExit });
  useLayoutEffect(() => {
    latest.current = { onStep, onExit };
  });

  // Montagem: trava de rolagem, Voltar/Esc, cliques, Tab e observadores. O
  // estado imperativo (nada dele é desenhado) vive neste fechamento.
  useLayoutEffect(() => {
    const layer = layerRef.current;
    const card = cardRef.current;
    if (!layer || !card) return;
    let live: Element[] = [];
    let undoLive = noop;
    let unlock = acquireScrollLock();
    let unwatch = onCloseRequest(() => leave("saiu"));
    let shown = -1;
    let key = "";
    let token = 0;
    let frame = 0;
    let lastNav = -DOUBLE_TAP_MS;
    let stopped = false;
    let swapping = false;
    let scrolling = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const release = () => {
      undoLive();
      unlock();
      unwatch();
      undoLive = unlock = unwatch = noop;
      live = [];
    };

    const measure = (kind: "step" | "fix") => {
      if (stopped) return;
      const m = measureStep(shown, layer, card);
      const { layout } = m;
      const { box } = layout;
      if (m.root) resize.observe(m.root);
      // Inclui as cópias: o número de um "Ligar" pode mudar sem mudar o lugar dele
      const next = JSON.stringify([layout, m.nav, m.duty, m.copies, m.vw, m.vh]);
      if (next !== key) {
        key = next;
        // Correção fora da troca de passo: o furo pula, sem transição, por um quadro
        if (kind === "fix") {
          layer.dataset.instant = "";
          requestAnimationFrame(() => requestAnimationFrame(() => delete layer.dataset.instant));
        }
        setView(m);
      }
      // Controle vivo inteiramente sob o cartão (espiada) vira inerte: o foco nunca fica escondido
      undoLive();
      live = m.live;
      undoLive = makeLive(live, layer, (el) => {
        const r = rectOf(el);
        const y = r.y - layout.scrollDelta;
        return r.x >= box.x && y >= box.y && r.x + r.w <= box.x + box.w && y + r.h <= box.y + box.h;
      });

      // Numa correção, 1 px de arredondamento não rola: senão, num encaixe no
      // limite, a página iria e voltaria 1 px e o cartão trocaria de tipo sem parar
      const scrolls = Math.abs(layout.scrollDelta) >= (kind === "fix" ? 2 : 1);
      const smooth = kind === "step" && motionAllowed();
      if (scrolls) scrollBy({ top: layout.scrollDelta, behavior: smooth ? "smooth" : "instant" });
      if (kind === "fix") return;
      focusQuietly(card.querySelector("h2"));
      // O anel entra depois que o furo assentou e a rolagem terminou (o que vier por último)
      const mine = ++token;
      scrolling = smooth && scrolls;
      let waits = scrolling ? 2 : 1;
      const ready = () => {
        if (--waits || mine !== token || stopped) return;
        scrolling = false;
        measure("fix");
        setRingOn(true);
      };
      if (scrolling) waitForScrollEnd(ready);
      timer = setTimeout(ready, ms(lastNav < 0 ? "--motion-sheet-in" : "--motion-emph"));
    };

    const leave = (outcome: "saiu" | "concluido") => {
      if (stopped) return;
      stopped = true;
      unwatch();
      setLeaving(true);
      setRingOn(false);
      timer = setTimeout(() => {
        release();
        latest.current.onExit(outcome);
      }, ms("--motion-sheet-out", true));
    };

    const go = (next: number) => {
      const now = performance.now();
      if (stopped || swapping || next < 0 || now - lastNav < DOUBLE_TAP_MS) return;
      lastNav = now;
      if (next >= STEP_COUNT) return leave("concluido");
      swapping = true;
      token++;
      setPhase("out");
      setRingOn(false);
      timer = setTimeout(() => {
        swapping = false;
        // Saiu durante a troca: fica o passo que estava à vista (e o foco de saída é o dele)
        if (stopped) return;
        setPhase("in");
        latest.current.onStep(next);
      }, ms("--motion-fast", true));
    };

    // Medidas por evento, agrupadas num quadro (nunca durante a rolagem suave)
    const schedule = () => {
      frame ||= requestAnimationFrame(() => {
        frame = 0;
        if (!scrolling) measure("fix");
      });
    };

    // Toque num controle aceso (ou numa cópia de "Ligar"): sai antes da ação, sem preventDefault
    const onClick = (event: MouseEvent) => {
      const control = event.target instanceof Element ? event.target.closest(CONTROLS) : null;
      if (stopped || !control) return;
      if (layer.contains(control) ? !control.closest("[data-tour-copy]") : !live.some((el) => el.contains(control))) return;
      // A camada desmonta em seguida (o passeio pausa ou termina)
      stopped = true;
      release();
      latest.current.onExit("acao");
    };

    // Tab em laço suave: Sair, Voltar e Próximo, depois os controles acesos da página
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || stopped) return;
      const items = [...new Set([card, ...live].flatMap(focusablesIn))];
      event.preventDefault();
      const at = items.findIndex((el) => el === document.activeElement);
      items[event.shiftKey ? (at > 0 ? at : items.length) - 1 : (at + 1) % items.length]?.focus();
    };

    const resize = new ResizeObserver(schedule);
    [document.documentElement, card, document.querySelector(".app-bar-vt")].forEach((el) => el && resize.observe(el));
    // Todos os ouvintes saem juntos ao desmontar
    const off = new AbortController();
    const { signal } = off;
    addEventListener("resize", schedule, { signal });
    addEventListener("orientationchange", schedule, { signal });
    visualViewport?.addEventListener("resize", schedule, { signal });
    document.addEventListener("click", onClick, { capture: true, signal });
    document.addEventListener("keydown", onKey, { capture: true, signal });

    controls.current = {
      show: (next) => {
        const kind = next === shown ? "fix" : "step";
        shown = next;
        measure(kind);
      },
      go,
      leave: () => leave("saiu"),
      // Toque no escuro: o cartão acena para mostrar onde estão os botões
      nudge: () => {
        if (stopped || !motionAllowed()) return;
        delete card.dataset.nudge;
        void card.offsetWidth;
        card.dataset.nudge = "";
      },
    };
    return () => {
      stopped = true;
      controls.current = null;
      release();
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      resize.disconnect();
      off.abort();
    };
  }, []);

  // Troca de passo (ou de variante): mede e aplica antes de pintar
  useLayoutEffect(() => controls.current?.show(step), [step, account]);

  const layout = view?.layout;
  const hole = layout?.hole;
  const typo = layout?.typo ?? "normal";
  const caret = layout?.caret;
  const label = stepLabel(step);
  // Antes da primeira medida, variantes provisórias: a medida seguinte corrige
  const content = stepContent(step, { nav: view?.nav ?? "barra", duty: view?.duty ?? "carregando", account });
  const go = (delta: number) => controls.current?.go(step + delta);
  // clip-path com path() existe em todo navegador que roda o pacote (es2022)
  return createPortal(
    <div ref={layerRef} className={classes.layer} data-tour-layer="" data-leaving={leaving || undefined}>
      <div
        data-tour-scrim
        style={{ clipPath: view ? holePath(view.vw, view.vh, hole && { ...hole, r: view.layout.radius }, view.layout.callHoles) : undefined }}
        onClick={() => controls.current?.nudge()}
        aria-hidden
      />
      {hole && layout && (
        <div
          data-tour-ring
          data-on={ringOn || undefined}
          data-pulse={content.pulse || undefined}
          style={{ width: hole.w, height: hole.h, borderRadius: layout.radius, transform: `translate(${hole.x}px, ${hole.y}px)` }}
          aria-hidden
        />
      )}
      {/* Cartão do passo: diálogo não modal; a página acesa continua funcionando */}
      <section
        ref={cardRef}
        data-tour-card
        role="dialog"
        aria-modal="false"
        aria-labelledby="passeio-t"
        aria-describedby={`passeio-${typo === "curto" ? "s" : "l"}${content.note ? " passeio-n" : ""}`}
        data-typo={typo}
        style={layout && { transform: `translate(${layout.card.x}px, ${layout.card.y}px)` }}
        onKeyDown={(event) => {
          // Setas valem Voltar e Próximo com o foco no cartão
          const delta = ARROWS[event.key];
          if (!delta || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
          event.preventDefault();
          go(delta);
        }}
      >
        {/* Linha de cima, conteúdo e botões: <div> e não header/footer, que
            dentro do role="dialog" virariam marcos (banner, contentinfo) da página */}
        <div key={step} data-tour-phase={phase}>
          <div>
            <span aria-hidden>{label}</span>
            <button type="button" onClick={() => controls.current?.leave()}>
              Sair do passeio
            </button>
          </div>
          <div>
            <h2 id="passeio-t" tabIndex={-1}>
              <span className="visually-hidden">{label}. </span>
              {content.title}
            </h2>
            <p id="passeio-l">{content.text}</p>
            <p id="passeio-s">{content.short}</p>
            {content.note && <p id="passeio-n">{content.note}</p>}
            {/* Modo centro do passo 2: cópias dos "Ligar" da página */}
            {view?.copies.length ? (
              <div data-tour-copies>
                {view.copies.map((copy) => (
                  <a key={copy.href + copy.label} href={copy.href} data-tour-copy data-variant={copy.variant}>
                    {copy.label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
          <div>
            {step > 0 && (
              <button type="button" onClick={() => go(-1)} data-back>
                Voltar
              </button>
            )}
            {/* A seta do Próximo vem do CSS; Concluir não tem seta */}
            <button type="button" onClick={() => go(1)} data-next={content.primary}>
              {content.primary}
            </button>
          </div>
          {caret && <span data-caret={caret.side} style={{ "--at": `${caret.at}px` } as CSSProperties} aria-hidden />}
        </div>
      </section>
    </div>,
    document.body,
  );
}
