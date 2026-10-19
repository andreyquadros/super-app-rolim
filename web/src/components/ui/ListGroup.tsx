import { IconChevronRight } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { AppLink } from "@/components/AppLink";
import type { NavKind } from "@/lib/navMotion";
import classes from "./ListGroup.module.css";

interface ListGroupProps {
  title?: string;
  children: ReactNode;
}

/** Grupo de linhas no estilo de ajustes do celular. */
export function ListGroup({ title, children }: ListGroupProps) {
  return (
    <section className={classes.group}>
      {title && <h2 className={classes.title}>{title}</h2>}
      <ul className={classes.list}>{children}</ul>
    </section>
  );
}

interface ListRowProps {
  icon?: ReactNode;
  label: ReactNode;
  description?: ReactNode;
  /** Link interno (mostra a seta) */
  to?: string;
  nav?: NavKind;
  /** Link externo (tel:, mailto:, https:) */
  href?: string;
  onClick?: () => void;
  /** Conteúdo à direita (ex.: Switch, valor atual) */
  right?: ReactNode;
  tone?: "danger";
}

/** Linha de 56 px: inteira clicável quando é link ou botão. */
export function ListRow({ icon, label, description, to, nav = "push", href, onClick, right, tone }: ListRowProps) {
  const body = (
    <>
      {icon && (
        <span className={classes.icon} aria-hidden>
          {icon}
        </span>
      )}
      <span className={classes.text}>
        <span className={classes.label}>{label}</span>
        {description && <span className={classes.description}>{description}</span>}
      </span>
      {right && <span className={classes.right}>{right}</span>}
      {(to || href) && !right && <IconChevronRight size={20} className={classes.chevron} aria-hidden />}
    </>
  );
  return (
    <li>
      {to ? (
        <AppLink to={to} nav={nav} className={classes.row} data-tone={tone} data-press>
          {body}
        </AppLink>
      ) : href ? (
        <a href={href} className={classes.row} data-tone={tone} data-press>
          {body}
        </a>
      ) : onClick ? (
        <button type="button" className={classes.row} onClick={onClick} data-tone={tone} data-press>
          {body}
        </button>
      ) : (
        <div className={classes.row} data-static>
          {body}
        </div>
      )}
    </li>
  );
}
