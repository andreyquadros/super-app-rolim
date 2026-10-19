import { Button, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useId, useState } from "react";
import { updateProfile } from "@/data/people";
import { formatPhone, isValidPhone, maskCpf } from "@/domain/documents";
import type { Profile } from "@/domain/types";
import { errorMessage } from "@/lib/errors";
import classes from "./data.module.css";

interface ProfileFormProps {
  uid: string;
  profile: Profile;
}

/** Nome e celular editáveis; o CPF aparece mascarado e só a prefeitura corrige. */
export function ProfileForm({ uid, profile }: ProfileFormProps) {
  const titleId = useId();
  const [saving, setSaving] = useState(false);
  const form = useForm({
    initialValues: { fullName: profile.fullName, phone: formatPhone(profile.phone) },
    validate: {
      fullName: (value) => (value.trim().length >= 5 ? null : "Informe nome e sobrenome"),
      phone: (value) => (isValidPhone(value) ? null : "Confira o celular com DDD, por exemplo (69) 99999-0000"),
    },
  });

  const save = form.onSubmit(async (values) => {
    setSaving(true);
    try {
      await updateProfile(uid, { ...values, email: profile.email });
      form.resetDirty();
      notifications.show({ message: "Pronto! Seus dados foram atualizados.", color: "mata" });
    } catch (error: unknown) {
      notifications.show({ title: "Não foi possível salvar", message: errorMessage(error), color: "barro" });
    } finally {
      setSaving(false);
    }
  });

  return (
    <section className={classes.section} aria-labelledby={titleId}>
      <h2 id={titleId} className={classes.sectionTitle}>
        Dados pessoais
      </h2>
      <form onSubmit={save} noValidate className={classes.card}>
        <TextInput size="lg" label="Nome completo" autoComplete="name" classNames={{ label: classes.inputLabel, input: classes.input }} {...form.getInputProps("fullName")} />
        <TextInput
          size="lg"
          label="Celular"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          classNames={{ label: classes.inputLabel, input: classes.input }}
          {...form.getInputProps("phone")}
          onChange={(event) => form.setFieldValue("phone", formatPhone(event.currentTarget.value))}
        />
        <dl className={classes.readonly}>
          <dt className={classes.readonlyLabel}>CPF</dt>
          <dd className={classes.readonlyValue}>{maskCpf(profile.cpf)}</dd>
          <dd className={classes.readonlyHint}>Por segurança, o CPF aparece só em parte. Para corrigir, procure a prefeitura.</dd>
        </dl>
        <Button type="submit" size="lg" radius="xl" fullWidth loading={saving} disabled={!form.isDirty()}>
          Salvar alterações
        </Button>
      </form>
    </section>
  );
}
