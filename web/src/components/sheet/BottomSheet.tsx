import { useEffect, useId, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { useLocation } from "react-router";
import { reducedMotion } from "@/lib/navMotion";
import classes from "./BottomSheet.module.css";
import { useScrollLock } from "./scrollLock";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Texto de apoio abaixo do título */
  description?: ReactNode;
  children: ReactNode;
  /** Chamado depois que a folha terminou de fechar (ex.: navegar sem levar a folha junto) */
  onAfterClose?: () => void;
  /** Texto de um botão "Fechar" de largura total no fim da folha */
  closeLabel?: string;
}

const CLOSE_DISTANCE_PX = 80;
const CLOSE_VELOCITY = 0.5; // px/ms
const EXIT_MS = 220;
/** Toques que começam num controle não arrastam a folha */
const INTERACTIVE = "a, button, input, select, textarea, [role='button']";

/**
 * Folha que sobe de baixo, sobre <dialog>.showModal():
 * - o "voltar" do Android e o Esc pedem para fechar pelo evento nativo (CloseWatcher);
 * - arrastar o topo (alça, título e texto de apoio) para baixo fecha;
 * - trocar de tela (Voltar do navegador, gesto do iPhone) fecha;
 * - o navegador devolve o foco ao botão que abriu.
 */
export function BottomSheet({ open, onClose, title, description, children, onAfterClose, closeLabel }: BottomSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; startT: number; dy: number } | null>(null);
  const titleId = useId();
  const { lock, unlock } = useScrollLock();

  // O conteúdo continua montado enquanto a folha desce (só sai quando fechou de vez)
  const [rendered, setRendered] = useState(open);
  if (open && !rendered) setRendered(true);

  // Valores atuais para os ouvintes nativos, sem reinscrevê-los a cada renderização
  const latest = useRef({ open, onClose, onAfterClose });
  useLayoutEffect(() => {
    latest.current = { open, onClose, onAfterClose };
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    if (open) {
      dialog.removeAttribute("data-closing");
      if (!dialog.open) {
        dialog.showModal();
        // Confirmações: o foco começa na ação segura (marcada com data-autofocus)
        dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
      }
      lock();
      return undefined;
    }
    if (!dialog.open) return undefined;
    const finish = () => {
      dialog.close();
      dialog.removeAttribute("data-closing");
    };
    if (reducedMotion()) {
      finish();
      return undefined;
    }
    dialog.setAttribute("data-closing", "");
    const timer = window.setTimeout(finish, EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open, lock]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    let frame = 0;
    const settle = () => {
      setRendered(false);
      latest.current.onAfterClose?.();
    };
    const onNativeClose = () => {
      // O evento "close" é assíncrono: se a folha já foi reaberta, ele é de antes
      if (dialog.open) return;
      unlock();
      if (!latest.current.open) {
        settle();
        return;
      }
      // Fechou sem o pai pedir (Voltar que o navegador não deixa cancelar): pergunta ao pai
      latest.current.onClose();
      frame = window.requestAnimationFrame(() => {
        if (!latest.current.open) {
          settle();
          return;
        }
        // O pai recusou (ex.: exclusão em andamento): a folha volta
        if (!dialog.open) dialog.showModal();
        lock();
      });
    };
    // Esc / Voltar do Android: sempre passa pelo pai, que decide (e anima) o fechamento
    const onCancel = (event: Event) => {
      event.preventDefault();
      latest.current.onClose();
    };
    dialog.addEventListener("close", onNativeClose);
    dialog.addEventListener("cancel", onCancel);
    return () => {
      window.cancelAnimationFrame(frame);
      dialog.removeEventListener("close", onNativeClose);
      dialog.removeEventListener("cancel", onCancel);
    };
  }, [lock, unlock]);

  // Trocou de tela com a folha aberta: ela não fica flutuando sobre a tela nova
  const { key } = useLocation();
  const shownKey = useRef(key);
  useEffect(() => {
    if (shownKey.current === key) return;
    shownKey.current = key;
    if (dialogRef.current?.open) latest.current.onClose();
  }, [key]);

  const endDrag = (shouldClose: boolean) => {
    const panel = panelRef.current;
    drag.current = null;
    if (!panel) return;
    panel.style.removeProperty("transition");
    panel.style.removeProperty("transform");
    panel.style.removeProperty("will-change");
    if (shouldClose) onClose();
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest(INTERACTIVE)) return;
    drag.current = { startY: event.clientY, startT: performance.now(), dy: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
    panelRef.current?.style.setProperty("transition", "none");
    panelRef.current?.style.setProperty("will-change", "transform");
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !panelRef.current) return;
    drag.current.dy = Math.max(0, event.clientY - drag.current.startY);
    panelRef.current.style.transform = `translateY(${drag.current.dy}px)`;
  };

  const onPointerUp = () => {
    const state = drag.current;
    if (!state) return;
    const velocity = state.dy / Math.max(1, performance.now() - state.startT);
    endDrag(state.dy > CLOSE_DISTANCE_PX || velocity > CLOSE_VELOCITY);
  };

  // O sistema tomou o gesto (rolagem, troca de app): a folha volta ao lugar
  const onPointerCancel = () => {
    if (drag.current) endDrag(false);
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
          className={classes.header}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          <div className={classes.grabber} aria-hidden>
            <span className={classes.handle} />
          </div>
          <h2 id={titleId} className={classes.title}>
            {title}
          </h2>
          {description && <div className={classes.description}>{description}</div>}
        </div>
        {(open || rendered) && (
          <div className={classes.body}>
            {children}
            {closeLabel && (
              <button type="button" className={classes.close} onClick={onClose} data-press>
                {closeLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </dialog>
  );
}
