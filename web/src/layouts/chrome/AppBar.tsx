import { IconChevronLeft, IconX } from "@tabler/icons-react";
import { forwardRef, type ReactNode } from "react";
import { useLocation } from "react-router";
import { BrandMark } from "@/components/brand/BrandMark";
import { AppLink } from "@/components/AppLink";
import { OfflineBanner } from "@/components/AppStatus";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import type { Chrome } from "../routeHandle";
import { AccountButton } from "./AccountButton";
import classes from "./AppBar.module.css";

const MAX_BACK_LABEL = 14;

interface AppBarProps {
  chrome: Chrome;
  /** Título compacto (aparece quando o título grande sai da tela) */
  title?: string;
  collapsed: boolean;
  back: { to: string; label: string };
  actions?: ReactNode;
  progress?: { step: number; total: number };
  onClose?: () => void;
}

function Progress({ step, total }: { step: number; total: number }) {
  return (
    <div className={classes.progress} aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={classes.segment} data-done={i < step || undefined} />
      ))}
    </div>
  );
}

/** Barra superior verde: protege relógio e bateria do iPhone em todas as telas. */
export const AppBar = forwardRef<HTMLElement, AppBarProps>(function AppBar(
  { chrome, title, collapsed, back, actions, progress, onClose },
  ref,
) {
  const goBack = useBackNavigation(back.to);
  const { pathname } = useLocation();
  const backLabel = back.label.length <= MAX_BACK_LABEL ? back.label : "Voltar";
  const showAccount = (chrome === "home" || chrome === "root") && !pathname.startsWith("/perfil");

  return (
    <header ref={ref} className={`${classes.bar} app-bar-vt`} data-chrome={chrome} data-collapsed={collapsed || undefined}>
      <div className={classes.row}>
        {chrome !== "root" && (
          <div className={classes.start}>
            {chrome === "home" && (
              <AppLink to="/" nav="tab" className={classes.brandLink} aria-label="SUPER APP Rolim de Moura, início">
                <BrandMark variant="onGreen" />
              </AppLink>
            )}
            {chrome === "push" && (
              <button type="button" className={classes.back} onClick={goBack} data-press>
                <IconChevronLeft size={26} stroke={2.2} aria-hidden />
                <span>{backLabel}</span>
              </button>
            )}
            {chrome === "flow" && (
              <button type="button" className={classes.close} onClick={onClose ?? goBack} aria-label="Fechar" data-press>
                <IconX size={24} stroke={2.2} aria-hidden />
              </button>
            )}
          </div>
        )}

        {chrome !== "home" && (
          <span className={classes.title} aria-hidden={chrome !== "flow" || undefined}>
            {title}
          </span>
        )}

        <div className={classes.end}>
          {chrome === "push" && actions}
          {/* No tablet e no computador, Perfil/Entrar ficam no trilho lateral */}
          {showAccount && (
            <span className={classes.account}>
              <AccountButton />
            </span>
          )}
        </div>
      </div>
      {chrome === "flow" && progress && progress.total > 1 && <Progress {...progress} />}
      <OfflineBanner placement="bar" />
    </header>
  );
});
