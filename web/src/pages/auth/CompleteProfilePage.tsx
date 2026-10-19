import { Button } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useCallback, useState } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { ProfileUnavailable } from "@/auth/GuardStates";
import { useAppNavigate } from "@/components/AppLink";
import { createProfile } from "@/data/people";
import { completeOnboarding } from "@/features/onboarding/onboardingState";
import { errorCode, errorMessage } from "@/lib/errors";
import { AuthFrame } from "./AuthFrame";
import { AuthActions, FormError, SubmitButton } from "./authUi";
import { ConsentLabel } from "./ConsentLabel";
import { ConsentCheckbox, focusFirstError } from "./fields";
import { useNextPath, withNext } from "./nextPath";
import { CPF_CONFLICT_MESSAGE, PROFILE_FIELD_ORDER, ProfileFields, profileValidators } from "./profileFields";
import { useCloseGuard } from "./useCloseGuard";
import classes from "./auth.module.css";

interface CarriedState {
  error?: string;
  values?: { fullName: string; cpf: string; phone: string };
}

const FIELD_ORDER = [...PROFILE_FIELD_ORDER, "accepted"] as const;

/** Após login com Google (ou cadastro interrompido) pedimos CPF e celular. */
export default function CompleteProfilePage() {
  const { user, profile, profileError, retryProfile, signOut } = useAuth();
  const navigate = useAppNavigate();
  const next = useNextPath();
  const carried = (useLocation().state ?? null) as CarriedState | null;
  const [error, setError] = useState<string | null>(carried?.error ?? null);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const form = useForm({
    initialValues: {
      fullName: carried?.values?.fullName ?? user?.displayName ?? "",
      cpf: carried?.values?.cpf ?? "",
      phone: carried?.values?.phone ?? "",
      accepted: false,
    },
    validate: { ...profileValidators, accepted: (v) => (v ? null : "Marque esta opção para continuar") },
  });

  // "Fechar": voltar no histórico cairia de novo numa tela que exige cadastro
  const goHome = useCallback(() => navigate("/", { replace: true, nav: "pop" }), [navigate]);
  const closeSheet = useCloseGuard({ dirty: !busy && form.isDirty(), onLeave: goHome });

  // Durante o envio o cadastro aparece localmente antes da confirmação do
  // servidor; só redirecionamos depois, para não esconder um erro de CPF.
  // Com erro, também não: o Firestore rejeita a gravação antes de desfazer
  // o cadastro local, e esse cadastro fantasma levaria à Início sem salvar
  if (profile && !busy && !error) return <Navigate to={next} replace />;
  // Cadastro ilegível agora (sem conexão): não pede CPF de novo a quem já tem
  if (profileError) return <ProfileUnavailable onRetry={retryProfile} />;
  if (!user) return <Navigate to="/entrar" replace />;

  const submit = form.onSubmit(
    async (values) => {
      setBusy(true);
      setError(null);
      try {
        await createProfile(user.uid, { ...values, email: user.email ?? "" });
        completeOnboarding();
        navigate(next, { replace: true, nav: "tab" });
      } catch (e: unknown) {
        setError(errorCode(e) === "permission-denied" ? CPF_CONFLICT_MESSAGE : errorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    (errors) => focusFirstError(errors, FIELD_ORDER),
  );

  // Sai desta conta e abre o Entrar, mantendo o destino
  const switchAccount = async () => {
    setLeaving(true);
    try {
      await signOut(withNext("/entrar", next));
    } catch (e: unknown) {
      setError(errorMessage(e, "Não foi possível sair desta conta. Tente de novo."));
      setLeaving(false);
    }
  };

  const who = user.email ?? user.displayName ?? "sua conta Google";
  const viaGoogle = user.providerData.some((info) => info.providerId === "google.com");
  // O CPF é de outra conta (1 CPF = 1 conta): o caminho é entrar com ela
  const cpfTaken = error === CPF_CONFLICT_MESSAGE;

  return (
    <AuthFrame title="Complete seu cadastro" lead="Faltam só alguns dados para você fazer pedidos à prefeitura.">
      <div className={classes.account}>
        <span className={classes.accountInitial} aria-hidden>
          {who.charAt(0).toUpperCase()}
        </span>
        <p className={classes.accountText}>
          <span>Você entrou como</span>
          <strong>{who}</strong>
        </p>
      </div>
      <form onSubmit={submit} noValidate className={classes.form}>
        <ProfileFields form={form} />
        <ConsentCheckbox label={<ConsentLabel />} {...form.getInputProps("accepted", { type: "checkbox" })} />
        <FormError message={error} />
        {cpfTaken && (
          <div className={classes.otherAccount}>
            {viaGoogle && (
              <p>
                Criou antes uma conta com e-mail e senha? Entre com ela e, no Perfil, toque em “Usar também o Google para entrar”.
              </p>
            )}
            <Button variant="default" size="lg" h={56} radius="xl" fullWidth loading={leaving} disabled={busy} onClick={switchAccount}>
              Entrar com a outra conta
            </Button>
          </div>
        )}
        <AuthActions>
          <SubmitButton loading={busy} disabled={leaving}>
            Salvar e continuar
          </SubmitButton>
        </AuthActions>
      </form>
      {!cpfTaken && (
        <div className={classes.switch}>
          <span>Não é você?</span>
          <button type="button" className={classes.link} disabled={busy || leaving} onClick={switchAccount}>
            {leaving ? "Saindo…" : "Usar outra conta"}
          </button>
        </div>
      )}
      {closeSheet}
    </AuthFrame>
  );
}
