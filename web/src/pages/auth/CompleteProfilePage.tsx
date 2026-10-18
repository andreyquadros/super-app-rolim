import { Alert, Button, Checkbox, Stack, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { createProfile } from "@/data/people";
import { errorCode, errorMessage } from "@/lib/errors";
import { AuthFrame, useNextPath } from "./AuthFrame";
import { ProfileFields, profileValidators } from "./profileFields";
import { CPF_CONFLICT_MESSAGE } from "./RegisterPage";

interface CarriedState {
  error?: string;
  values?: { fullName: string; cpf: string; phone: string };
}

/** Após login com Google (ou cadastro interrompido) pedimos CPF e celular. */
export default function CompleteProfilePage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const next = useNextPath();
  const carried = (useLocation().state ?? null) as CarriedState | null;
  const [error, setError] = useState<string | null>(carried?.error ?? null);
  const [busy, setBusy] = useState(false);

  const form = useForm({
    initialValues: {
      fullName: carried?.values?.fullName ?? user?.displayName ?? "",
      cpf: carried?.values?.cpf ?? "",
      phone: carried?.values?.phone ?? "",
      accepted: false,
    },
    validate: { ...profileValidators, accepted: (v) => (v ? null : "É preciso concordar para continuar") },
  });

  // Durante o envio o cadastro aparece localmente antes da confirmação do
  // servidor; só redirecionamos depois, para não esconder um erro de CPF
  if (profile && !busy) return <Navigate to={next} replace />;
  if (!user) return <Navigate to="/entrar" replace />;

  const submit = form.onSubmit(async (values) => {
    setBusy(true);
    setError(null);
    try {
      await createProfile(user.uid, { ...values, email: user.email ?? "" });
      navigate(next, { replace: true });
    } catch (e: unknown) {
      setError(errorCode(e) === "permission-denied" ? CPF_CONFLICT_MESSAGE : errorMessage(e));
    } finally {
      setBusy(false);
    }
  });

  return (
    <AuthFrame title="Complete seu cadastro" subtitle={`Conectado como ${user.email ?? "usuário"}. Faltam só alguns dados.`}>
      <form onSubmit={submit} noValidate>
        <Stack>
          {error && (
            <Alert color="barro" variant="light">
              {error}
            </Alert>
          )}
          <ProfileFields form={form} />
          <Checkbox
            label={<Text size="sm">Concordo com o uso dos meus dados para atendimento pela prefeitura.</Text>}
            {...form.getInputProps("accepted", { type: "checkbox" })}
          />
          <Button type="submit" size="md" loading={busy}>
            Salvar e continuar
          </Button>
          <Button variant="subtle" color="gray" onClick={() => signOut()}>
            Usar outra conta
          </Button>
        </Stack>
      </form>
    </AuthFrame>
  );
}
