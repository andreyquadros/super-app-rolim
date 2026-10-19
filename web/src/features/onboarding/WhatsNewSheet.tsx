import { useCallback, useEffect, useRef, useState } from "react";
import { AppLink, useAppNavigate } from "@/components/AppLink";
import { BottomSheet } from "@/components/sheet/BottomSheet";
import { DUTY_META } from "@/domain/duty";
import { markWhatsNewSeen, shouldShowWhatsNew } from "./onboardingState";
import classes from "./WhatsNewSheet.module.css";

/** Espera a Início assentar antes de abrir a folha */
const OPEN_DELAY_MS = 1200;

interface WhatsNewSheetProps {
  /** Chamado depois que a folha fechou: o CitizenLayout deixa de montá-la */
  onDone: () => void;
}

/** Outra folha ou diálogo aberto (ex.: Solicitar): a Novidade espera a vez. */
function anotherDialogOpen(): boolean {
  return document.querySelector("dialog[open], [role='dialog'][aria-modal='true']") !== null;
}

/**
 * "Novidade" para quem já usava o app: uma folha única, só na Início.
 * Abre uma vez só: ao abrir fica marcada como vista, e quem volta à Início
 * na mesma sessão não a vê de novo.
 */
export default function WhatsNewSheet({ onDone }: WhatsNewSheetProps) {
  const [open, setOpen] = useState(false);
  const navigate = useAppNavigate();
  const goToFunerals = useRef(false);

  useEffect(() => {
    // Já vista (nesta ou em outra aba): não abre mais
    if (!shouldShowWhatsNew()) return undefined;
    let timer = 0;
    const tryOpen = () => {
      // Não empilha sobre outra folha: tenta de novo quando ela fechar
      if (anotherDialogOpen()) {
        timer = window.setTimeout(tryOpen, OPEN_DELAY_MS);
        return;
      }
      if (!shouldShowWhatsNew()) return;
      markWhatsNewSeen();
      setOpen(true);
    };
    timer = window.setTimeout(tryOpen, OPEN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  // Navega depois que a folha fechou: a transição de tela não leva a folha junto
  const afterClose = useCallback(() => {
    onDone();
    if (!goToFunerals.current) return;
    goToFunerals.current = false;
    navigate(DUTY_META.FUNERAL.path, { nav: "push" });
  }, [navigate, onDone]);

  return (
    <BottomSheet
      open={open}
      onClose={close}
      onAfterClose={afterClose}
      title="Novidade no SUPER APP"
      description="Agora você também encontra a funerária de plantão, com telefone e rota."
    >
      <div className={classes.actions}>
        <AppLink
          to={DUTY_META.FUNERAL.path}
          className={classes.primary}
          onClick={(event) => {
            event.preventDefault();
            goToFunerals.current = true;
            close();
          }}
          data-press
        >
          Ver funerárias de plantão
        </AppLink>
        <button type="button" className={classes.secondary} onClick={close} data-press>
          Fechar
        </button>
      </div>
    </BottomSheet>
  );
}
