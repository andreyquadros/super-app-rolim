import { notifications } from "@mantine/notifications";
import { useState } from "react";
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

/** Pode oferecer "Ligar avisos"? (logado, suportado e ainda desligado) */
export function canOfferPush(): boolean {
  return currentPushState() === "disabled";
}

/** Explica antes de o navegador pedir a permissão de notificações. */
export function EnablePushSheet({ open, onClose, onEnabled }: EnablePushSheetProps) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const enable = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const state = await enablePush(user.uid);
      onClose();
      if (state === "enabled") {
        notifications.show({ message: "Pronto! Você vai saber quando seu pedido andar.", color: "mata" });
        onEnabled?.();
      } else if (state === "denied") {
        notifications.show({ message: "As notificações ficaram bloqueadas. Dá para liberar nas configurações do navegador.", color: "ipe" });
      }
    } catch (error: unknown) {
      notifications.show({ title: "Não foi possível ligar os avisos", message: errorMessage(error), color: "barro" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Quer saber quando seu pedido andar?"
      description="O app avisa no celular quando a prefeitura receber, analisar e resolver seus pedidos, e quando houver comunicados importantes. Você pode desligar quando quiser, no Perfil."
    >
      <button type="button" className={classes.done} onClick={enable} disabled={busy} data-press>
        {busy ? "Ligando…" : "Ligar avisos"}
      </button>
      <button type="button" className={classes.done} data-variant="secondary" onClick={onClose} data-press>
        Agora não
      </button>
    </BottomSheet>
  );
}
