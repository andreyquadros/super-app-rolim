import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import { db, messaging } from "../admin";
import { APP_URL } from "../config";
import { KIND_LABEL, STATUS_LABEL, requestLink, type RequestKind, type RequestStatus } from "../domain";
import { buildRequestMail, queueMail } from "../mail";
import { sendToUser } from "../push";

interface RequestDoc {
  protocol: string;
  title: string;
  citizenId: string;
  citizenName: string;
}

interface HistoryDoc {
  to: RequestStatus;
  officialResponse: string | null;
}

async function citizenEmail(uid: string): Promise<string | null> {
  const profile = await db().doc(`users/${uid}`).get();
  const email = profile.get("email");
  return typeof email === "string" && email.includes("@") ? email : null;
}

async function notifyCitizen(kind: RequestKind, id: string, request: RequestDoc, status: RequestStatus, response: string | null) {
  const link = requestLink(APP_URL.value(), kind, id);
  const email = await citizenEmail(request.citizenId);

  const tasks: Promise<unknown>[] = [];
  if (email) {
    const mail = buildRequestMail({
      kind,
      protocol: request.protocol,
      title: request.title,
      citizenName: request.citizenName,
      status,
      officialResponse: response,
      link,
    });
    tasks.push(queueMail(db(), email, mail));
  } else {
    logger.warn("cidadão sem e-mail cadastrado", { kind, id });
  }

  if (status !== "RECEIVED") {
    tasks.push(
      sendToUser(db(), messaging(), request.citizenId, {
        title: `${KIND_LABEL[kind]}: ${STATUS_LABEL[status]}`,
        body: `${request.protocol} — ${request.title}`,
        link,
      }),
    );
  }

  const results = await Promise.allSettled(tasks);
  results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .forEach((r) => logger.error("falha ao notificar cidadão", { kind, id, error: String(r.reason) }));
}

function onRequestCreated(kind: RequestKind) {
  return onDocumentCreated(`${kind}/{id}`, async (event) => {
    const data = event.data?.data() as RequestDoc | undefined;
    if (!data) return;
    await notifyCitizen(kind, event.params.id, data, "RECEIVED", null);
  });
}

function onStatusChanged(kind: RequestKind) {
  return onDocumentCreated(`${kind}/{id}/history/{status}`, async (event) => {
    const entry = event.data?.data() as HistoryDoc | undefined;
    if (!entry) return;
    const parent = await db().doc(`${kind}/${event.params.id}`).get();
    if (!parent.exists) return;
    await notifyCitizen(kind, event.params.id, parent.data() as RequestDoc, entry.to, entry.officialResponse);
  });
}

export const onIssueCreated = onRequestCreated("issues");
export const onOmbudsmanCreated = onRequestCreated("ombudsman");
export const onIssueStatusChanged = onStatusChanged("issues");
export const onOmbudsmanStatusChanged = onStatusChanged("ombudsman");
