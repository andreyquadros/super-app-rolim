import { useEffect, useId, useRef, type PointerEvent, type ReactNode } from "react";
import { motionAllowed } from "@/lib/navMotion";
import classes from "./BottomSheet.module.css";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Texto de apoio abaixo do título */
  description?: ReactNode;
  children: ReactNode;
  /** Chamado depois que a folha terminou de fechar (ex.: navegar sem levar a folha junto) */
  onAfterClose?: () => void;
}

const CLOSE_DISTANCE_PX = 80;
const CLOSE_VELOCITY = 0.5; // px/ms
const EXIT_MS = 220;

/**
 * Folha que sobe de baixo, sobre <dialog>.showModal():
 * - o "voltar" do Android e o Esc fecham pelo evento nativo (CloseWatcher);
 * - arrastar a alça para baixo fecha;
 * - o navegador devolve o foco ao botão que abriu.
 */
export function BottomSheet({ open, onClose, title, description, children, onAfterClose }: BottomSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; startT: number; dy: number } | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    if (open) {
      dialog.removeAttribute("data-closing");
      if (!dialog.open) {
        dialog.showModal();
        document.documentElement.classList.add("sheet-open");
      }
    }
    if (!open && dialog.open) {
      const finish = () => {
        dialog.close();
        dialog.removeAttribute("data-closing");
      };
      if (motionAllowed()) {
        dialog.setAttribute("data-closing", "");
        const timer = window.setTimeout(finish, EXIT_MS);
        return () => window.clearTimeout(timer);
      }
      finish();
    }
    return undefined;
  }, [open]);

  // Fecha pelo Esc, pelo Voltar do Android ou pelo nosso dialog.close()
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const onNativeClose = () => {
      // O evento "close" é assíncrono: se a folha já foi reaberta, ele é de antes
      if (dialog.open) return;
      document.documentElement.classList.remove("sheet-open");
      onClose();
      onAfterClose?.();
    };
    // Esc / Voltar do Android: fecha com a mesma animação do botão
    const onCancel = (event: Event) => {
      if (!motionAllowed()) return;
      event.preventDefault();
      onClose();
    };
    dialog.addEventListener("close", onNativeClose);
    dialog.addEventListener("cancel", onCancel);
    return () => {
      dialog.removeEventListener("close", onNativeClose);
      dialog.removeEventListener("cancel", onCancel);
    };
  }, [onClose, onAfterClose]);

  // Desmontou aberta (troca de tela): libera a rolagem
  useEffect(() => () => document.documentElement.classList.remove("sheet-open"), []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = { startY: event.clientY, startT: performance.now(), dy: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
    panelRef.current?.style.setProperty("transition", "none");
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !panelRef.current) return;
    drag.current.dy = Math.max(0, event.clientY - drag.current.startY);
    panelRef.current.style.transform = `translateY(${drag.current.dy}px)`;
  };

  const onPointerUp = () => {
    const state = drag.current;
    const panel = panelRef.current;
    drag.current = null;
    if (!state || !panel) return;
    panel.style.removeProperty("transition");
    panel.style.removeProperty("transform");
    const velocity = state.dy / Math.max(1, performance.now() - state.startT);
    if (state.dy > CLOSE_DISTANCE_PX || velocity > CLOSE_VELOCITY) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className={classes.dialog}
      aria-labelledby={titleId}
      onClick={(event) => {
        // Toque no fundo escurecido (fora do painel) fecha
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div ref={panelRef} className={classes.panel}>
        <div
          className={classes.grabber}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-hidden
        >
          <span className={classes.handle} />
        </div>
        <h2 id={titleId} className={classes.title}>
          {title}
        </h2>
        {description && <div className={classes.description}>{description}</div>}
        {open && <div className={classes.body}>{children}</div>}
      </div>
    </dialog>
  );
}
