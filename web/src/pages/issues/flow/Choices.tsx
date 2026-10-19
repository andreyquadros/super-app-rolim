import { IconCheck, IconChevronRight, IconPencil, type Icon } from "@tabler/icons-react";
import type { CSSProperties, ReactNode } from "react";
import classes from "./choices.module.css";

export interface ChoiceOption<V extends string> {
  value: V;
  label: string;
  hint: string;
  icon: Icon;
  /** Cor do ícone: mata (padrão), barro (reclamação) ou ardósia (neutro) */
  tone?: "mata" | "barro" | "slate";
}

interface ChoiceListProps<V extends string> {
  options: ReadonlyArray<ChoiceOption<V>>;
  value: V | null | "";
  onSelect: (value: V) => void;
  /** id do título que nomeia a lista (a pergunta ou o subtítulo do grupo) */
  labelledBy: string;
  /** Posição do primeiro item na entrada escalonada */
  offset?: number;
}

/** Blocos grandes do primeiro passo: tocar escolhe e já avança. */
export function ChoiceList<V extends string>({ options, value, onSelect, labelledBy, offset = 0 }: ChoiceListProps<V>) {
  return (
    <ul className={classes.choices} aria-labelledby={labelledBy}>
      {options.map((option, i) => {
        const selected = option.value === value;
        return (
          <li key={option.value} className="enter-rise" style={{ "--i": offset + i } as CSSProperties}>
            <button
              type="button"
              className={classes.choice}
              data-tone={option.tone ?? "mata"}
              data-selected={selected || undefined}
              onClick={() => onSelect(option.value)}
              data-press
            >
              <span className={classes.choiceIcon} aria-hidden>
                <option.icon size={28} stroke={1.7} />
              </span>
              <span className={classes.choiceText}>
                <span className={classes.choiceTitle}>{option.label}</span>
                <span className={classes.choiceHint}>{option.hint}</span>
                {selected && (
                  <span className={classes.chosen}>
                    <IconCheck size={18} stroke={2.4} aria-hidden />
                    Escolhido
                  </span>
                )}
              </span>
              <IconChevronRight size={22} className={classes.chevron} aria-hidden />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export interface ReviewEntry {
  key: string;
  label: string;
  icon: ReactNode;
  value: ReactNode;
  /** Passo onde o dado é alterado */
  step: number;
  /** Complemento do nome acessível: "Alterar o local" */
  editName: string;
}

interface ReviewListProps {
  entries: ReadonlyArray<ReviewEntry>;
  onEdit: (step: number) => void;
}

/** "Confira e envie": cada dado com o botão Alterar, que volta ao passo. */
export function ReviewList({ entries, onEdit }: ReviewListProps) {
  return (
    <ul className={classes.review}>
      {entries.map((entry, i) => (
        <li key={entry.key} className={`${classes.reviewItem} enter-rise`} style={{ "--i": i } as CSSProperties}>
          <span className={classes.reviewIcon} aria-hidden>
            {entry.icon}
          </span>
          <h2 className={classes.reviewLabel}>{entry.label}</h2>
          <button
            type="button"
            className={classes.edit}
            onClick={() => onEdit(entry.step)}
            aria-label={`Alterar ${entry.editName}`}
            data-press
          >
            <IconPencil size={18} aria-hidden />
            Alterar
          </button>
          <div className={classes.reviewValue}>{entry.value}</div>
        </li>
      ))}
    </ul>
  );
}
