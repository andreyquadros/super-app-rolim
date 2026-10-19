import { useEffect, useState } from "react";
import { getNoticesSeenAt, onNoticesSeen } from "@/lib/noticesSeen";
import { useSentNotifications } from "./useCitizenData";

/** Há aviso publicado depois da última visita a "Avisos"? */
export function useUnreadNotices(): boolean {
  const { data } = useSentNotifications(1);
  const [seenAt, setSeenAt] = useState(getNoticesSeenAt);
  useEffect(() => onNoticesSeen(() => setSeenAt(getNoticesSeenAt())), []);
  const latest = data?.[0]?.sentAt?.getTime() ?? 0;
  return latest > seenAt;
}
