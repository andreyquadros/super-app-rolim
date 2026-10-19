import { APP_KICKER, CITY_NAME } from "@/config/city";
import classes from "./BrandMark.module.css";

export type BrandVariant = "onGreen" | "onPaper";

interface BrandMarkProps {
  variant?: BrandVariant;
  /** Versão menor para o painel e o trilho lateral */
  compact?: boolean;
}

/** Assinatura "SUPER APP / Rolim de Moura" com o pino do logo. */
export function BrandMark({ variant = "onGreen", compact = false }: BrandMarkProps) {
  const logo = variant === "onGreen" ? "/logo-mono.svg" : "/logo.svg";
  const size = compact ? 28 : 32;
  return (
    <span className={classes.brand} data-variant={variant} data-compact={compact || undefined}>
      <img src={logo} alt="" width={size} height={size} className={classes.logo} />
      <span className={classes.text}>
        <span className={classes.kicker}>{APP_KICKER}</span>{" "}
        <span className={classes.city}>{CITY_NAME}</span>
      </span>
    </span>
  );
}
