import { IconPhone } from "@tabler/icons-react";
import { CONTACTS, FUNERAL_GUIDE } from "@/config/city";
import { onlyDigits } from "@/domain/documents";
import classes from "./duty.module.css";

/** "Em caso de falecimento: o que fazer" (só depois de validado pelas secretarias). */
export function FuneralHelp() {
  if (!FUNERAL_GUIDE.enabled) return null;
  return (
    <details className={classes.help}>
      <summary className={classes.helpSummary}>Em caso de falecimento: o que fazer</summary>
      <ol className={classes.helpSteps}>
        {FUNERAL_GUIDE.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div className={classes.actions}>
        <a href="tel:192" className={classes.action} data-variant="outline">
          <IconPhone size={20} aria-hidden />
          Ligar 192
        </a>
        <a href="tel:190" className={classes.action} data-variant="outline">
          <IconPhone size={20} aria-hidden />
          Ligar 190
        </a>
      </div>
      {CONTACTS.crasPhone && (
        <a href={`tel:${onlyDigits(CONTACTS.crasPhone)}`} className={classes.action} data-variant="outline">
          <IconPhone size={20} aria-hidden />
          Ligar para o CRAS
        </a>
      )}
    </details>
  );
}
