import { useCallback, useEffect, useRef, useState } from "react";
import { AppLink, useAppNavigate } from "@/components/AppLink";
import { BottomSheet } from "@/components/sheet/BottomSheet";
import { DUTY_META } from "@/domain/duty";
import { markWhatsNewSeen } from "./onboardingState";
import classes from "./WhatsNewSheet.module.css";

/** Espera a Início assentar antes de abrir a folha */
const OPEN_DELAY_MS = 1200;

/**
 * "Novidade" para quem já usava o app: uma folha única, só na Início.
 * O CitizenLayout decide se monta (shouldShowWhatsNew no carregamento).
 */
export default function WhatsNewSheet() {
  const [open, setOpen] = useState(false);
  const navigate = useAppNavigate();
  const goToFunerals = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setOpen(true);
      markWhatsNewSeen();
    }, OPEN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  // Navega depois que a folha fechou: a transição de tela não leva a folha junto
  const afterClose = useCallback(() => {
    if (!goToFunerals.current) return;
    goToFunerals.current = false;
    navigate(DUTY_META.FUNERAL.path, { nav: "push" });
  }, [navigate]);

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
