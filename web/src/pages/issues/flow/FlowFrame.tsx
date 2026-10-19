import { IconAlertTriangle } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { DiscardSheet, FlowFooter, StepHeading } from "./FlowParts";
import type { Flow } from "./useFlow";
import classes from "./flow.module.css";

interface FlowFrameProps {
  flow: Flow;
  headingId: string;
  question: string;
  lead: ReactNode;
  /** "Enviar pedido" no último passo */
  onSubmit: () => void;
  /** Conteúdo do passo atual */
  children: ReactNode;
}

/** Moldura de um passo: pergunta, conteúdo, aviso, rodapé fixo e folha de descarte. */
export function FlowFrame({ flow, headingId, question, lead, onSubmit, children }: FlowFrameProps) {
  const { step, total, direction, headingRef, error, move, next, submitting, discard } = flow;
  const last = step === total;

  return (
    <div className={classes.page}>
      <div key={step} className={classes.step} data-dir={direction === "none" ? undefined : direction}>
        <StepHeading id={headingId} step={step} total={total} title={question} lead={lead} headingRef={headingRef} />
        {children}
      </div>

      {error && (
        <p className={classes.error} role="alert">
          <IconAlertTriangle size={20} aria-hidden />
          {error}
        </p>
      )}

      {step > 1 && <FlowFooter onBack={() => move(step - 1)} onNext={last ? onSubmit : next} submit={last} loading={submitting} />}
      <DiscardSheet open={discard.open} onCancel={discard.keep} onDiscard={discard.leave} />
    </div>
  );
}
