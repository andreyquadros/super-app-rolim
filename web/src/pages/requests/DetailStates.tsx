import { IconCloudOff, IconFileSearch, IconRefresh } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { AppLink } from "@/components/AppLink";
import classes from "./detail.module.css";

/** Esqueleto com as alturas finais (sem pulo quando o pedido chega). */
export function DetailSkeleton() {
  return (
    <div className={classes.page} aria-busy>
      <p className="visually-hidden" role="status">
        Carregando o pedido…
      </p>
      <div className={`${classes.skTitle} shimmer`} aria-hidden />
      <div className={`${classes.skCard} shimmer`} aria-hidden />
      <div className={`${classes.skBlock} shimmer`} aria-hidden />
      <div className={`${classes.skList} shimmer`} aria-hidden />
    </div>
  );
}

interface ProblemProps {
  icon: ReactNode;
  title: string;
  text: string;
  children: ReactNode;
}

function Problem({ icon, title, text, children }: ProblemProps) {
  return (
    <div className={classes.problem}>
      <span className={classes.problemIcon} aria-hidden>
        {icon}
      </span>
      <h1 className={classes.problemTitle}>{title}</h1>
      <p className={classes.problemText}>{text}</p>
      <div className={classes.problemActions}>{children}</div>
    </div>
  );
}

function BackToList({ secondary = false }: { secondary?: boolean }) {
  return (
    <AppLink to="/protocolos" nav="pop" replace className={secondary ? classes.secondaryAction : classes.primaryAction} data-press>
      Ver meus pedidos
    </AppLink>
  );
}

/** Pedido inexistente ou de outra conta (as regras não deixam distinguir). */
export function DetailMissing() {
  return (
    <Problem
      icon={<IconFileSearch size={30} />}
      title="Não encontramos este pedido"
      text="O endereço pode estar incompleto ou o pedido foi feito com outra conta. Confira se você entrou com a conta certa."
    >
      <BackToList />
    </Problem>
  );
}

export function DetailError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Problem icon={<IconCloudOff size={30} />} title="Não foi possível abrir o pedido" text={message}>
      <button type="button" className={classes.primaryAction} onClick={onRetry} data-press>
        <IconRefresh size={20} aria-hidden />
        Tentar de novo
      </button>
      <BackToList secondary />
    </Problem>
  );
}
