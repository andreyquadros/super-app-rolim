import {
  IconBuilding,
  IconBuildingCommunity,
  IconCalendarEvent,
  IconCalendarPlus,
  IconFlag,
  IconMapPin,
  IconMessage,
  type Icon,
} from "@tabler/icons-react";
import { CATEGORY_ICONS, OMBUDSMAN_ICONS } from "@/components/icons";
import { categoryOf, ombudsmanTypeOf } from "@/domain/catalog";
import { formatDate, formatDateTime } from "@/domain/format";
import type { CitizenRequest, Issue, Ombudsman } from "@/domain/types";
import { issueAddressLine } from "./requestModel";
import classes from "./detail.module.css";

interface Row {
  icon: Icon;
  term: string;
  value: string;
  /** Texto longo (mantém as quebras de linha do relato) */
  long?: boolean;
}

function issueRows(request: Issue): Row[] {
  const { complement } = request.address;
  return [
    { icon: CATEGORY_ICONS[request.category], term: "Tipo de problema", value: categoryOf(request.category).label },
    { icon: IconMapPin, term: "Endereço", value: issueAddressLine(request) },
    ...(complement ? [{ icon: IconFlag, term: "Ponto de referência", value: complement }] : []),
    ...(request.department ? [{ icon: IconBuildingCommunity, term: "Setor responsável", value: request.department }] : []),
  ];
}

function ombudsmanRows(request: Ombudsman): Row[] {
  const day = request.occurrenceDate ? formatDate(new Date(`${request.occurrenceDate}T12:00:00`)) : "Não informado";
  return [
    { icon: OMBUDSMAN_ICONS[request.type], term: "Assunto", value: ombudsmanTypeOf(request.type).label },
    { icon: IconBuilding, term: "Local do atendimento", value: request.buildingName },
    { icon: IconCalendarEvent, term: "Quando aconteceu", value: request.occurrenceTime ? `${day}, às ${request.occurrenceTime}` : day },
  ];
}

/** Dados do pedido em lista, com ícone e rótulo em letras normais. */
export function DetailsList({ request }: { request: CitizenRequest }) {
  const rows: Row[] = [
    ...(request.kind === "issues" ? issueRows(request) : ombudsmanRows(request)),
    { icon: IconCalendarPlus, term: "Enviado em", value: formatDateTime(request.createdAt) },
    { icon: IconMessage, term: "O que você contou", value: request.description, long: true },
  ];

  return (
    <dl className={classes.details}>
      {rows.map((row) => (
        <div key={row.term} className={classes.detailRow}>
          <dt className={classes.term}>
            <span className={classes.detailIcon} aria-hidden>
              <row.icon size={20} stroke={1.8} />
            </span>
            {row.term}
          </dt>
          <dd className={classes.value} data-long={row.long || undefined}>
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
