import { createContext, useContext } from "react";

/** Abre a folha "O que você quer registrar?" de qualquer tela do cidadão. */
export const RequestSheetContext = createContext<() => void>(() => undefined);

export function useOpenNewRequest(): () => void {
  return useContext(RequestSheetContext);
}
