import { useEffect } from "react";
import { APP_NAME } from "@/config/city";

/** "<Tela> · SUPER APP Rolim de Moura" na aba e no histórico do navegador. */
export function useDocumentTitle(title: string | undefined): void {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
  }, [title]);
}
