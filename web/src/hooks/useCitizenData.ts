import { useMemo } from "react";
import { useAuth } from "@/auth/AuthContext";
import { lazyWatcher } from "@/data/lazy";
import type { Watcher } from "@/data/watch";
import type { CitizenRequest, DutyType } from "@/domain/types";
import { useWatch } from "./useWatch";

// Os módulos de dados (e o Firebase) chegam por import(): a Início usa estes
// hooks e aparece sem esperar o SDK. Cada import() é desestruturado direto
// (o Rollup só descarta o que não é usado nesse formato).

const newestFirst = (a: CitizenRequest, b: CitizenRequest) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);

/** Zeladoria + ouvidoria do cidadão logado, mais recentes primeiro. */
export function useMyRequests() {
  const { user, profile } = useAuth();
  const uid = profile ? user?.uid : undefined;
  const watcher = useMemo((): Watcher<CitizenRequest[]> | null => {
    if (!uid) return null;
    const merged = lazyWatcher(async () => {
      const { watchMyRequests } = await import("@/data/requests");
      const { mergeWatchers } = await import("@/data/watch");
      return mergeWatchers<CitizenRequest>([watchMyRequests("issues", uid), watchMyRequests("ombudsman", uid)]);
    });
    return (onData, onError, options) => merged((items, meta) => onData([...items].sort(newestFirst), meta), onError, options);
  }, [uid]);
  return useWatch(watcher);
}

/** Farmácias ou funerárias ativas (lista pública de plantão). */
export function useDutyUnits(type: DutyType) {
  const watcher = useMemo(() => lazyWatcher(() => import("@/data/buildings").then(({ watchBuildings }) => watchBuildings(type))), [type]);
  const state = useWatch(watcher);
  const active = useMemo(() => (state.data ?? []).filter((b) => b.active), [state.data]);
  return { ...state, data: active };
}

export function useSentNotifications(max = 50) {
  const watcher = useMemo(
    () => lazyWatcher(() => import("@/data/notifications").then(({ watchSentNotifications }) => watchSentNotifications(max))),
    [max],
  );
  return useWatch(watcher);
}
