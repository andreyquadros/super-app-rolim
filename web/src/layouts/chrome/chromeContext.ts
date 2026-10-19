import { createContext, useContext, useEffect, type ReactNode } from "react";

/** Partes da barra superior que dependem do estado da tela. */
export interface ChromeOverrides {
  /** Título dinâmico (ex.: nome do pedido); senão vale o handle da rota */
  title?: string;
  /** Ações à direita nas telas empilhadas (texto ou aria-label) */
  actions?: ReactNode;
  /** Barra de progresso das tarefas em tela cheia */
  progress?: { step: number; total: number };
  /** "Fechar" personalizado, ex.: confirmar antes de descartar o que foi preenchido */
  onClose?: () => void;
}

export const ChromeContext = createContext<(overrides: ChromeOverrides | null) => void>(() => undefined);

/** A tela informa título, ações ou progresso para a barra superior. */
export function useChrome(overrides: ChromeOverrides): void {
  const set = useContext(ChromeContext);
  const { title, actions, progress, onClose } = overrides;
  const step = progress?.step;
  const total = progress?.total;
  useEffect(() => {
    set({ title, actions, onClose, progress: step !== undefined && total !== undefined ? { step, total } : undefined });
  }, [set, title, actions, onClose, step, total]);
  useEffect(() => () => set(null), [set]);
}
