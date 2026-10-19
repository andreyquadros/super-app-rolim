import { Button } from "@mantine/core";
import { IconChevronRight, IconPlus } from "@tabler/icons-react";
import { useMemo, type CSSProperties, type ReactNode } from "react";
import { useAuth } from "@/auth/AuthContext";
import { AppLink } from "@/components/AppLink";
import { RequestCard } from "@/components/RequestCard";
import type { CitizenRequest } from "@/domain/types";
import { useOpenNewRequest } from "@/layouts/requestSheetContext";
import { CardError, CardSkeleton } from "./CardError";
import { openRequestsPreview } from "./homeText";
import type { RequestsState } from "./types";
import classes from "./MyRequestsPreview.module.css";
import sections from "./sections.module.css";

const keyOf = (r: CitizenRequest) => `${r.kind}-${r.id}`;

interface PromptProps {
  text: string;
  children: ReactNode;
}

/** Convite no lugar da lista (sem login, cadastro incompleto, nada em andamento). */
function Prompt({ text, children }: PromptProps) {
  return (
    <div className={classes.prompt}>
      <p className={classes.promptText}>{text}</p>
      <div className={classes.actions}>{children}</div>
    </div>
  );
}

/** O próprio RequestCard mostra "Atualizado agora" quando o pedido anda com a tela aberta. */
function PreviewList({ list }: { list: readonly CitizenRequest[] }) {
  return (
    <ul className={classes.list}>
      {list.map((request, i) => (
        <li key={keyOf(request)} className="enter-rise" style={{ "--i": i } as CSSProperties}>
          <RequestCard request={request} />
        </li>
      ))}
    </ul>
  );
}

interface MyRequestsPreviewProps {
  requests: RequestsState;
}

/** "Seus pedidos": até 2 em andamento, ou o convite certo para cada situação. */
export function MyRequestsPreview({ requests }: MyRequestsPreviewProps) {
  const { user, profile, profileError, retryProfile, loading: authLoading } = useAuth();
  const openNewRequest = useOpenNewRequest();
  const preview = useMemo(() => openRequestsPreview(requests.data ?? []), [requests.data]);
  const signedIn = user !== null && profile !== null;

  let body: ReactNode;
  if (authLoading || (signedIn && requests.loading)) {
    body = <CardSkeleton height={96} />;
  } else if (!user) {
    body = (
      <Prompt text="Entre para fazer pedidos e acompanhar cada passo">
        <Button component={AppLink} to="/entrar" nav="flow" size="lg" h={56} radius="xl">
          Entrar
        </Button>
        <Button component={AppLink} to="/cadastro" nav="flow" size="lg" h={56} radius="xl" variant="default">
          Criar conta
        </Button>
      </Prompt>
    );
  } else if (!profile && profileError) {
    // Cadastro não lido (sem resposta do servidor): não é "cadastro incompleto"
    body = <CardError onRetry={retryProfile} />;
  } else if (!profile) {
    body = (
      <Prompt text="Falta pouco: complete seu cadastro para fazer pedidos">
        <Button component={AppLink} to="/completar-cadastro" nav="flow" size="lg" h={56} radius="xl">
          Completar cadastro
        </Button>
      </Prompt>
    );
  } else if (requests.error) {
    body = <CardError onRetry={requests.retry} />;
  } else if (preview.length === 0) {
    body = (
      <Prompt text="Nada em andamento. Precisa de algo?">
        <Button onClick={openNewRequest} size="lg" h={56} radius="xl" leftSection={<IconPlus size={22} aria-hidden />}>
          Solicitar
        </Button>
      </Prompt>
    );
  } else {
    body = <PreviewList list={preview} />;
  }

  return (
    <section aria-labelledby="home-pedidos">
      <div className={sections.head}>
        <h2 id="home-pedidos" className={sections.title}>
          Seus pedidos
        </h2>
        {signedIn && (
          <AppLink to="/protocolos" nav="tab" className={sections.link}>
            Ver todos<span className="visually-hidden"> os pedidos</span>
            <IconChevronRight size={18} aria-hidden />
          </AppLink>
        )}
      </div>
      {body}
    </section>
  );
}
