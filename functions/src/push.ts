import type { Firestore } from "firebase-admin/firestore";
import type { Messaging } from "firebase-admin/messaging";
import { logger } from "firebase-functions";
import { BROADCAST_TOPIC, isEmulator } from "./config";

export interface PushPayload {
  title: string;
  body: string;
  link: string;
}

const ICON = "/pwa-192x192.png";
// Só estes códigos indicam token morto. "invalid-argument" pode ser erro da
// própria mensagem (ex.: link sem HTTPS) e não deve apagar aparelhos válidos.
const INVALID_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

function webpush(payload: PushPayload) {
  return {
    notification: { title: payload.title, body: payload.body, icon: ICON, badge: ICON },
    fcmOptions: { link: payload.link },
  };
}

/** Envia push para todos os dispositivos de um cidadão e limpa tokens inválidos. */
export async function sendToUser(db: Firestore, messaging: Messaging, uid: string, payload: PushPayload): Promise<number> {
  const devices = await db.collection("devices").where("uid", "==", uid).get();
  if (devices.empty) return 0;

  const tokens = devices.docs.map((d) => d.id);
  if (isEmulator()) {
    logger.info("[emulador] push não enviado", { uid, tokens: tokens.length, title: payload.title });
    return 0;
  }

  const result = await messaging.sendEachForMulticast({ tokens, webpush: webpush(payload) });
  const stale = result.responses
    .map((r, i) => (!r.success && r.error && INVALID_TOKEN_CODES.has(r.error.code) ? tokens[i] : null))
    .filter((t): t is string => t !== null);

  await Promise.all(stale.map((token) => db.collection("devices").doc(token).delete()));
  if (stale.length > 0) logger.info("tokens inválidos removidos", { count: stale.length });

  return result.successCount;
}

/** Comunicado para todos os dispositivos inscritos no tópico geral. */
export async function sendBroadcast(messaging: Messaging, payload: PushPayload): Promise<void> {
  if (isEmulator()) {
    logger.info("[emulador] comunicado não enviado", { title: payload.title });
    return;
  }
  await messaging.send({ topic: BROADCAST_TOPIC, webpush: webpush(payload) });
}

export async function setTopicSubscription(messaging: Messaging, token: string, subscribed: boolean): Promise<void> {
  if (isEmulator()) return;
  const response = subscribed
    ? await messaging.subscribeToTopic([token], BROADCAST_TOPIC)
    : await messaging.unsubscribeFromTopic([token], BROADCAST_TOPIC);
  if (response.failureCount > 0) {
    logger.warn("falha ao atualizar inscrição no tópico", { errors: response.errors.map((e) => e.error.code) });
  }
}
