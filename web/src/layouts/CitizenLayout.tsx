import { lazy, Suspense, useCallback, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { InShellContext } from "@/components/LoadingScreen";
import { shouldShowWhatsNew } from "@/features/onboarding/onboardingState";
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
      {whatsNew && pathname === "/" && (
        <Suspense fallback={null}>
          <WhatsNewSheet onDone={whatsNewDone} />
        </Suspense>
      )}
    </div>
  );
}
