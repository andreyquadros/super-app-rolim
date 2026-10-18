import { TextInput } from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import { formatCpf, formatPhone, isValidCpf, isValidPhone } from "@/domain/documents";

export interface ProfileFieldsValues {
  fullName: string;
  cpf: string;
  phone: string;
}

export const profileValidators = {
  fullName: (v: string) => (v.trim().split(/\s+/).length >= 2 && v.trim().length >= 5 ? null : "Informe nome e sobrenome"),
  cpf: (v: string) => (isValidCpf(v) ? null : "CPF inválido"),
  phone: (v: string) => (isValidPhone(v) ? null : "Telefone com DDD, ex.: (69) 99999-0000"),
};

/** Campos de cadastro reaproveitados no registro e no "completar cadastro". */
export function ProfileFields<T extends ProfileFieldsValues>({ form }: { form: UseFormReturnType<T> }) {
  const cpf = form.getInputProps("cpf");
  const phone = form.getInputProps("phone");
  return (
    <>
      <TextInput label="Nome completo" autoComplete="name" {...form.getInputProps("fullName")} />
      <TextInput
        label="CPF"
        inputMode="numeric"
        autoComplete="off"
        description="Usado para identificar você nas solicitações. Um CPF por conta."
        {...cpf}
        onChange={(e) => cpf.onChange(formatCpf(e.currentTarget.value))}
      />
      <TextInput
        label="Celular"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        {...phone}
        onChange={(e) => phone.onChange(formatPhone(e.currentTarget.value))}
      />
    </>
  );
}
