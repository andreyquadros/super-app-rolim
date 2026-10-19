import { IconUserEdit } from "@tabler/icons-react";
import { useId } from "react";
import { AppLink } from "@/components/AppLink";
import classes from "./profile.module.css";

/** Conta sem CPF e celular (ex.: entrou com Google e não terminou o cadastro). */
export function CompleteProfileInvite({ next }: { next: string }) {
  const titleId = useId();
  return (
    <section className={classes.invite} aria-labelledby={titleId}>
      <span className={classes.inviteIcon} aria-hidden>
        <IconUserEdit size={24} stroke={1.8} />
      </span>
      <div className={classes.inviteText}>
        <h2 id={titleId} className={classes.inviteTitle}>
          Falta pouco: complete seu cadastro
        </h2>
        <p className={classes.inviteBody}>Com seu CPF e celular, você pode fazer pedidos à prefeitura e acompanhar cada passo.</p>
        <AppLink to={`/completar-cadastro?next=${encodeURIComponent(next)}`} nav="flow" className={classes.inviteButton} data-press>
          Completar cadastro
        </AppLink>
      </div>
    </section>
  );
}
