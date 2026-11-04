import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { InShellContext } from "@/components/LoadingScreen";
import { shouldShowWhatsNew } from "@/features/onboarding/onboardingState";
import {
  clearTourRequest,
  consumeTourLinkRequest,
  getTourRequest,
  requestTour,
  shouldOfferTour,
  useTourRequest,
  type TourMode,
} from "@/features/tour/tourState";
import { useCollapsedTitle } from "@/hooks/useCollapsedTitle";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useFocusOnNavigate } from "@/hooks/useFocusOnNavigate";
import { useOnline } from "@/hooks/useOnline";
import { useUnreadNotices } from "@/hooks/useUnreadNotices";
import { AppBar } from "./chrome/AppBar";
import { ChromeContext, type ChromeOverrides } from "./chrome/chromeContext";
import { NavRail } from "./chrome/NavRail";
import { SkipLink } from "./chrome/SkipLink";
import { TabBar } from "./chrome/TabBar";
import { useHistoryTrail } from "./chrome/tabHistory";
import { useChromeContextMenu } from "./chrome/useChromeContextMenu";
import { useScreenEntrance } from "./chrome/useScreenEntrance";
import classes from "./CitizenLayout.module.css";
import { NewRequestSheet } from "./NewRequestSheet";
import { RequestSheetContext } from "./requestSheetContext";
import { useRouteHandle } from "./routeHandle";

const WhatsNewSheet = lazy(() => import("@/features/onboarding/WhatsNewSheet"));

/** O passeio pela tela inicial (pedaço sob demanda; só o tipo vem aqui) */
type HomeTourComponent = (typeof import("@/features/tour/HomeTour"))["default"];

/** Oferta: o pedaço baixa quando o aparelho fica ocioso, em até 2 s */
const TOUR_IDLE_TIMEOUT_MS = 2000;
/** Sem requestIdleCallback (Safari): um pouco depois da primeira pintura */
const TOUR_IDLE_FALLBACK_MS = 300;

// Um só download por carga da página; depois de uma falha, a próxima vez pede de novo
let tourModule: Promise<HomeTourComponent> | null = null;

function loadHomeTour(): Promise<HomeTourComponent> {
  tourModule ??= import("@/features/tour/HomeTour").then(
    (module) => module.default,
    (error: unknown) => {
      tourModule = null;
      throw error;
    },
  );
  return tourModule;
}

/**
 * Baixa o passeio só para quem vai vê-lo: ocioso na oferta, na hora num pedido
 * manual. Sem React.lazy (o padrão do DeferredNotifications): uma falha não
 * derruba a casca, só desliga a oferta ou avisa quem pediu.
 */
function useHomeTour(mode: TourMode | null, onFail: (mode: TourMode) => void): HomeTourComponent | null {
  const [component, setComponent] = useState<HomeTourComponent | null>(null);
  useEffect(() => {
    if (mode === null || component !== null) return undefined;
    let cancelled = false;
    const load = () => {
      loadHomeTour().then(
        (loaded) => {
          if (!cancelled) setComponent(() => loaded);
        },
        (error: unknown) => {
          if (import.meta.env.DEV) console.error("[passeio] o pedaço do passeio não carregou", error);
          if (!cancelled) onFail(mode);
        },
      );
    };
    if (mode === "manual") {
      load();
      return () => {
        cancelled = true;
      };
    }
    if (typeof window.requestIdleCallback !== "function") {
      const timer = window.setTimeout(load, TOUR_IDLE_FALLBACK_MS);
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
      };
    }
    const idle = window.requestIdleCallback(load, { timeout: TOUR_IDLE_TIMEOUT_MS });
    return () => {
      cancelled = true;
      window.cancelIdleCallback(idle);
    };
  }, [mode, component, onFail]);
  return component;
}

/**
 * Casca do app do cidadão: barra superior verde, barra de abas (celular) ou
 * trilho lateral (tablet/computador) e a folha "Solicitar".
 */
