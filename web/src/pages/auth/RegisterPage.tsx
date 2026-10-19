import { TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { useAppNavigate } from "@/components/AppLink";
import { completeOnboarding } from "@/features/onboarding/onboardingState";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { auth } from "@/lib/firebase";
import { errorCode, errorMessage } from "@/lib/errors";
import { AuthFrame } from "./AuthFrame";
import { AuthActions, FormError, GoogleButton, OrDivider, SubmitButton, SwitchPrompt } from "./authUi";
import { ConsentLabel } from "./ConsentLabel";
import { ConsentCheckbox, emailValidator, fieldProps, focusFirstError, PasswordField } from "./fields";
import { useNextPath, withNext } from "./nextPath";
import { CPF_CONFLICT_MESSAGE, PROFILE_FIELD_ORDER, ProfileFields, profileValidators } from "./profileFields";
import { useCloseGuard } from "./useCloseGuard";
import classes from "./auth.module.css";

const FIELD_ORDER = [...PROFILE_FIELD_ORDER, "email", "password", "accepted"] as const;

/** Erros do Firebase que pertencem a um campo: aparecem embaixo dele. */
const FIELD_FOR_CODE: Readonly<Record<string, "email" | "password">> = {
  "auth/email-already-in-use": "email",
  "auth/invalid-email": "email",
  "auth/weak-password": "password",
};

export default function RegisterPage() {
  const { user, profile, loading, signUp, signInWithGoogle } = useAuth();
  const navigate = useAppNavigate();
  const goBack = useBackNavigation("/");
  const next = useNextPath();
  const [error, setError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"form" | "google" | null>(null);

  const form = useForm({
    initialValues: { fullName: "", cpf: "", phone: "", email: "", password: "", accepted: false },
    validate: {
      ...profileValidators,
      email: emailValidator,
      password: (v) => (v.length >= 8 ? null : "A senha precisa ter pelo menos 8 caracteres"),
      accepted: (v) => (v ? null : "Marque esta opção para continuar"),
    },
  });
  const closeSheet = useCloseGuard({ dirty: busy === null && form.isDirty(), onLeave: goBack });

  if (!loading && user && profile && busy === null) return <Navigate to={next} replace />;
  if (!loading && user && !profile && busy === null) return <Navigate to={withNext("/completar-cadastro", next)} replace />;

  const submit = form.onSubmit(
    async (values) => {
      setBusy("form");
      setError(null);
      try {
        await signUp(values);
        completeOnboarding();
        navigate(next, { replace: true, nav: "tab" });
      } catch (e: unknown) {
        const code = errorCode(e);
        const message = code === "permission-denied" ? CPF_CONFLICT_MESSAGE : errorMessage(e);
        if (auth.currentUser) {
          // A conta foi criada, mas o cadastro não: segue para completar com os dados preenchidos
          completeOnboarding();
          const { fullName, cpf, phone } = values;
          navigate(withNext("/completar-cadastro", next), {
            replace: true,
            nav: "flow",
            state: { error: message, values: { fullName, cpf, phone } },
          });
          return;
        }
        const field = code ? FIELD_FOR_CODE[code] : undefined;
        if (field) {
          form.setFieldError(field, message);
          focusFirstError({ [field]: message }, [field]);
        } else {
          setError(message);
        }
        setBusy(null);
      }
    },
    (errors) => focusFirstError(errors, FIELD_ORDER),
  );

  const google = async () => {
    setBusy("google");
    setGoogleError(null);
    try {
      await signInWithGoogle();
      completeOnboarding();
      // Faltam CPF e celular; quem já tem cadastro segue direto para o destino
      navigate(withNext("/completar-cadastro", next), { replace: true, nav: "flow" });
    } catch (e: unknown) {
      setGoogleError(errorMessage(e));
      setBusy(null);
    }
  };

  return (
    <AuthFrame title="Crie sua conta" lead="Leva menos de um minuto. Seus dados ficam protegidos pela LGPD.">
      <div className={classes.form}>
        <GoogleButton label="Continuar com Google" loading={busy === "google"} disabled={busy !== null} onClick={google} />
        <FormError message={googleError} />
        <OrDivider />
        <form onSubmit={submit} noValidate className={classes.form}>
          <ProfileFields form={form} />
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
          <PasswordField
            label="Senha"
            autoComplete="new-password"
            description="Pelo menos 8 caracteres. Anote num lugar seguro."
            {...form.getInputProps("password")}
          />
          <ConsentCheckbox label={<ConsentLabel />} {...form.getInputProps("accepted", { type: "checkbox" })} />
          <FormError message={error} />
          <AuthActions>
            <SubmitButton loading={busy === "form"} disabled={busy === "google"}>
              Criar conta
            </SubmitButton>
          </AuthActions>
        </form>
        <SwitchPrompt question="Já tem conta?" to={withNext("/entrar", next)} label="Entrar" />
      </div>
      {closeSheet}
    </AuthFrame>
  );
}
