import { notifications } from "@mantine/notifications";
import { useCallback, useEffect, useRef, useState } from "react";
import { BottomSheet } from "@/components/sheet/BottomSheet";
import { cancelRequest } from "@/data/requests";
import type { CitizenRequest } from "@/domain/types";
import { errorMessage } from "@/lib/errors";
import { ConfirmActions } from "@/components/sheet/ConfirmActions";
import { canCancel } from "./requestModel";
import classes from "./actions.module.css";

/**
 * "Cancelar pedido" (só enquanto está Recebido) com confirmação em folha.
 * A folha fecha quando a situação muda para Cancelada, inclusive sem
 * internet (o Firestore aplica a mudança no aparelho na hora).
 */
export function CancelRequest({ request }: { request: CitizenRequest }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notice = useRef<string | null>(null);
  const allowed = canCancel(request);

  // Cancelado (por aqui) ou a equipe começou a analisar enquanto a folha estava aberta
  const canceled = request.status === "CANCELED";
  useEffect(() => {
    if (allowed || !open) return;
    notice.current = canceled ? "Pedido cancelado." : "A prefeitura começou a analisar o pedido. Ele não pode mais ser cancelado.";
    setOpen(false);
  }, [allowed, open, canceled]);

  const close = useCallback(() => setOpen(false), []);

  // Aviso só depois de a folha terminar de fechar
  const afterClose = useCallback(() => {
    if (!notice.current) return;
    notifications.show({ color: "slate", message: notice.current });
    notice.current = null;
  }, []);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await cancelRequest(request.kind, request.id);
    } catch (e: unknown) {
      setError(errorMessage(e, "Não foi possível cancelar agora. Tente de novo."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {allowed && (
        <div className={classes.cancelRow}>
          <button
            type="button"
            className={classes.cancelLink}
            onClick={() => {
              setError(null);
              setOpen(true);
            }}
            data-press
          >
            Cancelar pedido
          </button>
          <p className={classes.cancelHint}>Dá para cancelar enquanto a prefeitura ainda não começou a analisar.</p>
        </div>
      )}
      <BottomSheet
        open={open}
        onClose={close}
        onAfterClose={afterClose}
        title="Cancelar este pedido?"
        description="Depois de cancelado, ele não pode ser reaberto. Se precisar, você faz um novo pedido."
      >
        {error && (
          <p className={classes.sheetError} role="alert">
            {error}
          </p>
        )}
        <ConfirmActions
          keepLabel="Não, manter pedido"
          onKeep={close}
          confirmLabel="Sim, cancelar pedido"
          onConfirm={() => void confirm()}
          busy={busy}
          busyLabel="Cancelando…"
        />
      </BottomSheet>
    </>
  );
}
