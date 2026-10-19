import { Button } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useId, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { BottomSheet } from "@/components/sheet/BottomSheet";
import { errorCode, errorMessage } from "@/lib/errors";
import classes from "./data.module.css";

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

  const close = () => {
    if (busy) return;
    setOpen(false);
    setError(null);
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      // Sucesso: os dados locais são apagados e o app recarrega na Início
      await deleteAccount();
    } catch (e: unknown) {
      setError({ message: errorMessage(e), needsLogin: errorCode(e) === "auth/requires-recent-login" });
    } finally {
      setBusy(false);
    }
  };

  const signInAgain = () => {
    signOut().catch((e: unknown) => setError({ message: errorMessage(e), needsLogin: false }));
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
          <div className={classes.sheetError} role="alert">
            <p>{error.message}</p>
            {error.needsLogin && (
              <Button variant="default" size="lg" radius="xl" fullWidth onClick={signInAgain}>
                Sair para entrar de novo
              </Button>
            )}
          </div>
        )}
        <div className={classes.sheetActions}>
          <Button color="barro" size="lg" radius="xl" fullWidth loading={busy} onClick={() => void confirm()}>
            Excluir definitivamente
          </Button>
          <Button variant="default" size="lg" radius="xl" fullWidth disabled={busy} onClick={close}>
            Manter minha conta
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
