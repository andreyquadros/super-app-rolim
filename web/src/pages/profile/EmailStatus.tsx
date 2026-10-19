import { Button } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCircleCheck, IconMailExclamation } from "@tabler/icons-react";
import { useId, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { APP_NAME } from "@/config/city";
import { errorMessage } from "@/lib/errors";
import classes from "./data.module.css";

type Busy = "send" | "check" | null;

/** E-mail da conta e a confirmação (com reenvio do link). */
export function EmailStatus() {
  const { user, profile, resendVerification, refreshVerification } = useAuth();
  const [busy, setBusy] = useState<Busy>(null);
  const titleId = useId();
  if (!user) return null;

  const email = profile?.email || user.email || "";
  const verified = user.emailVerified;

  const resend = async () => {
    setBusy("send");
    try {
      await resendVerification();
      notifications.show({ message: `Enviamos o link para ${email}.`, color: "mata" });
    } catch (error: unknown) {
      notifications.show({ title: "Não foi possível enviar", message: errorMessage(error), color: "barro" });
    } finally {
      setBusy(null);
    }
  };

  const check = async () => {
    setBusy("check");
    try {
      const ok = await refreshVerification();
      notifications.show({
        message: ok ? "E-mail confirmado. Obrigado!" : "Ainda não identificamos a confirmação. Abra o link do e-mail e tente de novo.",
        color: ok ? "mata" : "ipe",
      });
    } catch (error: unknown) {
      notifications.show({ title: "Não foi possível conferir", message: errorMessage(error), color: "barro" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className={classes.section} aria-labelledby={titleId}>
      <h2 id={titleId} className={classes.sectionTitle}>
        E-mail
      </h2>
      <div className={classes.card} data-attention={!verified || undefined}>
        <p className={classes.emailValue}>{email}</p>
        <p className={classes.status} data-state={verified ? "ok" : "pending"}>
          {verified ? <IconCircleCheck size={18} aria-hidden /> : <IconMailExclamation size={18} aria-hidden />}
          {verified ? "Confirmado" : "Ainda não confirmado"}
        </p>
        {!verified && (
          <>
            <p className={classes.help}>
              Confirme para receber por e-mail o andamento dos seus pedidos. Procure a mensagem do {APP_NAME} na caixa de entrada e
              também no spam.
            </p>
            <div className={classes.buttons}>
              <Button size="lg" radius="xl" variant="light" loading={busy === "send"} disabled={busy === "check"} onClick={() => void resend()}>
                Reenviar e-mail
              </Button>
              <Button size="lg" radius="xl" variant="default" loading={busy === "check"} disabled={busy === "send"} onClick={() => void check()}>
                Já confirmei
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
