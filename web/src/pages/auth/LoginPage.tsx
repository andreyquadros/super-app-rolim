import { Alert, Anchor, Button, Divider, Group, PasswordInput, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { errorMessage } from "@/lib/errors";
import { AuthFrame, GoogleIcon, useNextPath } from "./AuthFrame";

export default function LoginPage() {
  const { user, loading, signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const next = useNextPath();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"password" | "google" | null>(null);

  const form = useForm({
    initialValues: { email: "", password: "" },
    validate: {
      email: (v) => (/^\S+@\S+\.\S+$/.test(v.trim()) ? null : "Informe um e-mail válido"),
      password: (v) => (v.length > 0 ? null : "Informe a senha"),
    },
  });

  if (!loading && user) return <Navigate to={next} replace />;

  const run = async (kind: "password" | "google", action: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await action();
      navigate(next, { replace: true });
    } catch (e: unknown) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <AuthFrame title="Entrar" subtitle="Use seu e-mail ou sua conta Google.">
      <form onSubmit={form.onSubmit((v) => run("password", () => signIn(v.email, v.password)))} noValidate>
        <Stack>
          {error && (
            <Alert color="barro" variant="light">
              {error}
            </Alert>
          )}
          <TextInput label="E-mail" type="email" autoComplete="email" inputMode="email" {...form.getInputProps("email")} />
          <PasswordInput label="Senha" size="md" autoComplete="current-password" {...form.getInputProps("password")} />
          <Group justify="flex-end" mt={-6}>
            <Anchor component={Link} to="/recuperar-senha" size="sm">
              Esqueci minha senha
            </Anchor>
          </Group>
          <Button type="submit" size="md" loading={busy === "password"} disabled={busy !== null}>
            Entrar
          </Button>
          <Divider label="ou" labelPosition="center" />
          <Button
            variant="default"
            size="md"
            leftSection={<GoogleIcon />}
            loading={busy === "google"}
            disabled={busy !== null}
            onClick={() => run("google", signInWithGoogle)}
          >
            Continuar com Google
          </Button>
          <Text size="sm" ta="center" mt="xs">
            Ainda não tem conta?{" "}
            <Anchor component={Link} to={`/cadastro?next=${encodeURIComponent(next)}`} fw={600}>
              Criar conta
            </Anchor>
          </Text>
        </Stack>
      </form>
    </AuthFrame>
  );
}
