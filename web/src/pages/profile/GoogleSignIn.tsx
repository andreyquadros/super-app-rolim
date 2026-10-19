import { notifications } from "@mantine/notifications";
import { IconBrandGoogle, IconCircleCheck } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useAuth, type TakenGoogleAccount } from "@/auth/AuthContext";
import { BottomSheet } from "@/components/sheet/BottomSheet";
import { ConfirmActions } from "@/components/sheet/ConfirmActions";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import { errorCode, errorMessage } from "@/lib/errors";
import { prepareGoogleSignIn } from "@/lib/firebase";
import sheet from "./sheet.module.css";

/** Fechar a janela do Google é desistir: nada a avisar */
const CANCELLED = new Set(["auth/popup-closed-by-user", "auth/cancelled-popup-request"]);

function linkErrorMessage(error: unknown): string {
  if (errorCode(error) === "auth/email-already-in-use") {
    return "O e-mail desta conta Google já é de outra conta do app. Escolha outro Google ou continue entrando com e-mail e senha.";
  }
  return errorMessage(error);
}

function takenCopy(account: TakenGoogleAccount): { title: string; description: string } {
  const google = account.email ?? "Esta conta Google";
  if (account.kind === "empty") {
    return {
      title: "Juntar com sua entrada pelo Google",
      description: `Você já entrou no app com ${google}, mas aquela entrada ficou sem cadastro: sem CPF e sem pedidos. Para o Google abrir esta conta, apagamos aquela entrada vazia. Seu cadastro e seus pedidos aqui continuam como estão.`,
    };
  }
  return {
    title: "Este Google já tem outra conta",
    description: `${google} já abre outra conta do app, com cadastro próprio. Um Google abre uma conta só. Se aquela conta também é sua e você não precisa mais dela, entre com o Google, exclua-a em Perfil › Meus dados e volte aqui. Se ela é da equipe da prefeitura, fale com a administração do app.`,
  };
}

/**
 * "Usar também o Google para entrar", para quem criou a conta com e-mail e
 * senha: o Google passa a abrir esta mesma conta (mesmo CPF e pedidos).
 */
export function GoogleSignIn() {
  const { user, linkGoogle } = useAuth();
  /** Ligado agora (o objeto do usuário muda por dentro, sem avisar o React) */
  const [linkedNow, setLinkedNow] = useState<{ email: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [taken, setTaken] = useState<TakenGoogleAccount | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [merging, setMerging] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const providers = user?.providerData ?? [];
  const hasPassword = providers.some((info) => info.providerId === "password");
  const google = providers.find((info) => info.providerId === "google.com");
  const linked = linkedNow ?? (google ? { email: google.email } : null);
  const offer = hasPassword && !linked;

  // A janela do Google precisa abrir logo após o toque: prepara antes
  useEffect(() => {
    if (offer) prepareGoogleSignIn();
  }, [offer]);

  // Saiu do Perfil (ou começou de novo) sem juntar: encerra a conferência
  useEffect(
    () => () => {
      if (taken?.kind === "empty") taken.dismiss();
    },
    [taken],
  );

  if (!hasPassword) return null;

  const done = (email: string | null) => {
    setLinkedNow({ email });
    notifications.show({
      message: email ? `Pronto! Agora o Google (${email}) também abre esta conta.` : "Pronto! Agora o Google também abre esta conta.",
      color: "mata",
    });
  };

  const start = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await linkGoogle();
      if (result.status === "linked") {
        done(result.email);
      } else {
        setFailure(null);
        setTaken(result.account);
        setSheetOpen(true);
      }
    } catch (error: unknown) {
      if (!CANCELLED.has(errorCode(error) ?? "")) {
        notifications.show({ title: "Não foi possível usar o Google", message: linkErrorMessage(error), color: "barro" });
      }
    } finally {
      setBusy(false);
    }
  };

  // Fechar nunca é recusado (o Esc e o Voltar do Android já fecharam a folha);
  // durante a junção ela segue e a folha volta se der errado
  const close = () => {
    if (taken?.kind === "empty") taken.dismiss();
    setSheetOpen(false);
  };

  const merge = async () => {
    if (taken?.kind !== "empty") return;
    setMerging(true);
    try {
      const email = await taken.merge();
      setSheetOpen(false);
      done(email);
    } catch (error: unknown) {
      // A conferência paralela já foi encerrada: resta explicar e fechar
      setFailure(errorMessage(error));
      setSheetOpen(true);
    } finally {
      setMerging(false);
    }
  };

  const copy = taken ? takenCopy(taken) : null;

  return (
    <>
      <ListGroup title="Formas de entrar">
        {linked ? (
          <ListRow
            icon={<IconBrandGoogle size={22} stroke={1.8} />}
            label="Entrar com o Google"
            description={linked.email ? `Ligado: ${linked.email}` : "Ligado a esta conta"}
            right={<IconCircleCheck size={22} color="var(--mantine-color-mata-7)" aria-hidden />}
          />
        ) : (
          <ListRow
            icon={<IconBrandGoogle size={22} stroke={1.8} />}
            label="Usar também o Google para entrar"
            description={busy ? "Aguardando o Google…" : "Entre nesta mesma conta com um toque, sem digitar a senha"}
            onClick={() => void start()}
          />
        )}
      </ListGroup>

      <BottomSheet
        open={sheetOpen}
        onClose={close}
        onAfterClose={() => {
          if (merging) return;
          setTaken(null);
          setFailure(null);
        }}
        title={copy?.title ?? ""}
        description={copy?.description}
        closeLabel={taken?.kind === "empty" && !failure ? undefined : "Entendi"}
      >
        {failure && (
          <div className={sheet.error} role="alert">
            <p>{failure}</p>
          </div>
        )}
        {taken?.kind === "empty" && !failure && (
          <ConfirmActions
            keepLabel="Agora não"
            onKeep={close}
            confirmLabel="Apagar e usar o Google aqui"
            onConfirm={() => void merge()}
            busy={merging}
            busyLabel="Ligando…"
          />
        )}
      </BottomSheet>
    </>
  );
}
