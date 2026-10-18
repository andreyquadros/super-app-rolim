import { Alert, Anchor, Button, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { errorCode, errorMessage } from "@/lib/errors";
import { AuthFrame } from "./AuthFrame";

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const form = useForm({
    initialValues: { email: "" },
    validate: { email: (v) => (/^\S+@\S+\.\S+$/.test(v.trim()) ? null : "Informe um e-mail válido") },
  });

  const submit = form.onSubmit(async ({ email }) => {
    setBusy(true);
    setError(null);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (e: unknown) {
      // Não revelamos se o e-mail existe: tratamos "usuário não encontrado" como enviado
      if (errorCode(e) === "auth/user-not-found") setSent(true);
      else setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  });

  return (
    <AuthFrame title="Recuperar senha" subtitle="Enviaremos um link para você criar uma nova senha.">
      {sent ? (
        <Stack>
          <Alert color="mata" variant="light" title="Verifique seu e-mail">
            Se houver uma conta com esse endereço, o link chegará em alguns minutos. Confira também a caixa de spam.
          </Alert>
          <Button component={Link} to="/entrar" variant="default">
            Voltar para entrar
          </Button>
        </Stack>
      ) : (
        <form onSubmit={submit} noValidate>
          <Stack>
            {error && <Alert color="barro">{error}</Alert>}
            <TextInput label="E-mail" type="email" inputMode="email" autoComplete="email" {...form.getInputProps("email")} />
            <Button type="submit" size="md" loading={busy}>
              Enviar link
            </Button>
            <Anchor component={Link} to="/entrar" size="sm" ta="center">
              Voltar
            </Anchor>
          </Stack>
        </form>
      )}
    </AuthFrame>
  );
}
