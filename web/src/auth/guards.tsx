import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ForbiddenPage } from "@/pages/StatusPages";
import { useAuth } from "./AuthContext";

function useNextParam(): string {
  const location = useLocation();
  return encodeURIComponent(location.pathname + location.search);
}

/** Exige login e cadastro completo (CPF e telefone). */
export function RequireCitizen({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  const next = useNextParam();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to={`/entrar?next=${next}`} replace />;
  if (!profile) return <Navigate to={`/completar-cadastro?next=${next}`} replace />;
  return children;
}

export function RequireUser({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const next = useNextParam();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to={`/entrar?next=${next}`} replace />;
  return children;
}

type Access = "staff" | "manager" | "root" | "pharmacist";

/** Área da prefeitura: verifica o perfil de acesso da equipe. */
export function RequireStaff({ access, children }: { access: Access; children: ReactNode }) {
  const { user, staff, isRoot, isManager, isPharmacist, loading } = useAuth();
  const next = useNextParam();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to={`/entrar?next=${next}`} replace />;
  const allowed =
    (access === "staff" && staff !== null) ||
    (access === "manager" && isManager) ||
    (access === "root" && isRoot) ||
    (access === "pharmacist" && (isPharmacist || isRoot));
  return allowed ? children : <ForbiddenPage />;
}
