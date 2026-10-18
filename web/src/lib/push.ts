import { FirebaseError } from "firebase/app";
import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { isPushConfigured, vapidKey } from "@/config/env";
import { app, db } from "./firebase";
import { storageGet, storageRemove, storageSet } from "./safeStorage";

const TOKEN_KEY = "rolim.pushToken";

export type PushState = "enabled" | "disabled" | "denied" | "unsupported" | "unconfigured";

async function messagingIfSupported() {
  const { getMessaging, isSupported } = await import("firebase/messaging");
  return (await isSupported()) ? getMessaging(app) : null;
}

export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
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
  const registration = await navigator.serviceWorker.ready;
  const register = async () => {
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    await setDoc(doc(db, "devices", token), {
      uid,
      token,
      userAgent: navigator.userAgent.slice(0, 300),
      updatedAt: serverTimestamp(),
    });
    return token;
  };

  let token: string;
  try {
    token = await register();
  } catch (error: unknown) {
    // Aparelho ainda registrado em nome de outra conta: gera um token novo
    if (!(error instanceof FirebaseError && error.code === "permission-denied")) throw error;
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
  await deleteDoc(doc(db, "devices", token)).catch(() => undefined);
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
