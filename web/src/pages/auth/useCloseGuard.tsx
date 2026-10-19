import { useCallback, useRef, useState, type ReactNode } from "react";
import { BottomSheet } from "@/components/sheet/BottomSheet";
import { ConfirmActions } from "@/components/sheet/ConfirmActions";
import { useChrome } from "@/layouts/chrome/chromeContext";

interface CloseGuardOptions {
  /** Há algo preenchido que se perderia ao sair */
  dirty: boolean;
  /** Sai da tela (voltar ou ir para a Início) */
  onLeave: () => void;
}

/**
 * "Fechar" (X) da barra: com dados preenchidos, pergunta antes numa folha.
 * Devolve a folha para a tela renderizar.
 */
export function useCloseGuard({ dirty, onLeave }: CloseGuardOptions): ReactNode {
  const [asking, setAsking] = useState(false);
  const leaving = useRef(false);

  const onClose = useCallback(() => {
    if (dirty) setAsking(true);
    else onLeave();
  }, [dirty, onLeave]);
  useChrome({ onClose });

  const keepEditing = useCallback(() => setAsking(false), []);
  const discard = useCallback(() => {
    leaving.current = true;
    setAsking(false);
  }, []);
  // Só navega depois de a folha fechar (não leva a folha junto para a outra tela)
  const afterClose = useCallback(() => {
    if (!leaving.current) return;
    leaving.current = false;
    onLeave();
  }, [onLeave]);

  return (
    <BottomSheet
      open={asking}
      onClose={keepEditing}
      onAfterClose={afterClose}
      title="Sair sem terminar?"
      description="O que você preencheu será perdido."
    >
      <ConfirmActions keepLabel="Continuar preenchendo" onKeep={keepEditing} confirmLabel="Sair e descartar" onConfirm={discard} />
    </BottomSheet>
  );
}
