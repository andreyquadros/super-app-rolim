import { IconCheck } from "@tabler/icons-react";
import { useId, type ReactNode } from "react";
import classes from "./ChoiceGroup.module.css";

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  /** Prévia visual (ex.: "Aa" no tamanho da opção, ícone do tema) */
  preview: ReactNode;
}

interface ChoiceGroupProps<T extends string> {
  legend: string;
  icon: ReactNode;
  hint?: string;
  name: string;
  options: readonly ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * Grupo de opções grandes (rádio nativo): blocos lado a lado quando cabem,
 * linhas empilhadas em telas estreitas ou com o texto grande.
 */
export function ChoiceGroup<T extends string>({ legend, icon, hint, name, options, value, onChange }: ChoiceGroupProps<T>) {
  const hintId = useId();
  return (
    <fieldset className={classes.fieldset} aria-describedby={hint ? hintId : undefined}>
      <legend className={classes.legend}>
        <span className={classes.legendIcon} aria-hidden>
          {icon}
        </span>
        {legend}
      </legend>
      {hint && (
        <p id={hintId} className={classes.hint}>
          {hint}
        </p>
      )}
      <div className={classes.frame}>
        <div className={classes.options}>
          {options.map((option) => {
            const checked = option.value === value;
            return (
              <label key={option.value} className={classes.option} data-checked={checked || undefined} data-press>
                <input
                  type="radio"
                  className={classes.radio}
                  name={name}
                  value={option.value}
                  checked={checked}
                  onChange={() => onChange(option.value)}
                />
                <span className={classes.preview} aria-hidden>
                  {option.preview}
                </span>
                <span className={classes.optionLabel}>{option.label}</span>
                <span className={classes.mark} aria-hidden>
                  {checked && <IconCheck size={16} stroke={3} />}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </fieldset>
  );
}
