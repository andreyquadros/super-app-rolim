import { useLayoutEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { motionAllowed } from "@/lib/navMotion";
import classes from "./Chips.module.css";

interface ChipRowProps {
  /** Nome do grupo para leitores de tela, ex.: "Filtrar pedidos" */
  label: string;
  children: ReactNode;
  /** Quebra em linhas em vez de rolar de lado (todos os chips sempre à vista) */
  wrap?: boolean;
}

/** Rola só a linha (nunca a página) até o chip ficar inteiro à vista, fora da margem. */
function revealChip(row: HTMLElement, chip: HTMLElement, smooth: boolean) {
  const gutter = parseFloat(getComputedStyle(row).paddingLeft) || 0;
  const rowBox = row.getBoundingClientRect();
  const chipBox = chip.getBoundingClientRect();
  let delta = 0;
  if (chipBox.left < rowBox.left + gutter) delta = chipBox.left - rowBox.left - gutter;
  else if (chipBox.right > rowBox.right - gutter) delta = chipBox.right - rowBox.right + gutter;
  if (Math.abs(delta) < 1) return;
  row.scrollTo({ left: row.scrollLeft + delta, behavior: smooth ? "smooth" : "auto" });
}

/** Linha de chips com rolagem horizontal (sem quebrar a tela em 320 px). */
export function ChipRow({ label, children, wrap = false }: ChipRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const shown = useRef<{ chip: HTMLElement; width: number } | null>(null);

  // O filtro escolhido (inclusive o que veio no endereço) fica sempre à vista
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row || wrap) return;
    const chip = row.querySelector<HTMLElement>('[data-kind="filter"][aria-pressed="true"]');
    if (!chip) return;
    const width = chip.offsetWidth;
    const last = shown.current;
    // Só quando o chip marcado muda (ou cresce com a contagem): não briga com a rolagem da pessoa
    if (last && last.chip === chip && last.width === width) return;
    shown.current = { chip, width };
    revealChip(row, chip, last !== null && last.chip !== chip && motionAllowed());
  });

  return (
    <div ref={rowRef} className={classes.row} role="group" aria-label={label} data-wrap={wrap || undefined}>
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
