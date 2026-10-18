import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { EMULATOR_PORTS, firebaseConfig, useEmulators } from "@/config/env";

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
auth.languageCode = "pt-BR";

// Cache persistente: o app abre e mostra os protocolos mesmo sem internet,
// e solicitações sem foto ficam na fila até a conexão voltar.
export const db = initializeFirestore(app, {
  localCache: useEmulators
    ? memoryLocalCache()
    : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

if (useEmulators) {
  const host = window.location.hostname;
  connectAuthEmulator(auth, `http://${host}:${EMULATOR_PORTS.auth}`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, EMULATOR_PORTS.firestore);
}

let storagePromise: Promise<import("firebase/storage").FirebaseStorage> | null = null;

/** Storage só é carregado quando há foto para enviar ou exibir. */
export function getStorageLazy() {
  storagePromise ??= import("firebase/storage").then(({ connectStorageEmulator, getStorage }) => {
    const storage = getStorage(app);
    if (useEmulators) connectStorageEmulator(storage, window.location.hostname, EMULATOR_PORTS.storage);
    return storage;
  });
  return storagePromise;
}
