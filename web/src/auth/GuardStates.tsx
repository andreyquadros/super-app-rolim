import { IconCloudOff, IconRefresh } from "@tabler/icons-react";
import { useId } from "react";
import { useRouteHandle } from "@/layouts/routeHandle";
import classes from "./GuardStates.module.css";

/** Enquanto a conta carrega: a casca já está na tela, só o conteúdo espera. */
export function GuardSkeleton() {
  return (
    <div className={classes.skeleton} aria-busy>
      <p className="visually-hidden" role="status">
        Carregando
      </p>
      <div className={`${classes.skLine} shimmer`} aria-hidden />
      <div className={`${classes.skCard} shimmer`} aria-hidden />
      <div className={`${classes.skCard} shimmer`} aria-hidden />
    </div>
  );
}

interface ProfileUnavailableProps {
  onRetry: () => void;
}

/**
 * O servidor não respondeu e não há cadastro salvo no aparelho. Não dá para
 * saber se falta o cadastro, então não pede CPF e telefone de novo.
 */
export function ProfileUnavailable({ onRetry }: ProfileUnavailableProps) {
  const { chrome } = useRouteHandle();
  const titleId = useId();
  // Nas telas das abas o h1 é o título da casca
  const Title = chrome === "root" ? "h2" : "h1";
  return (
    <section className={classes.problem} aria-labelledby={titleId}>
      <span className={classes.problemIcon} aria-hidden>
        <IconCloudOff size={30} />
      </span>
      <div role="alert" className={classes.problemCopy}>
        <Title id={titleId} className={classes.problemTitle}>
          Não foi possível carregar seu cadastro
        </Title>
        <p className={classes.problemText}>Confira se a internet está funcionando e tente de novo.</p>
      </div>
      <button type="button" className={classes.retry} onClick={onRetry} data-press>
        <IconRefresh size={22} aria-hidden />
        Tentar de novo
      </button>
    </section>
  );
}
