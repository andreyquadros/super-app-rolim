import { IconBell, IconChevronRight } from "@tabler/icons-react";
import { AppLink } from "@/components/AppLink";
import { relativeTime } from "@/domain/format";
import { useSentNotifications } from "@/hooks/useCitizenData";
import { useUnreadNotices } from "@/hooks/useUnreadNotices";
import { CardError, CardSkeleton } from "./CardError";
import classes from "./LatestNotice.module.css";

interface LatestNoticeProps {
  now: Date;
}

/** Uma linha: "Último aviso · anteontem", o título e a seta para Avisos. */
export function LatestNotice({ now }: LatestNoticeProps) {
  const { data, loading, error, retry } = useSentNotifications(1);
  const unread = useUnreadNotices();
  const latest = data?.[0];

  if (loading || error) {
    return (
      <section className={classes.section} aria-labelledby="home-aviso">
        <h2 id="home-aviso" className={classes.kicker}>
          Último aviso
        </h2>
        {error ? <CardError onRetry={retry} /> : <CardSkeleton height={64} />}
      </section>
    );
  }

  const when = latest?.sentAt ? ` · ${relativeTime(latest.sentAt, now)}` : "";
  return (
    <section className={`${classes.section} enter-rise`}>
      <AppLink to="/comunicados" nav="tab" className={classes.row} data-press>
        <span className={classes.icon} aria-hidden>
          <IconBell size={22} stroke={1.8} />
        </span>
        <div className={classes.text}>
          <div className={classes.kickerRow}>
            <h2 className={classes.kicker}>Último aviso{when}</h2>
            {unread && <span className={classes.new}>Novo</span>}
          </div>
          <p className={classes.title}>{latest?.title ?? "Nenhum aviso por enquanto."}</p>
        </div>
        <IconChevronRight size={20} aria-hidden className={classes.chevron} />
      </AppLink>
    </section>
  );
}
