import { Button } from "@mantine/core";
import { IconArrowLeft, IconArrowRight, IconSend } from "@tabler/icons-react";
import { useCallback, useRef, type ReactNode, type Ref } from "react";
import { BottomSheet } from "@/components/sheet/BottomSheet";
import { ConfirmActions } from "@/components/sheet/ConfirmActions";
import classes from "./flow.module.css";

interface StepHeadingProps {
  id: string;
  step: number;
  total: number;
  title: string;
  lead?: ReactNode;
  headingRef: Ref<HTMLHeadingElement>;
}

/** Pergunta do passo como H1 ("Passo 2 de 4" faz parte do nome lido). */
export function StepHeading({ id, step, total, title, lead, headingRef }: StepHeadingProps) {
  return (
    <div className={classes.heading}>
      <h1 id={id} ref={headingRef} tabIndex={-1} className={classes.title}>
        <span className={classes.kicker}>
          Passo {step} de {total}
        </span>
        {title}
      </h1>
      {lead && <p className={classes.lead}>{lead}</p>}
    </div>
  );
}

interface FlowFooterProps {
  /** Ausente no primeiro passo (o X da barra já sai do fluxo) */
  onBack?: () => void;
  onNext: () => void;
  /** Último passo: "Enviar pedido" */
  submit?: boolean;
  loading?: boolean;
}

/** Ações fixas no rodapé: Voltar e Continuar / Enviar pedido (56 px). */
export function FlowFooter({ onBack, onNext, submit = false, loading = false }: FlowFooterProps) {
  return (
    <div className={classes.footer}>
      <div className={classes.footerInner}>
        {onBack && (
          <Button
            variant="default"
            size="lg"
            radius="xl"
            className={classes.footerButton}
            leftSection={<IconArrowLeft size={20} aria-hidden />}
            onClick={onBack}
            disabled={loading}
          >
            Voltar
          </Button>
        )}
        <Button
          size="lg"
          radius="xl"
          className={classes.footerButton}
          rightSection={submit ? <IconSend size={20} aria-hidden /> : <IconArrowRight size={20} aria-hidden />}
          onClick={onNext}
          loading={loading}
        >
          {submit ? "Enviar pedido" : "Continuar"}
        </Button>
      </div>
    </div>
  );
}

interface DiscardSheetProps {
  open: boolean;
  onCancel: () => void;
  /** Chamado depois que a folha fechou (a saída do fluxo não leva a folha junto) */
  onDiscard: () => void;
}

/** "Descartar o pedido?" ao tocar no X com algo preenchido. */
export function DiscardSheet({ open, onCancel, onDiscard }: DiscardSheetProps) {
  const leaving = useRef(false);

  const afterClose = useCallback(() => {
    if (!leaving.current) return;
    leaving.current = false;
    onDiscard();
  }, [onDiscard]);

  const discard = () => {
    leaving.current = true;
    onCancel();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onCancel}
      onAfterClose={afterClose}
      title="Descartar o pedido?"
      description="O que você preencheu será perdido."
    >
      <ConfirmActions keepLabel="Continuar preenchendo" onKeep={onCancel} confirmLabel="Descartar" onConfirm={discard} />
    </BottomSheet>
  );
}

/** Leva o foco (e a tela) ao primeiro campo com erro depois de validar. */
export function focusFirstError(): void {
  window.requestAnimationFrame(() => {
    const target = document.querySelector<HTMLElement>('main [aria-invalid="true"], main [data-flow-error]');
    if (!target) return;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: "center" });
  });
}
