import { TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { AppLink, useAppNavigate } from "@/components/AppLink";
import { completeOnboarding } from "@/features/onboarding/onboardingState";
import { errorCode, errorMessage } from "@/lib/errors";
import { AuthFrame } from "./AuthFrame";
import { AuthActions, FormError, GoogleButton, OrDivider, SubmitButton, SwitchPrompt } from "./authUi";
import { emailValidator, fieldProps, focusFirstError, PasswordField } from "./fields";
import { useNextPath, withNext } from "./nextPath";
import classes from "./auth.module.css";

type Method = "password" | "google";

interface LoginError {
  method: Method;
  message: string;
}

const FIELD_ORDER = ["email", "password"] as const;

/** Códigos de "e-mail ou senha errados" (variam com a proteção contra enumeração). */
const WRONG_CREDENTIALS = new Set(["auth/invalid-credential", "auth/invalid-login-credentials", "auth/wrong-password", "auth/user-not-found"]);

/** Mesma mensagem para e-mail inexistente e senha errada: não revela quem tem conta. */
function signInErrorMessage(error: unknown): string {
  const code = errorCode(error);
  return code && WRONG_CREDENTIALS.has(code) ? "E-mail ou senha incorretos. Confira e tente de novo." : errorMessage(error);
}

export default function LoginPage() {
  const { user, loading, signIn, signInWithGoogle } = useAuth();
  const navigate = useAppNavigate();
  const next = useNextPath();
  const [error, setError] = useState<LoginError | null>(null);
  const [busy, setBusy] = useState<Method | null>(null);

  const form = useForm({
    initialValues: { email: "", password: "" },
    validate: {
      email: emailValidator,
      password: (v) => (v.length > 0 ? null : "Digite sua senha"),
    },
  });

  if (!loading && user && busy === null) return <Navigate to={next} replace />;

  const run = async (method: Method, action: () => Promise<void>) => {
    setBusy(method);
    setError(null);
    try {
      await action();
      // Entrou: a apresentação dos primeiros acessos não aparece mais
      completeOnboarding();
      navigate(next, { replace: true, nav: "tab" });
    } catch (e: unknown) {
      setError({ method, message: method === "password" ? signInErrorMessage(e) : errorMessage(e) });
      setBusy(null);
    }
  };

  const submit = form.onSubmit(
    (values) => run("password", () => signIn(values.email, values.password)),
    (errors) => focusFirstError(errors, FIELD_ORDER),
  );

  return (
    <AuthFrame title="Entre no SUPER APP" lead="Com a sua conta, você faz pedidos à prefeitura e acompanha cada passo.">
      <div className={classes.form}>
        <GoogleButton
          label="Entrar com Google"
          loading={busy === "google"}
          disabled={busy !== null}
          onClick={() => run("google", signInWithGoogle)}
        />
        {error?.method === "google" && <FormError message={error.message} />}
        <OrDivider />
        <form onSubmit={submit} noValidate className={classes.form}>
          <TextInput
            {...fieldProps}
            label="E-mail"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            {...form.getInputProps("email")}
          />
          <PasswordField label="Senha" autoComplete="current-password" {...form.getInputProps("password")} />
          <AppLink
            to={withNext("/recuperar-senha", next)}
            state={{ email: form.values.email.trim() }}
            nav="flow"
            className={`${classes.link} ${classes.fieldHelp}`}
          >
            Esqueci minha senha
          </AppLink>
          {error?.method === "password" && <FormError message={error.message} />}
          <AuthActions>
            <SubmitButton loading={busy === "password"} disabled={busy === "google"}>
              Entrar
            </SubmitButton>
          </AuthActions>
        </form>
        <SwitchPrompt question="Ainda não tem conta?" to={withNext("/cadastro", next)} label="Criar conta" />
      </div>
    </AuthFrame>
  );
}
