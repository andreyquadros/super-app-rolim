import { Button } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useId, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { BottomSheet } from "@/components/sheet/BottomSheet";
import { ConfirmActions } from "@/components/sheet/ConfirmActions";
import { errorCode, errorMessage } from "@/lib/errors";
import classes from "./data.module.css";
import sheet from "./sheet.module.css";

interface DeleteError {
  message: string;
  /** O Firebase pede login recente para excluir a conta */
  needsLogin: boolean;
}

/** "Excluir minha conta", com confirmação em folha. */
export function DeleteAccount() {
  const { deleteAccount, signOut } = useAuth();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<DeleteError | null>(null);

  // Fechar nunca é recusado (o Esc e o Voltar do Android já fecharam a folha);
  // durante a exclusão os botões ficam desligados
  const close = () => {
    setOpen(false);
    setError(null);
  };

  /** Erro com a folha fechada no meio da espera: ela volta para mostrar o motivo. */
  const fail = (next: DeleteError) => {
    setError(next);
    setOpen(true);
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      // Sucesso: os dados locais são apagados e o app recarrega na Início
      await deleteAccount();
    } catch (e: unknown) {
      fail({ message: errorMessage(e), needsLogin: errorCode(e) === "auth/requires-recent-login" });
    } finally {
      setBusy(false);
    }
  };

  const signInAgain = () => {
    signOut().catch((e: unknown) => fail({ message: errorMessage(e), needsLogin: false }));
  };

  return (
    <>
      <section className={`${classes.section} ${classes.danger}`} aria-labelledby={titleId}>
        <h2 id={titleId} className={classes.sectionTitle}>
          Excluir conta
        </h2>
        <p className={classes.help}>
          Apaga seu cadastro neste app. Os pedidos que você já fez continuam registrados na prefeitura.
        </p>
        <Button
          color="barro"
          variant="outline"
          size="lg"
          radius="xl"
          fullWidth
          leftSection={<IconTrash size={20} aria-hidden />}
          onClick={() => setOpen(true)}
          className={classes.dangerButton}
        >
          Excluir minha conta
        </Button>
      </section>

      <BottomSheet
        open={open}
        onClose={close}
        title="Excluir sua conta?"
        description="Seus dados de cadastro (nome, CPF e telefone) serão apagados e o CPF ficará livre. Os pedidos já abertos continuam registrados na prefeitura como histórico do serviço público. Não dá para desfazer."
      >
        {error && (
          <div className={sheet.error} role="alert">
            <p>{error.message}</p>
            {error.needsLogin && (
              <Button variant="default" size="lg" radius="xl" fullWidth disabled={busy} onClick={signInAgain}>
                Sair para entrar de novo
              </Button>
            )}
          </div>
        )}
        <ConfirmActions
          keepLabel="Manter minha conta"
          onKeep={close}
          confirmLabel="Excluir definitivamente"
          onConfirm={() => void confirm()}
          busy={busy}
          busyLabel="Excluindo…"
        />
      </BottomSheet>
    </>
  );
}
