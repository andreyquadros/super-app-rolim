import { useEffect, useState } from "react";
import { getNoticesSeenAt, isNewNotice, onNoticesSeen } from "@/lib/noticesSeen";
import { useSentNotifications } from "./useCitizenData";

/** Há aviso publicado depois da última visita a "Avisos"? (mesma regra do chip "Novo") */
export function useUnreadNotices(): boolean {
  const { data } = useSentNotifications(1);
  const [seenAt, setSeenAt] = useState(getNoticesSeenAt);
  useEffect(() => onNoticesSeen(() => setSeenAt(getNoticesSeenAt())), []);
  return isNewNotice(data?.[0]?.sentAt, seenAt, new Date());
}
