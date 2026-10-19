import classes from "./ConfirmActions.module.css";

interface ConfirmActionsProps {
  /** Ação segura ("Continuar preenchendo", "Não, manter pedido") */
  keepLabel: string;
  onKeep: () => void;
  /** Ação que desfaz ou apaga algo ("Descartar", "Sim, cancelar pedido") */
  confirmLabel: string;
  onConfirm: () => void;
  busy?: boolean;
  /** Rótulo enquanto a ação acontece ("Cancelando…") */
  busyLabel?: string;
}

/**
 * Botões das folhas de confirmação, sempre no mesmo lugar e no mesmo estilo:
 * a ação segura primeiro, em verde cheio e com o foco ao abrir a folha;
 * a ação que não tem volta depois, em barro claro.
 */
export function ConfirmActions({ keepLabel, onKeep, confirmLabel, onConfirm, busy = false, busyLabel }: ConfirmActionsProps) {
  return (
    <div className={classes.actions}>
      <button type="button" className={classes.keep} onClick={onKeep} data-autofocus data-press>
        {keepLabel}
      </button>
      <button type="button" className={classes.confirm} onClick={onConfirm} disabled={busy} aria-busy={busy || undefined} data-press>
        {busy && busyLabel ? busyLabel : confirmLabel}
      </button>
    </div>
  );
}
