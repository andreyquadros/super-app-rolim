import { IconCurrentLocation, IconMap } from "@tabler/icons-react";
import { Chip, ChipRow } from "@/components/ui/Chips";
import type { DutyFilter } from "@/domain/duty";
import type { FilterOption } from "./dutyView";
import classes from "./duty.module.css";

interface DutyToolbarProps {
  filters: readonly FilterOption[];
  filter: DutyFilter;
  onFilter: (value: DutyFilter) => void;
  located: boolean;
  locating: boolean;
  onNearMe: () => void;
  mapOpen: boolean;
  mapDisabled: boolean;
  onMap: () => void;
}

/**
 * Filtros numa linha que rola de lado; "Perto de mim" e "Mapa" ficam fora dela,
 * numa linha própria, sempre à vista (ninguém precisa descobrir a rolagem).
 */
export function DutyToolbar({ filters, filter, onFilter, located, locating, onNearMe, mapOpen, mapDisabled, onMap }: DutyToolbarProps) {
  return (
    <>
      <ChipRow label="Filtrar a lista">
        {filters.map((f) => (
          <Chip key={f.value} pressed={filter === f.value} onClick={() => onFilter(f.value)}>
            {f.label}
          </Chip>
        ))}
      </ChipRow>
      <div className={classes.tools} role="group" aria-label="Ver a lista de outro jeito">
        <Chip kind="action" pressed={located} onClick={onNearMe} disabled={locating} icon={<IconCurrentLocation size={20} aria-hidden />}>
          {locating ? "Localizando…" : "Perto de mim"}
        </Chip>
        <Chip kind="action" pressed={mapOpen} onClick={onMap} disabled={mapDisabled} icon={<IconMap size={20} aria-hidden />}>
          Mapa
        </Chip>
      </div>
    </>
  );
}
