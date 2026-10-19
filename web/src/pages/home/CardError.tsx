import { IconRefresh } from "@tabler/icons-react";
import classes from "./CardError.module.css";

interface CardErrorProps {
  onRetry: () => void;
}

/** Erro dentro do próprio cartão: o resto da Início continua funcionando. */
export function CardError({ onRetry }: CardErrorProps) {
  return (
    <div className={classes.error} role="alert">
      <p className={classes.text}>Não foi possível carregar.</p>
      <button type="button" className={classes.retry} onClick={onRetry} data-press>
        <IconRefresh size={18} aria-hidden />
        Tentar de novo
      </button>
    </div>
  );
}

interface SkeletonProps {
  /** Altura final do conteúdo (evita a tela pular quando os dados chegam) */
  height: number;
}

export function CardSkeleton({ height }: SkeletonProps) {
  return <div className={`${classes.skeleton} shimmer`} style={{ height }} aria-hidden />;
}
