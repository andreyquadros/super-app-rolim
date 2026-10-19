import { Button, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconCheck } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { errorCode, errorMessage } from "@/lib/errors";
import { AuthFrame } from "./AuthFrame";
import { AuthActions, FormError, SubmitButton } from "./authUi";
import { emailValidator, fieldProps, focusFirstError } from "./fields";
import { useNextPath, withNext } from "./nextPath";
import classes from "./auth.module.css";

/** E-mail digitado em "Entrar", trazido para não digitar de novo. */
function carriedEmail(state: unknown): string {
  if (typeof state !== "object" || state === null || !("email" in state)) return "";
  return typeof state.email === "string" ? state.email : "";
}

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const next = useNextPath();
  const backToLogin = useBackNavigation(withNext("/entrar", next));
  const initialEmail = carriedEmail(useLocation().state);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const form = useForm({
    initialValues: { email: initialEmail },
    validate: { email: emailValidator },
  });

  // Trocou o conteúdo da tela: o foco vai para o novo título (leitores de tela)
  useEffect(() => {
    if (sentTo) document.querySelector<HTMLElement>("main h1")?.focus({ preventScroll: true });
  }, [sentTo]);

  const submit = form.onSubmit(
    async ({ email }) => {
      setBusy(true);
      setError(null);
      try {
        await resetPassword(email);
        setSentTo(email.trim());
      } catch (e: unknown) {
        // Não revelamos se o e-mail existe: tratamos "usuário não encontrado" como enviado
        if (errorCode(e) === "auth/user-not-found") setSentTo(email.trim());
        else setError(errorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    (errors) => focusFirstError(errors, ["email"]),
  );

  if (sentTo) {
    return (
      <AuthFrame
        title="Confira seu e-mail"
        icon={
          <span className={classes.sentIcon}>
            <IconCheck size={34} stroke={2.6} aria-hidden />
          </span>
        }
        lead={
          <>
            Se houver uma conta com <span className={classes.sentAddress}>{sentTo}</span>, o link para criar uma senha nova
            chega em alguns minutos.
          </>
        }
      >
        <p className={classes.lead}>Não chegou? Confira também a caixa de spam ou de lixo eletrônico.</p>
        <AuthActions>
          <Button size="lg" h={56} radius="xl" fullWidth className={classes.primary} onClick={backToLogin}>
            Voltar para entrar
          </Button>
        </AuthActions>
        <p className={classes.switch}>
          <span>Digitou errado?</span>
          <button type="button" className={classes.link} onClick={() => setSentTo(null)}>
            Usar outro e-mail
          </button>
        </p>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="Esqueceu a senha?" lead="Digite o e-mail da sua conta. Vamos enviar um link para você criar uma senha nova.">
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
        <FormError message={error} />
        <AuthActions>
          <SubmitButton loading={busy}>Enviar link</SubmitButton>
        </AuthActions>
      </form>
      <p className={classes.switch}>
        <span>Lembrou a senha?</span>
        <button type="button" className={classes.link} onClick={backToLogin}>
          Voltar para entrar
        </button>
      </p>
    </AuthFrame>
  );
}
