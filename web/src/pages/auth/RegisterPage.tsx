import { Alert, Anchor, Button, Checkbox, PasswordInput, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { auth } from "@/lib/firebase";
import { errorCode, errorMessage } from "@/lib/errors";
import { AuthFrame, useNextPath } from "./AuthFrame";
import { ProfileFields, profileValidators } from "./profileFields";

export const CPF_CONFLICT_MESSAGE =
  "Não foi possível concluir o cadastro. Este CPF pode já estar ligado a outra conta — tente entrar com ela ou procure a prefeitura.";

export default function RegisterPage() {
  const { user, profile, loading, signUp } = useAuth();
  const navigate = useNavigate();
  const next = useNextPath();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const form = useForm({
    initialValues: { fullName: "", cpf: "", phone: "", email: "", password: "", accepted: false },
    validate: {
      ...profileValidators,
      email: (v) => (/^\S+@\S+\.\S+$/.test(v.trim()) ? null : "Informe um e-mail válido"),
      password: (v) => (v.length >= 8 ? null : "Use pelo menos 8 caracteres"),
      accepted: (v) => (v ? null : "É preciso concordar para continuar"),
    },
  });

  if (!loading && user && profile) return <Navigate to={next} replace />;
  if (!loading && user && !profile && !busy) return <Navigate to={`/completar-cadastro?next=${encodeURIComponent(next)}`} replace />;

  const submit = form.onSubmit(async (values) => {
    setBusy(true);
    setError(null);
    try {
      await signUp(values);
      navigate(next, { replace: true });
    } catch (e: unknown) {
      const message = errorCode(e) === "permission-denied" ? CPF_CONFLICT_MESSAGE : errorMessage(e);
      if (auth.currentUser) {
        // A conta foi criada, mas o cadastro não: segue para completar com os dados preenchidos
        const { fullName, cpf, phone } = values;
        navigate(`/completar-cadastro?next=${encodeURIComponent(next)}`, {
          replace: true,
          state: { error: message, values: { fullName, cpf, phone } },
        });
        return;
      }
      setError(message);
      setBusy(false);
    }
  });

  return (
    <AuthFrame title="Criar conta" subtitle="Leva menos de um minuto. Seus dados ficam protegidos pela LGPD.">
      <form onSubmit={submit} noValidate>
        <Stack>
          {error && (
            <Alert color="barro" variant="light">
              {error}
            </Alert>
          )}
          <ProfileFields form={form} />
          <TextInput label="E-mail" type="email" inputMode="email" autoComplete="email" {...form.getInputProps("email")} />
          <PasswordInput label="Senha" size="md" autoComplete="new-password" description="Mínimo de 8 caracteres" {...form.getInputProps("password")} />
          <Checkbox
            label={
              <Text size="sm">
                Li e concordo com o{" "}
                <Anchor component={Link} to="/privacidade" target="_blank">
                  uso dos meus dados
                </Anchor>{" "}
                para atendimento pela prefeitura.
              </Text>
            }
            {...form.getInputProps("accepted", { type: "checkbox" })}
          />
          <Button type="submit" size="md" loading={busy}>
            Criar conta
          </Button>
          <Text size="sm" ta="center">
            Já tem conta?{" "}
            <Anchor component={Link} to={`/entrar?next=${encodeURIComponent(next)}`} fw={600}>
              Entrar
            </Anchor>
          </Text>
        </Stack>
      </form>
    </AuthFrame>
  );
}
