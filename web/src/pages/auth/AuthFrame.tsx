import type { ReactNode } from "react";
import { MAINTAINER_LINE } from "@/config/city";
import classes from "./auth.module.css";

interface AuthFrameProps {
  /** Pergunta ou convite da tela (H1) */
  title: string;
  /** Texto curto de apoio abaixo do título */
  lead?: ReactNode;
  /** Troca o logo por outro símbolo (ex.: o "certo" de link enviado) */
  icon?: ReactNode;
  children: ReactNode;
}

/**
 * Moldura das telas de acesso: logo, título, apoio e a linha institucional
 * no rodapé. No celular o conteúdo fica direto no papel; a partir de 768 px,
 * num cartão.
 */
export function AuthFrame({ title, lead, icon, children }: AuthFrameProps) {
  return (
    <div className={classes.frame}>
      <div className={classes.card}>
        <header className={classes.head}>
          {icon ?? <img src="/logo.svg" alt="" width={56} height={56} className={classes.logo} />}
          <h1 className={classes.title} tabIndex={-1}>
            {title}
          </h1>
          {lead && <p className={classes.lead}>{lead}</p>}
        </header>
        {children}
      </div>
      <footer className={classes.maintainer}>{MAINTAINER_LINE}</footer>
    </div>
  );
}
