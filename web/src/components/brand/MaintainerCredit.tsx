import { MAINTAINER_LINE, PARTNER } from "@/config/city";
import classes from "./MaintainerCredit.module.css";

export type CreditVariant = "paper" | "green" | "rail";

interface MaintainerCreditProps {
  /** paper: fundo claro; green: sobre o verde do app; rail: só a logo (trilho lateral) */
  variant?: CreditVariant;
  align?: "start" | "center";
  className?: string;
}

/** "Uma iniciativa da Prefeitura … junto com o Projeto Cidades Inteligentes" com a logo do projeto. */
export function MaintainerCredit({ variant = "paper", align = "start", className }: MaintainerCreditProps) {
  return (
    <p className={className ? `${classes.credit} ${className}` : classes.credit} data-variant={variant} data-align={align}>
      <span className={classes.badge}>
        {/* O nome do projeto já está no texto: a logo é só a assinatura visual */}
        <img src={PARTNER.logo} alt="" width={32} height={32} className={classes.logo} />
      </span>
      <span className={variant === "rail" ? "visually-hidden" : classes.text}>{MAINTAINER_LINE}</span>
    </p>
  );
}
