import { useMemo } from "react";
import { useAuth } from "@/auth/AuthContext";
import { watchBuildings } from "@/data/buildings";
import { watchSentNotifications } from "@/data/notifications";
import { watchMyRequests } from "@/data/requests";
import { mergeWatchers } from "@/data/watch";
import type { CitizenRequest, DutyType } from "@/domain/types";
import { useWatch } from "./useWatch";

const newestFirst = (a: CitizenRequest, b: CitizenRequest) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);

/** Zeladoria + ouvidoria do cidadão logado, mais recentes primeiro. */
export function useMyRequests() {
  const { user, profile } = useAuth();
  const uid = profile ? user?.uid : undefined;
  const watcher = useMemo(() => {
    if (!uid) return null;
    const merged = mergeWatchers<CitizenRequest>([watchMyRequests("issues", uid), watchMyRequests("ombudsman", uid)]);
    return (onData: (v: CitizenRequest[]) => void, onError: Parameters<typeof merged>[1]) =>
      merged((items) => onData([...items].sort(newestFirst)), onError);
  }, [uid]);
  return useWatch(watcher);
}

/** Farmácias ou funerárias ativas (lista pública de plantão). */
export function useDutyUnits(type: DutyType) {
  const watcher = useMemo(() => watchBuildings(type), [type]);
  const state = useWatch(watcher);
  const active = useMemo(() => (state.data ?? []).filter((b) => b.active), [state.data]);
  return { ...state, data: active };
}

export function useSentNotifications(max = 50) {
  const watcher = useMemo(() => watchSentNotifications(max), [max]);
  return useWatch(watcher);
}
