import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ForbiddenPage } from "@/pages/StatusPages";
import { useAuth } from "./AuthContext";
import { GuardSkeleton, ProfileUnavailable } from "./GuardStates";

function useNextParam(): string {
  const location = useLocation();
  return encodeURIComponent(location.pathname + location.search);
}

/** Exige login e cadastro completo (CPF e telefone). */
export function RequireCitizen({ children }: { children: ReactNode }) {
  const { user, profile, profileError, retryProfile, loading } = useAuth();
  const next = useNextParam();
  if (loading) return <GuardSkeleton />;
  if (!user) return <Navigate to={`/entrar?next=${next}`} replace />;
  if (!profile) {
    // Sem resposta do servidor não dá para saber se falta o cadastro
    if (profileError) return <ProfileUnavailable onRetry={retryProfile} />;
    return <Navigate to={`/completar-cadastro?next=${next}`} replace />;
  }
  return children;
}

export function RequireUser({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const next = useNextParam();
  if (loading) return <GuardSkeleton />;
  if (!user) return <Navigate to={`/entrar?next=${next}`} replace />;
  return children;
}

type Access = "staff" | "manager" | "root" | "duty";

/** Área da prefeitura: verifica o perfil de acesso da equipe (fora da casca do cidadão). */
export function RequireStaff({ access, children }: { access: Access; children: ReactNode }) {
  const { user, staff, isRoot, isManager, isDutyManager, loading } = useAuth();
  const next = useNextParam();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to={`/entrar?next=${next}`} replace />;
  const allowed =
    (access === "staff" && staff !== null) ||
    (access === "manager" && isManager) ||
    (access === "root" && isRoot) ||
    (access === "duty" && (isDutyManager || isRoot));
  return allowed ? children : <ForbiddenPage />;
}
