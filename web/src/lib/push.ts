import { isPushConfigured, vapidKey } from "@/config/env";
import { isFirebaseError } from "./errors";
import { storageGet, storageRemove, storageSet } from "./safeStorage";

export { isIos, isStandalone } from "./platform";

// O estado (currentPushState) vale na primeira tela; o Firebase só é
// carregado quando há o que registrar ou apagar. Cada import() é
// desestruturado direto: assim o Rollup ainda descarta o que não é usado.

const TOKEN_KEY = "rolim.pushToken";

export type PushState = "enabled" | "disabled" | "denied" | "unsupported" | "unconfigured";

async function messagingIfSupported() {
  const { getMessaging, isSupported } = await import("firebase/messaging");
  const { app } = await import("./firebase");
  return (await isSupported()) ? getMessaging(app) : null;
}

async function devicesDb() {
  const { deleteDoc, doc, serverTimestamp, setDoc } = await import("firebase/firestore");
  const { db } = await import("./firebase");
  return {
    save: (token: string, data: Record<string, unknown>) => setDoc(doc(db, "devices", token), { ...data, updatedAt: serverTimestamp() }),
    remove: (token: string) => deleteDoc(doc(db, "devices", token)),
  };
}

export function currentPushState(): PushState {
  if (!isPushConfigured) return "unconfigured";
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return Notification.permission === "granted" && storageGet(TOKEN_KEY) ? "enabled" : "disabled";
}

/** Pede permissão, obtém o token FCM e registra o dispositivo do usuário. */
export async function enablePush(uid: string): Promise<PushState> {
  if (!isPushConfigured) return "unconfigured";
  const messaging = await messagingIfSupported();
  if (!messaging) return "unsupported";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "disabled";

  const { deleteToken, getToken } = await import("firebase/messaging");
  const devices = await devicesDb();
  const registration = await navigator.serviceWorker.ready;
  const register = async () => {
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    await devices.save(token, { uid, token, userAgent: navigator.userAgent.slice(0, 300) });
    return token;
  };

  let token: string;
  try {
    token = await register();
  } catch (error: unknown) {
    // Aparelho ainda registrado em nome de outra conta: gera um token novo
    if (!(isFirebaseError(error) && error.code === "permission-denied")) throw error;
    await deleteToken(messaging);
    token = await register();
  }
  storageSet(TOKEN_KEY, token);
  return "enabled";
}

export async function disablePush(): Promise<void> {
  const token = storageGet(TOKEN_KEY);
  storageRemove(TOKEN_KEY);
  if (!token) return;
  await devicesDb()
    .then((devices) => devices.remove(token))
    .catch(() => undefined);
  const messaging = await messagingIfSupported();
  if (messaging) {
    const { deleteToken } = await import("firebase/messaging");
    await deleteToken(messaging).catch(() => undefined);
  }
}

/** Mostra pushes recebidos com o app aberto. Retorna função de cancelamento. */
export async function listenForegroundPush(onPush: (title: string, body: string) => void): Promise<() => void> {
  if (!isPushConfigured) return () => undefined;
  const messaging = await messagingIfSupported();
  if (!messaging) return () => undefined;
  const { onMessage } = await import("firebase/messaging");
  return onMessage(messaging, (payload) => {
    onPush(payload.notification?.title ?? "Prefeitura", payload.notification?.body ?? "");
  });
}
