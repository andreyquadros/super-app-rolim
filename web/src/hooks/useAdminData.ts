import { useMemo } from "react";
import { useAuth } from "@/auth/AuthContext";
import { watchBuildings } from "@/data/buildings";
import { watchStaff } from "@/data/people";
import { watchAdminRequests } from "@/data/requests";
import type { BuildingType, RequestKind } from "@/domain/types";
import { useWatch } from "./useWatch";

/** Solicitações visíveis à pessoa da equipe logada. */
export function useAdminRequests(kind: RequestKind) {
  const { isManager, buildingScope } = useAuth();
  const scopeKey = buildingScope === null ? "*" : buildingScope.join(",");
  const watcher = useMemo(
    () => (isManager ? watchAdminRequests(kind, scopeKey === "*" ? null : scopeKey.split(",").filter(Boolean)) : null),
    [isManager, kind, scopeKey],
  );
  return useWatch(watcher);
}

export function useBuildings(type?: BuildingType) {
  const watcher = useMemo(() => watchBuildings(type), [type]);
  return useWatch(watcher);
}

/** Unidades públicas que a pessoa pode gerenciar (todas, para ROOT). */
export function useManagedUnits() {
  const { buildingScope } = useAuth();
  const { data, loading, error } = useBuildings("PUBLIC");
  const units = useMemo(
    () => (data ?? []).filter((b) => b.active && (buildingScope === null || buildingScope.includes(b.id))),
    [data, buildingScope],
  );
  return { units, all: data ?? [], loading, error };
}

export function useStaffList() {
  const watcher = useMemo(() => watchStaff(), []);
  return useWatch(watcher);
}
