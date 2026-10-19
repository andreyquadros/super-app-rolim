import { Button } from "@mantine/core";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { BottomSheet } from "@/components/sheet/BottomSheet";
import { useChrome } from "@/layouts/chrome/chromeContext";
import classes from "./auth.module.css";

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
      <div className={classes.sheetActions}>
        <Button size="lg" h={56} radius="xl" fullWidth className={classes.primary} onClick={keepEditing}>
          Continuar preenchendo
        </Button>
        <Button size="lg" h={56} radius="xl" fullWidth variant="default" className={classes.discard} onClick={discard}>
          Sair e descartar
        </Button>
      </div>
    </BottomSheet>
  );
}
