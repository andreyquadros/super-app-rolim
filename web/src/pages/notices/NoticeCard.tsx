import { IconSpeakerphone } from "@tabler/icons-react";
import { useId, type CSSProperties } from "react";
import { formatDate, relativeTime } from "@/domain/format";
import type { CityNotification } from "@/domain/types";
import classes from "./notices.module.css";

interface NoticeCardProps {
  notice: CityNotification;
  isNew: boolean;
  /** Posição na lista (entrada escalonada) */
  index: number;
  /** Avisos antigos mostram a data; os recentes, "há 2 horas" */
  showDate: boolean;
}

export function NoticeCard({ notice, isNew, index, showDate }: NoticeCardProps) {
  const titleId = useId();
  const when = showDate ? formatDate(notice.sentAt) : relativeTime(notice.sentAt);

  return (
    <li className={`${classes.card} enter-rise`} style={{ "--i": index } as CSSProperties} data-new={isNew || undefined}>
      <article aria-labelledby={titleId}>
        <div className={classes.meta}>
          <span className={classes.unitIcon} aria-hidden>
            <IconSpeakerphone size={18} stroke={1.8} />
          </span>
          <span className={classes.metaText}>
            <span className={classes.unit}>{notice.buildingName || "Prefeitura Municipal"}</span>
            <time className={classes.time} dateTime={notice.sentAt?.toISOString()}>
              {when}
            </time>
          </span>
          {isNew && <span className={classes.newChip}>Novo</span>}
        </div>
        <h3 id={titleId} className={classes.title}>
          {notice.title}
        </h3>
        {notice.body && <p className={classes.body}>{notice.body}</p>}
      </article>
    </li>
  );
}

export function NoticeCardSkeleton() {
  return <li className={`${classes.skeleton} shimmer`} aria-hidden />;
}
