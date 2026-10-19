import { IconLogout } from "@tabler/icons-react";
import { useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { BottomSheet } from "@/components/sheet/BottomSheet";
import { ConfirmActions } from "@/components/sheet/ConfirmActions";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import { errorCode, errorMessage } from "@/lib/errors";
import sheet from "./sheet.module.css";

/** "Sair" com confirmação: entrar de novo exige e-mail e senha. */
export function SignOut() {
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setError(null);
  };

  const leave = async () => {
    setBusy(true);
    setError(null);
    try {
      // Apaga os dados locais e recarrega o app na Início
      await signOut();
    } catch (e: unknown) {
      console.error("Falha ao sair da conta", e);
      setBusy(false);
      // Erro do Firebase tem texto em português; os demais (rede, módulo) viram um pedido simples
      setError(errorCode(e) !== null ? errorMessage(e) : "Verifique a conexão com a internet e tente de novo.");
      // Fechou a folha enquanto esperava: ela volta para mostrar o motivo
      setOpen(true);
    }
  };

  return (
    <>
      <ListGroup>
        <ListRow icon={<IconLogout size={22} stroke={1.8} />} label="Sair" description="Desconectar a conta deste celular" onClick={() => setOpen(true)} />
      </ListGroup>
      <BottomSheet
        open={open}
        onClose={close}
        title="Sair da conta?"
        description="Para entrar de novo, você vai precisar do seu e-mail e da senha."
      >
        {error && (
          <div className={sheet.error} role="alert">
            <p>Não foi possível sair. {error}</p>
          </div>
        )}
        <ConfirmActions keepLabel="Continuar conectado" onKeep={close} confirmLabel="Sair" onConfirm={() => void leave()} busy={busy} busyLabel="Saindo…" />
      </BottomSheet>
    </>
  );
}
