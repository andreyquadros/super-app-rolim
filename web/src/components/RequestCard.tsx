import { IconChevronRight } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { categoryOf, ombudsmanTypeOf } from "@/domain/catalog";
import { relativeTime } from "@/domain/format";
import { isOpenStatus, type RequestStatus } from "@/domain/status";
import type { CitizenRequest } from "@/domain/types";
import { AppLink } from "./AppLink";
import { CATEGORY_ICONS, OMBUDSMAN_ICONS } from "./icons";
import { StepBar } from "./ui/StepBar";
import classes from "./RequestCard.module.css";

export function requestPath(request: CitizenRequest): string {
  return `/protocolos/${request.kind === "issues" ? "zeladoria" : "ouvidoria"}/${request.id}`;
}

export function requestSubtitle(request: CitizenRequest): string {
  if (request.kind === "issues") {
    const { streetType, streetName, neighborhood } = request.address;
    return `${categoryOf(request.category).label} · ${streetType} ${streetName}, ${neighborhood}`;
  }
  return `${ombudsmanTypeOf(request.type).label} · ${request.buildingName}`;
}

const UPDATED_CHIP_MS = 3000;
const FRESH_CHANGE_MS = 15_000;

function changedJustNow(request: CitizenRequest): boolean {
  const at = request.statusChangedAt;
  return request.status !== "RECEIVED" && at !== null && Date.now() - at.getTime() < FRESH_CHANGE_MS;
}

/**
 * "Atualizado agora" por 3 s quando a situação muda com a tela aberta
 * (ou logo antes de o cartão mudar de grupo e ser montado de novo).
 */
function useJustUpdated(request: CitizenRequest): boolean {
  const seen = useRef<RequestStatus>(request.status);
  const [visible, setVisible] = useState(() => changedJustNow(request));
  const { status } = request;

  useEffect(() => {
    if (seen.current === status) return;
    seen.current = status;
    setVisible(true);
  }, [status]);

  useEffect(() => {
    if (!visible) return undefined;
    const timer = window.setTimeout(() => setVisible(false), UPDATED_CHIP_MS);
    return () => window.clearTimeout(timer);
  }, [visible, status]);

  return visible;
}

/** "Enviado há 2 dias" ou "Atualizado ontem" */
function whenLabel(request: CitizenRequest): string {
  if (request.status === "RECEIVED" || !request.statusChangedAt) return `Enviado ${relativeTime(request.createdAt)}`;
  return `Atualizado ${relativeTime(request.statusChangedAt)}`;
}

interface RequestCardProps {
  request: CitizenRequest;
  to?: string;
  onClick?: () => void;
}

/** Cartão de um pedido: o cartão inteiro é um link (ou botão, no painel). */
export function RequestCard({ request, to, onClick }: RequestCardProps) {
  const Icon = request.kind === "issues" ? CATEGORY_ICONS[request.category] : OMBUDSMAN_ICONS[request.type];
  const justUpdated = useJustUpdated(request);
  const closed = !isOpenStatus(request.status);

  const body = (
    <>
      <span className={classes.head}>
        <span className={classes.title}>{request.title}</span>
        <IconChevronRight size={22} className={classes.chevron} aria-hidden />
      </span>
      <span className={classes.meta}>
        <Icon size={18} stroke={1.8} className={classes.kindIcon} aria-hidden />
        <span>{requestSubtitle(request)}</span>
      </span>
      <StepBar status={request.status} />
      <span className={classes.foot}>
        <span className={classes.protocol}>{request.protocol}</span>
        <span className={classes.when}>{whenLabel(request)}</span>
      </span>
      {justUpdated && <span className={`${classes.updated} bump`}>Atualizado agora</span>}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={classes.card} onClick={onClick} data-closed={closed || undefined} data-press>
        {body}
      </button>
    );
  }
  return (
    <AppLink to={to ?? requestPath(request)} className={classes.card} data-closed={closed || undefined} data-press>
      {body}
    </AppLink>
  );
}
