import { getAuth } from "firebase-admin/auth";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import { db, messaging } from "../admin";
import { appUrl } from "../config";
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

/**
 * E-mail só para contas com endereço confirmado: impede que alguém use o
 * e-mail de outra pessoa no cadastro para fazer a prefeitura enviar mensagens.
 */
async function verifiedEmail(uid: string): Promise<string | null> {
  try {
    const user = await getAuth().getUser(uid);
    return user.emailVerified && user.email ? user.email : null;
  } catch {
    return null; // conta excluída
  }
}

async function notifyCitizen(eventId: string, kind: RequestKind, id: string, request: RequestDoc, status: RequestStatus, response: string | null) {
  const link = requestLink(appUrl(), kind, id);
  const email = await verifiedEmail(request.citizenId);

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
    tasks.push(queueMail(db(), eventId, email, mail));
  } else {
    logger.info("e-mail não enviado: endereço não confirmado", { kind, id });
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
    await notifyCitizen(event.id, kind, event.params.id, data, "RECEIVED", null);
  });
}

function onStatusChanged(kind: RequestKind) {
  return onDocumentCreated(`${kind}/{id}/history/{status}`, async (event) => {
    const entry = event.data?.data() as HistoryDoc | undefined;
    if (!entry) return;
    const parent = await db().doc(`${kind}/${event.params.id}`).get();
    if (!parent.exists) return;
    await notifyCitizen(event.id, kind, event.params.id, parent.data() as RequestDoc, entry.to, entry.officialResponse);
  });
}

export const onIssueCreated = onRequestCreated("issues");
export const onOmbudsmanCreated = onRequestCreated("ombudsman");
export const onIssueStatusChanged = onStatusChanged("issues");
export const onOmbudsmanStatusChanged = onStatusChanged("ombudsman");
