import { IconMap, IconMapOff } from "@tabler/icons-react";
import { useId, useState } from "react";
import { MapView, STATUS_HEX } from "@/components/map";
import type { Issue } from "@/domain/types";
import { hasLocation } from "./requestModel";
import classes from "./actions.module.css";

/**
 * O mapa só carrega quando a pessoa pede (economiza o Leaflet e os
 * blocos do mapa no plano de dados de quem só quer ver a situação).
 */
export function LocationMap({ request }: { request: Issue }) {
  const [open, setOpen] = useState(false);
  const mapId = useId();
  if (!hasLocation(request)) return null;

  return (
    <div className={classes.mapBlock}>
      <button
        type="button"
        className={classes.mapButton}
        aria-expanded={open}
        aria-controls={open ? mapId : undefined}
        onClick={() => setOpen((v) => !v)}
        data-press
      >
        {open ? <IconMapOff size={22} aria-hidden /> : <IconMap size={22} aria-hidden />}
        {open ? "Esconder o mapa" : "Ver local no mapa"}
      </button>
      {open && (
        <div id={mapId} className={classes.map}>
          <MapView
            label="Local do problema no mapa"
            height={260}
            markers={[{ id: request.id, lat: request.lat, lng: request.lng, color: STATUS_HEX[request.status], label: request.title }]}
          />
        </div>
      )}
    </div>
  );
}
