import {
  collection,
  deleteDoc,
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
} from "firebase/firestore";
import type { Actor, CityNotification, NotificationStatus } from "@/domain/types";
import { db } from "@/lib/firebase";
import { optionalStr, str, toDate } from "./convert";
import { chunk, mergeWatchers, watchQuery, type Watcher } from "./watch";

const STATUSES: readonly NotificationStatus[] = ["DRAFT", "QUEUED", "SENDING", "SENT", "FAILED"];

export function parseNotification(id: string, d: DocumentData): CityNotification {
  const status = STATUSES.includes(d.status) ? (d.status as NotificationStatus) : "DRAFT";
  return {
    id,
    title: str(d.title),
    body: str(d.body),
    buildingId: str(d.buildingId),
    buildingName: str(d.buildingName),
    status,
    createdBy: str(d.createdBy),
    createdByName: str(d.createdByName),
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
    sentAt: toDate(d.sentAt),
    error: optionalStr(d.error),
  };
}

/** Comunicados públicos já enviados. */
export function watchSentNotifications(max = 50): Watcher<CityNotification[]> {
  const q = query(collection(db, "notifications"), where("status", "==", "SENT"), orderBy("sentAt", "desc"), limit(max));
  return watchQuery(q, parseNotification);
}

/** Painel: todos (ROOT) ou apenas das unidades do servidor. */
export function watchAdminNotifications(buildingScope: string[] | null): Watcher<CityNotification[]> {
  const ref = collection(db, "notifications");
  if (buildingScope === null) return watchQuery(query(ref, orderBy("createdAt", "desc"), limit(200)), parseNotification);
  const merged = mergeWatchers(
    chunk(buildingScope, 30).map((ids) =>
      watchQuery(query(ref, where("buildingId", "in", ids), orderBy("createdAt", "desc"), limit(200)), parseNotification),
    ),
  );
  return (onData, onError) =>
    merged((items) => onData([...items].sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))), onError);
}

export interface NotificationInput {
  title: string;
  body: string;
  buildingId: string;
  buildingName: string;
}

export async function saveNotificationDraft(id: string | null, input: NotificationInput, actor: Actor): Promise<void> {
  const fields = {
    title: input.title.trim(),
    body: input.body.trim(),
    buildingId: input.buildingId,
    buildingName: input.buildingName,
    updatedAt: serverTimestamp(),
  };
  if (id) {
    await updateDoc(doc(db, "notifications", id), { ...fields, status: "DRAFT" });
    return;
  }
  await setDoc(doc(collection(db, "notifications")), {
    ...fields,
    status: "DRAFT",
    createdBy: actor.uid,
    createdByName: actor.name,
    createdAt: serverTimestamp(),
  });
}

/** Coloca na fila; a Cloud Function envia o push e marca como SENT. */
export async function queueNotification(id: string): Promise<void> {
  await updateDoc(doc(db, "notifications", id), { status: "QUEUED", updatedAt: serverTimestamp() });
}

export async function deleteNotification(id: string): Promise<void> {
  await deleteDoc(doc(db, "notifications", id));
}
