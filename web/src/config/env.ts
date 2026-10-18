// Configuração pública do Firebase (não são segredos: a segurança vem das
// regras do Firestore/Storage). Preencha web/.env.production — veja .env.example.

const env = import.meta.env;

export const useEmulators = env.VITE_USE_EMULATORS === "true";

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? "",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: env.VITE_FIREBASE_APP_ID ?? "",
};

/** Chave VAPID (Cloud Messaging → Certificados push da Web). */
export const vapidKey: string = env.VITE_FIREBASE_VAPID_KEY ?? "";

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export const isPushConfigured = isFirebaseConfigured && !useEmulators && vapidKey.length > 0;

export const EMULATOR_PORTS = { auth: 9399, firestore: 8180, storage: 9499 } as const;
