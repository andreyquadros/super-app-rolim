import { IconBell, IconBellRinging, IconRefresh } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { AppLink } from "@/components/AppLink";
import { EmptyState } from "@/components/EmptyState";
import { PushToggle } from "@/components/PushToggle";
import { useSentNotifications } from "@/hooks/useCitizenData";
import { getNoticesSeenAt, isNewNotice, markNoticesSeen, seenMarkFor } from "@/lib/noticesSeen";
import { currentPushState } from "@/lib/push";
import { NoticeCard, NoticeCardSkeleton } from "./NoticeCard";
import { groupNotices } from "./noticeGroups";
import classes from "./notices.module.css";

const SKELETONS = [0, 1, 2];

/**
 * Só quando dá para ligar os avisos neste aparelho ("disabled"): logado, o
 * interruptor; sem conta, o convite para entrar. Sem configuração, sem suporte
 * ou bloqueado, nada aparece (não promete o que não vai funcionar).
 */
function PushSlot() {
  const { user, loading } = useAuth();
  // Decide uma vez: depois de ligar, o cartão continua (mostrando ligado)
  const [pushOff] = useState(() => currentPushState() === "disabled");

  if (loading || !pushOff) return null;
  if (user) return <PushToggle />;
  return (
    <div className={classes.invite}>
      <span className={classes.inviteIcon} aria-hidden>
        <IconBellRinging size={24} stroke={1.8} />
      </span>
      <div className={classes.inviteText}>
        <p className={classes.inviteTitle}>Receba os avisos no celular</p>
        <p className={classes.inviteBody}>Entre na sua conta para ligar os avisos e saber quando seu pedido andar.</p>
        <AppLink to="/entrar?next=%2Fcomunicados" nav="flow" className={classes.inviteButton} data-press>
          Entrar
        </AppLink>
      </div>
    </div>
  );
}

function NoticeList() {
  const { data, loading, error, retry } = useSentNotifications(50);
  // "Novo" compara com a visita anterior (lida antes de marcar esta como vista)
  const [seenAt] = useState(getNoticesSeenAt);
  const latest = data?.[0]?.sentAt?.getTime() ?? 0;
  const shown = !loading && !error && data !== undefined;

  // Marca como visto só quando a lista apareceu (erro ou carregando não contam)
  // e de novo quando chega um aviso com a tela aberta
  useEffect(() => {
    if (shown) markNoticesSeen(seenMarkFor(latest));
  }, [shown, latest]);

  if (error) {
    return (
      <div className={classes.error} role="alert">
        <p>Não foi possível carregar os avisos.</p>
        <button type="button" className={classes.retry} onClick={retry} data-press>
          <IconRefresh size={18} aria-hidden /> Tentar de novo
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <ul className={classes.list} aria-busy aria-label="Carregando avisos">
        {SKELETONS.map((i) => (
          <NoticeCardSkeleton key={i} />
        ))}
      </ul>
    );
  }

  const notices = data ?? [];
  if (notices.length === 0) {
    return (
      <EmptyState
        order={2}
        icon={<IconBell size={28} />}
        title="Nenhum aviso por enquanto"
        description="Quando a prefeitura publicar campanhas, alertas ou mudanças nos serviços, eles aparecem aqui."
      />
    );
  }

  const now = new Date();
  const groups = groupNotices(notices, now);
  // Índice corrido entre os grupos: a entrada escalonada segue a leitura
  const offsets = groups.map((_, g) => groups.slice(0, g).reduce((sum, prev) => sum + prev.items.length, 0));

  return (
    <>
      {groups.map((group, g) => (
        <section key={group.key} className={classes.group} aria-labelledby={`avisos-${group.key}`}>
          <h2 id={`avisos-${group.key}`} className={classes.groupTitle}>
            {group.title}
          </h2>
          <ol className={classes.list}>
            {group.items.map((notice, i) => (
              <NoticeCard
                key={notice.id}
                notice={notice}
                index={offsets[g] + i}
                isNew={isNewNotice(notice.sentAt, seenAt, now)}
                showDate={group.key === "antigos"}
              />
            ))}
          </ol>
        </section>
      ))}
    </>
  );
}

/** /comunicados: avisos públicos da prefeitura (sem login). */
export default function NoticesPage() {
  return (
    <div className={classes.page}>
      <PushSlot />
      <NoticeList />
    </div>
  );
}
