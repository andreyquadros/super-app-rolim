import { useMemo } from "react";
import { useAuth } from "@/auth/AuthContext";
import { watchBuildings, watchOwnedDutyUnits } from "@/data/buildings";
import type { Watcher } from "@/data/watch";
import { isDutyType } from "@/domain/duty";
import type { Building } from "@/domain/types";
import { useWatch } from "@/hooks/useWatch";

/** Administrador vê todas as farmácias e funerárias (já ordenadas por nome). */
function watchAllDutyUnits(): Watcher<Building[]> {
  const all = watchBuildings();
  return (onData, onError) => all((items) => onData(items.filter((b) => isDutyType(b.type))), onError);
}

/** Estabelecimentos que a pessoa logada atualiza no "Meus plantões". */
export function useDutyUnits() {
  const { user, isRoot } = useAuth();
  const uid = user?.uid ?? null;
  const watcher = useMemo(() => {
    if (!uid) return null;
    return isRoot ? watchAllDutyUnits() : watchOwnedDutyUnits(uid);
  }, [uid, isRoot]);
  return { ...useWatch(watcher), isRoot };
}
