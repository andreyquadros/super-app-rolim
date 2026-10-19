import { notifications, type NotificationData } from "@mantine/notifications";
import { FirebaseError } from "firebase/app";
import { useCallback, useRef, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { BottomSheet } from "@/components/sheet/BottomSheet";
import { errorMessage } from "@/lib/errors";
import { currentPushState, enablePush } from "@/lib/push";
import classes from "@/components/install/InstallHowToSheet.module.css";

interface EnablePushSheetProps {
  open: boolean;
  onClose: () => void;
  /** Chamado depois que os avisos foram ligados */
  onEnabled?: () => void;
}

const RETRY = "Verifique a internet e tente de novo.";

/** Texto para a pessoa: erros do navegador vêm em inglês e técnicos */
function failureText(error: unknown): string {
  return error instanceof FirebaseError ? errorMessage(error, RETRY) : RETRY;
}

/** Pode oferecer "Ligar avisos"? (logado, suportado e ainda desligado) */
export function canOfferPush(): boolean {
  return currentPushState() === "disabled";
}

/** Explica antes de o navegador pedir a permissão de notificações. */
export function EnablePushSheet({ open, onClose, onEnabled }: EnablePushSheetProps) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Aviso flutuante só depois de a folha fechar (por cima dela ele ficaria escondido)
  const notice = useRef<NotificationData | null>(null);

  const close = useCallback(() => {
    setError(null);
    onClose();
  }, [onClose]);

  const afterClose = useCallback(() => {
    if (!notice.current) return;
    notifications.show(notice.current);
    notice.current = null;
  }, []);

  const enable = async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const state = await enablePush(user.uid);
      if (state === "enabled") {
        notice.current = { message: "Pronto! Você vai saber quando seu pedido andar.", color: "mata" };
        onEnabled?.();
      } else if (state === "denied") {
        notice.current = { message: "As notificações ficaram bloqueadas. Dá para liberar nas configurações do navegador.", color: "ipe" };
      }
      close();
    } catch (e: unknown) {
      console.error("Falha ao ligar os avisos", e);
      // A folha continua aberta: o erro aparece nela, perto do botão
      setError(failureText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={close}
      onAfterClose={afterClose}
      title="Quer saber quando seu pedido andar?"
      description="O app avisa no celular quando a prefeitura receber, analisar e resolver seus pedidos, e quando houver comunicados importantes. Você pode desligar quando quiser, no Perfil."
    >
      {error && (
        <p className={classes.error} role="alert">
          <strong>Não foi possível ligar os avisos.</strong> {error}
        </p>
      )}
      <button type="button" className={classes.done} onClick={() => void enable()} disabled={busy} aria-busy={busy || undefined} data-press>
        {busy ? "Ligando…" : "Ligar avisos"}
      </button>
      <button type="button" className={classes.done} data-variant="secondary" onClick={close} data-press>
        Agora não
      </button>
    </BottomSheet>
  );
}
