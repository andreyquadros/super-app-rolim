import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { useCallback, useEffect, useId, useRef } from "react";
import { useSearchParams } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { useAppNavigate } from "@/components/AppLink";
import { BrandMark } from "@/components/brand/BrandMark";
import { APP_NAME, MAINTAINER_LINE } from "@/config/city";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { completeOnboarding } from "./onboardingState";
import classes from "./OnboardingPage.module.css";
import { SettingsPanel } from "./SettingsPanel";
import { Slide, SLIDES } from "./slides";
import { usePager } from "./usePager";

const TOTAL = SLIDES.length;
const LAST = TOTAL - 1;

function isTextField(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
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

  const start = useCallback(() => {
    completeOnboarding();
    if (reviewing) {
      backToProfile();
      return;
    }
    navigate("/", { replace: true, nav: "tab" });
  }, [navigate, reviewing, backToProfile]);

  const signIn = useCallback(() => {
    completeOnboarding();
    navigate("/entrar?next=/", { replace: true, nav: "flow" });
  }, [navigate]);

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
        start();
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
      <div className={classes.top}>
        <div className={classes.topRow}>
          <span className={classes.brand} aria-hidden>
            <BrandMark variant="onGreen" />
          </span>
          {!isLast && (
            <button type="button" className={classes.skip} onClick={start} data-press>
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
              <p className={classes.maintainer}>
                <img src="/logo.svg" alt="" width={28} height={28} />
                <span>{MAINTAINER_LINE}</span>
              </p>
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
            {isLast ? (
              <button type="button" className={classes.next} onClick={start} data-press>
                Começar a usar
              </button>
            ) : (
              <button type="button" className={classes.next} onClick={() => goTo(index + 1)} data-press>
                Próximo
                <IconArrowRight size={22} stroke={2.2} aria-hidden />
              </button>
            )}
          </div>
          {/* No rodapé fixo, e não no fim do slide: sempre à vista, sem rolar */}
          {isLast && !signedIn && (
            <button type="button" className={classes.signIn} onClick={signIn} data-press>
              Entrar ou criar conta
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
