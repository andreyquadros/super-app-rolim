import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { setNavKind } from "@/lib/navMotion";
import { parseStep } from "./steps";

const STEP_PARAM = "passo";

export type StepDirection = "forward" | "back" | "none";

export interface StepFlow {
  /** Passo exibido (1..total), já limitado ao que pode ser aberto */
  step: number;
  /** Sentido da última troca, para a animação de entrada do passo */
  direction: StepDirection;
  /** H1 do passo: recebe o foco a cada troca */
  headingRef: RefObject<HTMLHeadingElement | null>;
  goTo: (step: number) => void;
  /** Sai do fluxo inteiro (todos os passos empilhados no histórico) */
  exit: () => void;
  /** Volta à primeira entrada do fluxo (depois de enviar: o Voltar sai do fluxo) */
  rewind: () => void;
}

/** Posição da entrada atual no histórico (gravada pelo React Router). */
function historyIdx(): number {
  return (window.history.state as { idx?: number } | null)?.idx ?? 0;
}

/**
 * Sair do fluxo desce a tela (ele entrou subindo). Voltando pelo histórico,
 * o listener global de popstate grava "pop" antes deste: o tipo é refeito.
 */
function markFlowExit(viaHistory: boolean): void {
  setNavKind("flow-exit");
  if (viaHistory) window.addEventListener("popstate", () => setNavKind("flow-exit"), { once: true });
}

function withStep(params: URLSearchParams, step: number): URLSearchParams {
  const next = new URLSearchParams(params);
  next.set(STEP_PARAM, String(step));
  return next;
}

/**
 * Passos em ?passo=N, cada um empilhado no histórico: o Voltar do Android
 * volta um passo. Sem os dados dos passos anteriores (ex.: recarregou a
 * página), volta para o primeiro passo incompleto.
 */
export function useStepFlow(total: number, reachable: number, fallback = "/"): StepFlow {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const requested = parseStep(params.get(STEP_PARAM), total);
  const step = Math.min(requested, Math.max(1, reachable));
  // Entrada do histórico em que o fluxo começou
  const [entryIdx] = useState(historyIdx);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Sentido da troca (ajuste de estado durante a renderização, sem efeito extra)
  const [last, setLast] = useState<{ step: number; direction: StepDirection }>({ step, direction: "none" });
  if (last.step !== step) setLast({ step, direction: step > last.step ? "forward" : "back" });

  // ?passo além do permitido: troca o endereço sem criar entrada nova
  useEffect(() => {
    if (requested !== step) setParams((prev) => withStep(prev, step), { replace: true, preventScrollReset: true });
  }, [requested, step, setParams]);

  // A cada troca de passo: topo da tela e foco na nova pergunta
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    window.scrollTo(0, 0);
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const goTo = useCallback(
    (target: number) => {
      const next = Math.min(Math.max(target, 1), total);
      if (next === step) return;
      // Rola antes de navegar: a rolagem guardada para esta tela fica no topo
      window.scrollTo(0, 0);
      if (next > step) {
        setParams((prev) => withStep(prev, next));
        return;
      }
      const back = step - next;
      if (historyIdx() - entryIdx >= back) navigate(-back);
      else setParams((prev) => withStep(prev, next), { replace: true });
    },
    [step, total, entryIdx, setParams, navigate],
  );

  const exit = useCallback(() => {
    const depth = Math.max(0, historyIdx() - entryIdx);
    markFlowExit(entryIdx > 0 || depth > 0);
    if (entryIdx > 0) {
      navigate(-(depth + 1));
      return;
    }
    if (depth > 0) {
      // Entrou direto no fluxo (atalho do app, link): volta à primeira entrada
      // e a troca pelo destino, sem deixar passos vazios no histórico
      window.addEventListener("popstate", () => navigate(fallback, { replace: true }), { once: true });
      navigate(-depth);
      return;
    }
    navigate(fallback, { replace: true });
  }, [entryIdx, fallback, navigate]);

  const rewind = useCallback(() => {
    const back = historyIdx() - entryIdx;
    if (back > 0) navigate(-back);
  }, [entryIdx, navigate]);

  return { step, direction: last.direction, headingRef, goTo, exit, rewind };
}
