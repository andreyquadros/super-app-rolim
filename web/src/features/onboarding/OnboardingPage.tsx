import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { useAppNavigate } from "@/components/AppLink";
import { BrandMark } from "@/components/brand/BrandMark";
import { MaintainerCredit } from "@/components/brand/MaintainerCredit";
import { APP_NAME } from "@/config/city";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { markTourPending } from "@/features/tour/tourState";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { completeOnboarding } from "./onboardingState";
import classes from "./OnboardingPage.module.css";
import { SettingsPanel } from "./SettingsPanel";
import { Slide, SLIDES } from "./slides";
import { usePager } from "./usePager";

const TOTAL = SLIDES.length;
const LAST = TOTAL - 1;

/** Como a apresentação terminou: só "Começar a usar" deixa o passeio pendente */
type Exit = "comecar" | "pular";

function isTextField(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}

/** Prazo da pré-carga ociosa do passeio (o mesmo da Início) */
const TOUR_PREFETCH_MS = 2000;

/** Último slide: baixa o passeio enquanto a pessoa lê (uma vez; erro ignorado, a Início tenta de novo). */
function usePrefetchTour(enabled: boolean): void {
  const done = useRef(false);
  useEffect(() => {
    // Modo leve: economia de dados, o passeio só baixa se for mostrado
    if (!enabled || done.current || document.documentElement.dataset.motion === "lite") return;
    done.current = true;
    const load = () => {
      import("@/features/tour/HomeTour").catch(() => undefined);
    };
    if (window.requestIdleCallback) window.requestIdleCallback(load, { timeout: TOUR_PREFETCH_MS });
    else window.setTimeout(load, 300);
  }, [enabled]);
}

/**
 * Apresentação dos primeiros acessos (/boas-vindas), fora da casca do app.
 * Pager com scroll-snap; Pular, Começar a usar e Entrar concluem.
 */
export default function OnboardingPage() {
  const headingId = useId();
  const navigate = useAppNavigate();
  const [params] = useSearchParams();
  const reviewing = params.get("rever") === "1";
  const { user, profile, staff, loading } = useAuth();
  const { ref: pagerRef, index, goTo } = usePager(TOTAL);
  const titles = useRef<(HTMLHeadingElement | null)[]>([]);
  const shownIndex = useRef(index);
  const isLast = index === LAST;
  const signedIn = user !== null;
  useDocumentTitle("Boas-vindas");
  // Revendo pelo Perfil: sair devolve para lá (e não para a Início)
  const backToProfile = useBackNavigation("/perfil");

  // O rótulo do botão principal entra suave só quando troca (Próximo ↔ Começar
  // a usar), nunca ao montar nem de um Próximo para outro
  const [labelSwapped, setLabelSwapped] = useState(false);
  useEffect(() => {
    if (isLast) setLabelSwapped(true);
  }, [isLast]);
  usePrefetchTour(isLast && !reviewing);

  const start = useCallback(
    (exit: Exit) => {
      completeOnboarding();
      if (reviewing) {
        backToProfile();
        return;
      }
      if (exit === "comecar") markTourPending();
      navigate("/", { replace: true, nav: "tab" });
      // Depois do setNavKind (que limpa o escopo): no celular, a faixa verde
      // da ilustração vira o cabeçalho da Início
      document.documentElement.dataset.navScope = "welcome";
    },
    [navigate, reviewing, backToProfile],
  );

  const signIn = useCallback(() => {
    completeOnboarding();
    if (!reviewing) markTourPending();
    navigate("/entrar?next=/", { replace: true, nav: "flow" });
  }, [navigate, reviewing]);

  // Quem já tem conta não precisa da apresentação (a não ser que peça para rever)
  useEffect(() => {
    if (loading || reviewing || !user || !(profile || staff)) return;
    completeOnboarding();
    navigate("/", { replace: true, nav: "tab" });
  }, [loading, reviewing, user, profile, staff, navigate]);

  // Trocou de slide: o foco vai para o título (o leitor de tela lê, sem aria-live)
  useEffect(() => {
    if (shownIndex.current === index) return;
    shownIndex.current = index;
    titles.current[index]?.focus({ preventScroll: true });
  }, [index]);

  // Setas trocam de slide; Esc equivale a Pular
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      // Folha aberta (como instalar no iPhone): o Esc é dela
      if (document.querySelector("dialog[open]")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        start("pular");
        return;
      }
      if (isTextField(event.target)) return;
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(index + (event.key === "ArrowRight" ? 1 : -1));
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [goTo, index, start]);

  return (
    <main className={classes.page} aria-labelledby={headingId}>
      {/* app-bar-vt: a faixa da marca vira a barra da Início sem se mover */}
      <div className={`${classes.top} app-bar-vt`}>
        <div className={classes.topRow}>
          <span className={classes.brand} aria-hidden>
            <BrandMark variant="onGreen" />
          </span>
          {!isLast && (
            <button type="button" className={classes.skip} onClick={() => start("pular")} data-press>
              Pular
            </button>
          )}
        </div>
      </div>

      <h1 id={headingId} className="visually-hidden">
        Apresentação do {APP_NAME}
      </h1>

      <div ref={pagerRef} className={classes.pager}>
        {SLIDES.map((copy, i) => (
          <Slide
            key={copy.id}
            copy={copy}
            position={i + 1}
            total={TOTAL}
            active={i === index}
            titleRef={(element) => {
              titles.current[i] = element;
            }}
          >
            {i === 0 && (
              <MaintainerCredit className={classes.maintainer} />
            )}
            {i === LAST && <SettingsPanel />}
          </Slide>
        ))}
      </div>

      <div className={classes.footer}>
        <div className={classes.footerInner}>
          <p className={classes.dots}>
            <span className="visually-hidden">
              Passo {index + 1} de {TOTAL}
            </span>
            {SLIDES.map((copy, i) => (
              <span key={copy.id} className={classes.dot} data-active={i === index || undefined} aria-hidden />
            ))}
          </p>
          <div className={classes.buttons}>
            {index > 0 && (
              <button type="button" className={classes.back} onClick={() => goTo(index - 1)} data-press>
                <IconArrowLeft size={22} stroke={2.2} aria-hidden />
                Voltar
              </button>
            )}
            {/* Um só botão (o foco não se perde); só o rótulo troca, pela key */}
            <button type="button" className={classes.next} onClick={isLast ? () => start("comecar") : () => goTo(index + 1)} data-press>
              <span key={isLast ? "comecar" : "proximo"} className={classes.label} data-swap={isLast || labelSwapped || undefined}>
                {isLast ? (
                  "Começar a usar"
                ) : (
                  <>
                    Próximo
                    <IconArrowRight size={22} stroke={2.2} aria-hidden />
                  </>
                )}
              </span>
            </button>
          </div>
          {/* No rodapé fixo, e não no fim do slide: sempre à vista, sem rolar */}
          {isLast && !signedIn && (
            <button type="button" className={`${classes.signIn} enter-rise`} onClick={signIn} data-press>
              Entrar ou criar conta
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
