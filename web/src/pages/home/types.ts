import type { Building, CitizenRequest } from "@/domain/types";

/** Lista de plantão já filtrada (unidades ativas), como devolve useDutyUnits. */
export interface DutyState {
  data: Building[];
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/** Pedidos do cidadão, como devolve useMyRequests. */
export interface RequestsState {
  data: CitizenRequest[] | undefined;
  loading: boolean;
  error: string | null;
  retry: () => void;
}