export function CitizenLayout() {
  const handle = useRouteHandle();
  const { pathname, key: locationKey } = useLocation();
  const online = useOnline();
  const [overrides, setOverrides] = useState<ChromeOverrides | null>(null);
  // A folha "Solicitar" pertence à tela em que foi aberta: qualquer troca de
  // tela (inclusive o voltar do navegador ou o gesto do iPhone) a fecha
  const [sheetKey, setSheetKey] = useState<string | null>(null);
  const sheetOpen = sheetKey === locationKey;
  const barRef = useRef<HTMLElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const hasUnreadNotices = useUnreadNotices();

  const { chrome } = handle;
  const atHome = pathname === "/" && chrome === "home";
  const title = overrides?.title ?? handle.title;
  // O aviso "Sem internet" muda a altura da barra: o observador é refeito
  const collapsed = useCollapsedTitle(sentinelRef, barRef, chrome === "root" || chrome === "push", `${pathname}|${online}`);
  useDocumentTitle(title);
  useFocusOnNavigate(pathname);
  useHistoryTrail();
  useScreenEntrance(innerRef, pathname);
  useChromeContextMenu();

  // "Novidade" só na Início e só para quem já usava o app: decidida uma vez
  // e desligada quando a folha fecha (não volta ao retornar à Início)
  const [whatsNew, setWhatsNew] = useState(shouldShowWhatsNew);
  const whatsNewDone = useCallback(() => setWhatsNew(false), []);

  // Passeio pela tela inicial: a oferta é decidida uma vez, como a Novidade, e
  // as duas nunca aparecem juntas; um pedido manual ("Como usar o app", Perfil)
  // passa na frente da oferta
  const [tourOffer, setTourOffer] = useState(shouldOfferTour);
  const tourRequest = useTourRequest();
  const tourMode: TourMode | null = tourRequest ? "manual" : tourOffer && !whatsNew ? "oferta" : null;
  const tourDone = useCallback(() => {
    setTourOffer(false);
    clearTourRequest();
  }, []);
  const tourFailed = useCallback((mode: TourMode) => {
    // Oferta: some só desta sessão, sem tentar de novo em laço
    if (mode === "oferta") {
      setTourOffer(false);
      return;
    }
    getTourRequest()?.onFail?.();
    clearTourRequest();
  }, []);
  const HomeTour = useHomeTour(atHome ? tourMode : null, tourFailed);

  // Pedido do Perfil (/?passeio=1): o loader o guardou; a Início o consome uma
  // vez, a cada navegação que chega nela
  useEffect(() => {
    if (atHome && consumeTourLinkRequest()) requestTour({ source: "perfil", origin: null });
  }, [atHome, locationKey]);

  // Saiu da Início: o passeio desmonta sem onDone, e o pedido não fica para a volta
  useEffect(() => {
    if (!atHome) clearTourRequest();
  }, [atHome]);

  const openSheet = useCallback(() => setSheetKey(locationKey), [locationKey]);
  const closeSheet = useCallback(() => setSheetKey(null), []);

  return (
    <div className={`citizen ${classes.shell}`} data-chrome={chrome}>
      <SkipLink />
      {chrome !== "flow" && <NavRail sheetOpen={sheetOpen} onRequest={openSheet} hasUnreadNotices={hasUnreadNotices} />}

      <div className={classes.column}>
        <AppBar
          ref={barRef}
          chrome={chrome}
          title={title}
          collapsed={collapsed}
          back={handle.back}
          actions={overrides?.actions}
          progress={overrides?.progress}
          onClose={overrides?.onClose}
        />
        <main id="conteudo" tabIndex={-1} className={classes.main}>
          {chrome === "root" && title && (
            <div className={classes.band}>
              <h1 className={classes.bandTitle}>{title}</h1>
            </div>
          )}
          <div ref={sentinelRef} className={classes.sentinel} aria-hidden />
          <div className={classes.content}>
            <div ref={innerRef} className={classes.inner}>
              <InShellContext.Provider value>
                <ChromeContext.Provider value={setOverrides}>
                  <RequestSheetContext.Provider value={openSheet}>
                    <Outlet />
                  </RequestSheetContext.Provider>
                </ChromeContext.Provider>
              </InShellContext.Provider>
            </div>
          </div>
        </main>
      </div>

      {chrome !== "flow" && <TabBar sheetOpen={sheetOpen} onRequest={openSheet} hasUnreadNotices={hasUnreadNotices} />}
      <NewRequestSheet open={sheetOpen} onClose={closeSheet} />
      {atHome && tourMode && HomeTour && <HomeTour key={tourMode} mode={tourMode} request={tourRequest} onDone={tourDone} />}
      {whatsNew && atHome && !tourMode && (
        <Suspense fallback={null}>
          <WhatsNewSheet onDone={whatsNewDone} />
        </Suspense>
      )}
    </div>
  );
}
