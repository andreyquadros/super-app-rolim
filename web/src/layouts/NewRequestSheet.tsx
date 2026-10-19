import { IconChevronRight, IconMessages, IconTools } from "@tabler/icons-react";
import { useCallback, useRef, type CSSProperties } from "react";
import { useAppNavigate } from "@/components/AppLink";
import { BottomSheet } from "@/components/sheet/BottomSheet";
import classes from "./NewRequestSheet.module.css";

interface NewRequestSheetProps {
  open: boolean;
  onClose: () => void;
}

const OPTIONS = [
  {
    to: "/zeladoria/nova",
    icon: IconTools,
    title: "Problema na rua",
    text: "Zeladoria: buraco, poste apagado, lixo, mato alto",
    tone: "mata",
  },
  {
    to: "/ouvidoria/nova",
    icon: IconMessages,
    title: "Ouvidoria",
    text: "Elogio, sugestão ou reclamação sobre um serviço",
    tone: "ipe",
  },
] as const;

/** Folha "O que você quer registrar?", aberta pelo botão Solicitar. */
export function NewRequestSheet({ open, onClose }: NewRequestSheetProps) {
  const navigate = useAppNavigate();
  const pending = useRef<string | null>(null);

  const choose = (to: string) => {
    pending.current = to;
    onClose();
  };

  // Navega depois que a folha fechou: a transição de tela não leva a folha junto
  const afterClose = useCallback(() => {
    const to = pending.current;
    pending.current = null;
    if (to) navigate(to, { nav: "flow" });
  }, [navigate]);

  return (
    <BottomSheet open={open} onClose={onClose} onAfterClose={afterClose} title="O que você quer registrar?" closeLabel="Cancelar">
      <ul className={classes.options}>
        {OPTIONS.map((o, i) => (
          <li key={o.to} className="enter-rise" style={{ "--i": i } as CSSProperties}>
            <button type="button" className={classes.option} data-tone={o.tone} onClick={() => choose(o.to)} data-press>
              <span className={classes.icon} aria-hidden>
                <o.icon size={28} stroke={1.8} />
              </span>
              <span className={classes.text}>
                <span className={classes.title}>{o.title}</span>
                <span className={classes.hint}>{o.text}</span>
              </span>
              <IconChevronRight size={22} aria-hidden className={classes.chevron} />
            </button>
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}
