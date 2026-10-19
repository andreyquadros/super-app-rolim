import { IconHome, IconLock, IconMapQuestion } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { AppLink } from "@/components/AppLink";
import { useRouteHandle } from "@/layouts/routeHandle";
import classes from "./StatusPages.module.css";

interface StatusViewProps {
  icon: ReactNode;
  tone: "mata" | "slate";
  /** Sem título: a faixa verde da tela (casca "root") já mostra o H1 */
  title: string | null;
  text: string;
}

function StatusView({ icon, tone, title, text }: StatusViewProps) {
  return (
    <section className={classes.status} data-tone={tone}>
      <span className={classes.art} aria-hidden>
        {icon}
      </span>
      {title && <h1 className={classes.title}>{title}</h1>}
      <p className={classes.text}>{text}</p>
      <AppLink to="/" nav="tab" className={classes.home} data-press>
        <IconHome size={20} aria-hidden />
        Ir para o início
      </AppLink>
    </section>
  );
}

/** Área da equipe sem permissão (também aparece fora da casca do cidadão). */
export function ForbiddenPage() {
  return (
    <div className={`citizen ${classes.standalone}`}>
      <StatusView
        icon={<IconLock size={40} stroke={1.6} />}
        tone="slate"
        title="Acesso restrito"
        text="Esta área é da equipe da prefeitura. Se você deveria ter acesso, peça ao administrador para liberar seu CPF."
      />
    </div>
  );
}

/** 404: endereço que não existe (ou tipo de plantão inválido). */
export default function NotFoundPage() {
  const { chrome } = useRouteHandle();
  return (
    <StatusView
      icon={<IconMapQuestion size={40} stroke={1.6} />}
      tone="mata"
      title={chrome === "root" ? null : "Página não encontrada"}
      text="O endereço pode ter mudado ou o link está incompleto. Volte ao início para continuar."
    />
  );
}
