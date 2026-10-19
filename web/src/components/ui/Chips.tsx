import type { ButtonHTMLAttributes, ReactNode } from "react";
import classes from "./Chips.module.css";

interface ChipRowProps {
  /** Nome do grupo para leitores de tela, ex.: "Filtrar pedidos" */
  label: string;
  children: ReactNode;
}

/** Linha de chips com rolagem horizontal (sem quebrar a tela em 320 px). */
export function ChipRow({ label, children }: ChipRowProps) {
  return (
    <div className={classes.row} role="group" aria-label={label}>
      {children}
    </div>
  );
}

interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  pressed: boolean;
  icon?: ReactNode;
  /** "filter" (padrão) fica verde cheio; "action" fica verde claro */
  kind?: "filter" | "action";
}

/** Chip de 44 px: filtro (aria-pressed) ou ação ("Perto de mim", "Mapa"). */
export function Chip({ pressed, icon, kind = "filter", children, className, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      className={className ? `${classes.chip} ${className}` : classes.chip}
      aria-pressed={pressed}
      data-kind={kind}
      data-press
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
