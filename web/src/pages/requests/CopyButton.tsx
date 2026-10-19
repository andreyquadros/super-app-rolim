import { notifications } from "@mantine/notifications";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { copyText } from "./clipboard";
import classes from "./actions.module.css";

const COPIED_MS = 2000;

interface CopyButtonProps {
  value: string;
  /** Completa o nome acessível: "Copiar protocolo" */
  what: string;
}

/** [Copiar] que vira "Copiado" por 2 s (troca do rótulo com crossfade). */
export function CopyButton({ value, what }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), COPIED_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    if (await copyText(value)) {
      setCopied(true);
      return;
    }
    notifications.show({ color: "barro", title: "Não foi possível copiar", message: `Anote o número: ${value}` });
  };

  return (
    <>
      <button type="button" className={classes.copy} onClick={copy} data-copied={copied || undefined} data-press>
        <span className={classes.copyLabel} aria-hidden={copied || undefined}>
          <IconCopy size={20} aria-hidden />
          Copiar<span className="visually-hidden"> {what}</span>
        </span>
        <span className={classes.copyLabel} aria-hidden={!copied || undefined}>
          <IconCheck size={20} stroke={2.6} aria-hidden />
          Copiado
        </span>
      </button>
      <span className="visually-hidden" role="status">
        {copied ? `${what} copiado` : ""}
      </span>
    </>
  );
}
