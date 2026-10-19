import { useCallback, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { useCollapsedTitle } from "@/hooks/useCollapsedTitle";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useFocusOnNavigate } from "@/hooks/useFocusOnNavigate";
import { useUnreadNotices } from "@/hooks/useUnreadNotices";
import { AppBar } from "./chrome/AppBar";
import { ChromeContext, type ChromeOverrides } from "./chrome/chromeContext";
import { NavRail } from "./chrome/NavRail";
import { TabBar } from "./chrome/TabBar";
import classes from "./CitizenLayout.module.css";
import { NewRequestSheet } from "./NewRequestSheet";
import { RequestSheetContext } from "./requestSheetContext";
import { useRouteHandle } from "./routeHandle";

/**
 * Casca do app do cidadão: barra superior verde, barra de abas (celular) ou
 * trilho lateral (tablet/computador) e a folha "Solicitar".
 */
export function CitizenLayout() {
  const handle = useRouteHandle();
  const { pathname } = useLocation();
  const [overrides, setOverrides] = useState<ChromeOverrides | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const barRef = useRef<HTMLElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasUnreadNotices = useUnreadNotices();

  const { chrome } = handle;
  const title = overrides?.title ?? handle.title;
  const collapsed = useCollapsedTitle(sentinelRef, barRef, chrome === "root" || chrome === "push", pathname);
  useDocumentTitle(title);
  useFocusOnNavigate(pathname);

  const openSheet = useCallback(() => setSheetOpen(true), []);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  return (
    <div className={`citizen ${classes.shell}`} data-chrome={chrome}>
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>
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
            <div className={classes.inner}>
              <ChromeContext.Provider value={setOverrides}>
                <RequestSheetContext.Provider value={openSheet}>
                  <Outlet />
                </RequestSheetContext.Provider>
              </ChromeContext.Provider>
            </div>
          </div>
        </main>
      </div>

      {chrome !== "flow" && <TabBar sheetOpen={sheetOpen} onRequest={openSheet} hasUnreadNotices={hasUnreadNotices} />}
      <NewRequestSheet open={sheetOpen} onClose={closeSheet} />
    </div>
  );
}
