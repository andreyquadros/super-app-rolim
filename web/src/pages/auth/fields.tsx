import { Checkbox, TextInput, type CheckboxProps, type TextInputProps } from "@mantine/core";
import type { FormErrors } from "@mantine/form";
import { useState } from "react";
import classes from "./fields.module.css";

/** Campos grandes e legíveis, iguais em todas as telas de acesso. */
export const fieldProps = {
  size: "lg",
  classNames: {
    label: classes.fieldLabel,
    description: classes.fieldDescription,
    input: classes.fieldInput,
    error: classes.fieldError,
  },
} satisfies Pick<TextInputProps, "size" | "classNames">;

/**
 * Senha com "Mostrar"/"Ocultar" em texto (ícone solto confunde).
 * O botão não usa aria-label: o rótulo do campo continua sendo só "Senha".
 */
export function PasswordField(props: Omit<TextInputProps, "type" | "rightSection">) {
  const [visible, setVisible] = useState(false);
  return (
    <TextInput
      {...fieldProps}
      {...props}
      type={visible ? "text" : "password"}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      rightSectionWidth="6.25rem"
      rightSectionPointerEvents="all"
      rightSection={
        <button type="button" className={classes.reveal} onClick={() => setVisible((v) => !v)}>
          {visible ? "Ocultar" : "Mostrar"}
          <span className="visually-hidden"> senha</span>
        </button>
      }
    />
  );
}

/** Concordância com o uso dos dados (LGPD): o cartão inteiro é a área de toque. */
export function ConsentCheckbox(props: CheckboxProps) {
  return (
    <Checkbox
      size="lg"
      radius="sm"
      {...props}
      wrapperProps={{ "data-error": props.error ? true : undefined }}
      classNames={{
        root: classes.consent,
        input: classes.consentInput,
        label: classes.consentLabel,
        error: classes.fieldError,
      }}
    />
  );
}

/** Depois de uma validação com erro, leva o foco ao primeiro campo errado (na ordem da tela). */
export function focusFirstError(errors: FormErrors, order: readonly string[]): void {
  const first = order.find((path) => Boolean(errors[path]));
  if (!first) return;
  document.querySelector<HTMLElement>(`[data-path="${first}"]`)?.focus();
}

export const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export const emailValidator = (v: string) => (EMAIL_PATTERN.test(v.trim()) ? null : "Informe um e-mail válido, ex.: maria@gmail.com");
