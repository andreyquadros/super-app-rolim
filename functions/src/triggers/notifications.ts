import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { db, messaging } from "../admin";
import { appUrl } from "../config";
import { sendBroadcast } from "../push";

/**
 * Envia o comunicado quando a equipe muda o status para QUEUED.
 * O status intermediário SENDING evita envio duplicado caso o gatilho
 * seja executado mais de uma vez (entrega "pelo menos uma vez").
 */
export const onNotificationQueued = onDocumentUpdated("notifications/{id}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after || after.status !== "QUEUED" || before.status === "QUEUED") return;

  const ref = db().doc(`notifications/${event.params.id}`);
  const claimed = await db().runTransaction(async (tx) => {
    const current = await tx.get(ref);
    if (current.get("status") !== "QUEUED") return false;
    tx.update(ref, { status: "SENDING", updatedAt: FieldValue.serverTimestamp() });
    return true;
  });
  if (!claimed) return;

  try {
    await sendBroadcast(messaging(), {
      title: String(after.title),
      body: String(after.body),
      link: `${appUrl()}/comunicados`,
    });
    await ref.update({
      status: "SENT",
      sentAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      error: FieldValue.delete(),
    });
    logger.info("comunicado enviado", { id: event.params.id });
  } catch (error) {
    logger.error("falha ao enviar comunicado", { id: event.params.id, error: String(error) });
    await ref.update({
      status: "FAILED",
      error: error instanceof Error ? error.message.slice(0, 500) : "Falha desconhecida",
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
});

const STUCK_AFTER_MINUTES = 15;

/**
 * Se a função cair no meio do envio, o comunicado ficaria "Enviando" para
 * sempre. A cada 30 minutos, marcamos como "Falhou" para a equipe conferir
 * se o aviso chegou e, se preciso, reenviar.
 */
export const sweepStuckNotifications = onSchedule("every 30 minutes", async () => {
  const limit = Timestamp.fromMillis(Date.now() - STUCK_AFTER_MINUTES * 60 * 1000);
  const stuck = await db().collection("notifications").where("status", "==", "SENDING").where("updatedAt", "<", limit).get();
  await Promise.all(
    stuck.docs.map((d) =>
      d.ref.update({
        status: "FAILED",
        error: "Envio interrompido. Confira se o aviso chegou antes de reenviar.",
        updatedAt: FieldValue.serverTimestamp(),
      }),
    ),
  );
  if (!stuck.empty) logger.warn("comunicados travados marcados como falha", { count: stuck.size });
});
