import { IconShare2, IconSquarePlus } from "@tabler/icons-react";
import { BottomSheet } from "@/components/sheet/BottomSheet";
import classes from "./InstallHowToSheet.module.css";

interface InstallHowToSheetProps {
  open: boolean;
  onClose: () => void;
}

/** iPhone/iPad: o Safari não tem botão de instalar; explica os 3 toques. */
export function InstallHowToSheet({ open, onClose }: InstallHowToSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Colocar o app na tela do iPhone" description="Leva 10 segundos e não ocupa espaço como os apps da loja.">
      <ol className={classes.steps}>
        <li>
          <span className={classes.num} aria-hidden>
            1
          </span>
          <span>
            Toque em <IconShare2 size={20} className={classes.inline} aria-hidden /> <b>Compartilhar</b>, na barra do Safari.
          </span>
        </li>
        <li>
          <span className={classes.num} aria-hidden>
            2
          </span>
          <span>
            Role e toque em <IconSquarePlus size={20} className={classes.inline} aria-hidden /> <b>Adicionar à Tela de Início</b>.
          </span>
        </li>
        <li>
          <span className={classes.num} aria-hidden>
            3
          </span>
          <span>
            Toque em <b>Adicionar</b>. O SUPER APP aparece na tela do celular.
          </span>
        </li>
      </ol>
      <button type="button" className={classes.done} onClick={onClose} data-press>
        Entendi
      </button>
    </BottomSheet>
  );
}
