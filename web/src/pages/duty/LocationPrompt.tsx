import { BottomSheet } from "@/components/sheet/BottomSheet";
import classes from "./duty.module.css";

interface LocationPromptProps {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
}

/** Explica o uso da localização antes de o navegador pedir a permissão. */
export function LocationPrompt({ open, onClose, onAccept }: LocationPromptProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Ver a distância até você"
      description="Para mostrar a distância, o app usa sua localização só agora. Ela não é guardada."
    >
      <div className={classes.sheetActions}>
        <button type="button" className={classes.sheetPrimary} onClick={onAccept} data-press>
          Usar minha localização
        </button>
        <button type="button" className={classes.sheetSecondary} onClick={onClose} data-press>
          Agora não
        </button>
      </div>
    </BottomSheet>
  );
}
