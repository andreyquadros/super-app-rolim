import type { UseFormReturnType } from "@mantine/form";
import { useCallback, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import type { Created } from "@/data/requests";
import type { Actor } from "@/domain/types";
import { useChrome } from "@/layouts/chrome/chromeContext";
import { errorMessage } from "@/lib/errors";
import { focusFirstError } from "./FlowParts";
import { useStepFlow, type StepFlow } from "./useStepFlow";

export interface FlowSent {
  id: string;
  protocol: string;
  /** Enviado sem internet: fica no aparelho até a conexão voltar */
  pendingSync: boolean;
}

/** Checagem final antes do envio: o que enviar ou o aviso para a pessoa. */
export type Prepared<P> = { payload: P } | { error: string };

export const REVIEW_FIELDS = "Revise os campos destacados antes de enviar.";
const SESSION_ENDED = "Sua sessão terminou. Entre de novo para enviar o pedido.";

type Send = <P>(prepare: () => Prepared<P>, create: (payload: P, author: Actor) => Promise<Created> | Created, failure: string) => Promise<void>;

interface FlowOptions<T> {
  form: UseFormReturnType<T>;
  total: number;
  /** Último passo que pode ser aberto com o que já foi preenchido */
  reachable: number;
  /** Campos validados em cada passo (o último, a revisão, não tem) */
  stepFields: ReadonlyArray<ReadonlyArray<keyof T & string>>;
  /** Algo preenchido: o X pergunta antes de descartar */
  dirty: boolean;
  online: boolean;
}

export interface Flow extends Pick<StepFlow, "step" | "direction" | "headingRef"> {
  total: number;
  error: string | null;
  setError: (message: string | null) => void;
  /** Vai a um passo (limpa o aviso da tela) */
  move: (step: number) => void;
  /** "Continuar": valida os campos do passo e avança */
  next: () => void;
  sent: FlowSent | null;
  submitting: boolean;
  send: Send;
  discard: { open: boolean; keep: () => void; leave: () => void };
}

/** Envio comum: autor da sessão, espera do servidor só com internet e Voltar que sai do fluxo. */
function useSend(online: boolean, setError: (message: string | null) => void, rewind: () => void) {
  const { user, profile } = useAuth();
  const [sent, setSent] = useState<FlowSent | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const send: Send = async (prepare, create, failure) => {
    if (!user || !profile) {
      setError(SESSION_ENDED);
      return;
    }
    const prepared = prepare();
    if ("error" in prepared) {
      setError(prepared.error);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await create(prepared.payload, { uid: user.uid, name: profile.fullName });
      // Sem internet o Firestore guarda no aparelho e envia sozinho depois
      if (online) await created.committed;
      else created.committed.catch(() => undefined);
      setSent({ id: created.id, protocol: created.protocol, pendingSync: !online });
      // O Voltar depois do envio sai do fluxo em vez de refazer os passos
      rewind();
    } catch (e: unknown) {
      setError(errorMessage(e, failure));
    } finally {
      setSubmitting(false);
    }
  };

  return { sent, submitting, send };
}

/** X da barra: com algo preenchido, confirma antes de jogar fora. */
function useDiscard(dirty: boolean, exit: () => void) {
  const [open, setOpen] = useState(false);
  const request = useCallback(() => (dirty ? setOpen(true) : exit()), [dirty, exit]);
  const keep = useCallback(() => setOpen(false), []);
  return { open, request, keep };
}

/**
 * Estado dos fluxos em passos (Problema na rua e Ouvidoria): passo no
 * endereço, avisos, envio, folha de descarte e a barra de progresso.
 */
export function useFlow<T>({ form, total, reachable, stepFields, dirty, online }: FlowOptions<T>): Flow {
  const { step, direction, headingRef, goTo, exit, rewind } = useStepFlow(total, reachable);
  const [error, setError] = useState<string | null>(null);
  const { sent, submitting, send } = useSend(online, setError, rewind);
  const discard = useDiscard(dirty, exit);
  useChrome({ progress: { step: sent ? total : step, total }, onClose: sent ? exit : discard.request });

  const move = (target: number) => {
    setError(null);
    goTo(target);
  };

  const next = () => {
    const fields = stepFields[step - 1] ?? [];
    const invalid = fields.map((field) => form.validateField(field).hasError).some(Boolean);
    if (invalid) {
      focusFirstError();
      return;
    }
    move(step + 1);
  };

  return {
    step,
    direction,
    headingRef,
    total,
    error,
    setError,
    move,
    next,
    sent,
    submitting,
    send,
    discard: { open: discard.open, keep: discard.keep, leave: exit },
  };
}
