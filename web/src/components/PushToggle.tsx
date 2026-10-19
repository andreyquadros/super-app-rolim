import { Switch } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBellRinging } from "@tabler/icons-react";
import { useId, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { errorMessage } from "@/lib/errors";
import { isIos, isStandalone } from "@/lib/platform";
import { currentPushState, disablePush, enablePush, type PushState } from "@/lib/push";
import classes from "./PushToggle.module.css";

/** Este ambiente tem push configurado? (sem chave, não oferece o que não funciona) */
export function pushAvailable(): boolean {
  return currentPushState() !== "unconfigured";
}

function hintFor(state: PushState): string | null {
  if (state === "denied") return "Os avisos estão bloqueados neste celular. Libere as notificações deste site nas configurações do navegador.";
  if (state !== "unsupported") return null;
  return isIos() && !isStandalone()
    ? "No iPhone, coloque o app na tela inicial para receber avisos."
    : "Este navegador não recebe avisos. Tente pelo Chrome ou instale o app.";
}

interface PushToggleProps {
  /** "card": cartão solto; "row": linha de um ListGroup (renderiza <li>) */
  variant?: "card" | "row";
}

/** Liga e desliga os avisos (push) neste aparelho. */
export function PushToggle({ variant = "card" }: PushToggleProps) {
  const { user } = useAuth();
  const [state, setState] = useState<PushState>(currentPushState);
  const [busy, setBusy] = useState(false);
  const hintId = useId();

  if (!user || state === "unconfigured") return null;

  const toggle = async (checked: boolean) => {
    setBusy(true);
    try {
      if (checked) {
        const result = await enablePush(user.uid);
        setState(result);
        if (result === "enabled") notifications.show({ message: "Pronto! Você vai receber os avisos no celular.", color: "mata" });
      } else {
        await disablePush();
        setState("disabled");
        notifications.show({ message: "Avisos desligados neste celular.", color: "slate" });
      }
    } catch (error: unknown) {
      notifications.show({
        title: checked ? "Não foi possível ligar os avisos" : "Não foi possível desligar os avisos",
        message: errorMessage(error),
        color: "barro",
      });
    } finally {
      setBusy(false);
    }
  };

  const hint = hintFor(state);
  const content = (
    <>
      <div className={classes.line}>
        <span className={classes.icon} aria-hidden>
          <IconBellRinging size={22} stroke={1.8} />
        </span>
        <Switch
          size="lg"
          labelPosition="left"
          label={variant === "row" ? "Avisos" : "Avisos no celular"}
          description="Comunicados e o andamento dos seus pedidos"
          checked={state === "enabled"}
          disabled={busy || state === "unsupported" || state === "denied"}
          onChange={(event) => void toggle(event.currentTarget.checked)}
          aria-describedby={hint ? hintId : undefined}
          classNames={{
            root: classes.root,
            body: classes.body,
            labelWrapper: classes.labelWrapper,
            label: classes.label,
            description: classes.description,
            track: classes.track,
          }}
        />
      </div>
      {hint && (
        <p id={hintId} className={classes.hint}>
          {hint}
        </p>
      )}
    </>
  );

  return variant === "row" ? (
    <li className={classes.row}>{content}</li>
  ) : (
    <div className={classes.card} data-on={state === "enabled" || undefined}>
      {content}
    </div>
  );
}
