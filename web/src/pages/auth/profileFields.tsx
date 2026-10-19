import { TextInput } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { formatCpf, formatPhone, isValidCpf, isValidPhone } from "@/domain/documents";
import { fieldProps } from "./fields";

export interface ProfileFieldsValues {
  fullName: string;
  cpf: string;
  phone: string;
}

export const CPF_CONFLICT_MESSAGE =
  "Não foi possível concluir o cadastro. Este CPF pode já estar ligado a outra conta. Tente entrar com ela ou procure a prefeitura.";

/** Ordem dos campos na tela (para levar o foco ao primeiro erro). */
export const PROFILE_FIELD_ORDER = ["fullName", "cpf", "phone"] as const;

export const profileValidators = {
  fullName: (v: string) => (v.trim().split(/\s+/).length >= 2 && v.trim().length >= 5 ? null : "Informe nome e sobrenome"),
  cpf: (v: string) => (isValidCpf(v) ? null : "CPF inválido. Confira os 11 números"),
  phone: (v: string) => (isValidPhone(v) ? null : "Celular com DDD, ex.: (69) 99999-0000"),
};

/** Campos de cadastro reaproveitados no registro e no "completar cadastro". */
export function ProfileFields<T extends ProfileFieldsValues>({ form }: { form: UseFormReturnType<T> }) {
  const cpf = form.getInputProps("cpf");
  const phone = form.getInputProps("phone");
  return (
    <>
      <TextInput {...fieldProps} label="Nome completo" autoComplete="name" autoCapitalize="words" {...form.getInputProps("fullName")} />
      <TextInput
        {...fieldProps}
        label="CPF"
        inputMode="numeric"
        autoComplete="off"
        description="Usado para identificar você nos pedidos. Um CPF por conta."
        {...cpf}
        onChange={(e) => cpf.onChange(formatCpf(e.currentTarget.value))}
      />
      <TextInput
        {...fieldProps}
        label="Celular"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        description="Com DDD. Ex.: (69) 99999-0000"
        {...phone}
        onChange={(e) => phone.onChange(formatPhone(e.currentTarget.value))}
      />
    </>
  );
}
