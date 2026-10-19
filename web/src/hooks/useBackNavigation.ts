import { useCallback } from "react";
import { useNavigate } from "react-router";
import { setNavKind } from "@/lib/navMotion";

/**
 * Voltar dentro do app. Quem chegou por link direto (e-mail, aviso push)
 * não tem para onde voltar no histórico: vai para o destino de reserva.
 */
export function useBackNavigation(fallback: string) {
  const navigate = useNavigate();
  return useCallback(() => {
    setNavKind("pop");
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  }, [navigate, fallback]);
}
