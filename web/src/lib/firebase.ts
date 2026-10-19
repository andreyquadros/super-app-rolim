import { _getInstance } from "@firebase/auth/internal";
import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { EMULATOR_PORTS, firebaseConfig, useEmulators } from "@/config/env";

export const app = initializeApp(firebaseConfig);

// Mesmas persistências do getAuth(), mas sem o resolvedor de popup: com ele,
// no celular o Auth abre o iframe do Google (api.js, iframe.js de ~95 KB e
// getProjectConfig) antes de dizer quem está logado, e a Início espera.
// O login com Google recebe o resolvedor na hora (AuthProvider).
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
});
auth.languageCode = "pt-BR";

interface PopupResolverInternal {
  _initialize(auth: Auth): Promise<unknown>;
}

/**
 * Prepara o login com Google (o iframe do authDomain) quando o botão aparece.
 * O popup só abre depois desse iframe; se ele ainda estiver carregando no
 * toque, o Safari (e redes lentas) bloqueiam a janela por falta de gesto.
 * É o que o getAuth() fazia na abertura do app, agora só nas telas de login.
 */
export function prepareGoogleSignIn(): void {
  try {
    // Mesma instância que o signInWithPopup usa (API interna do SDK fixado)
    _getInstance<PopupResolverInternal>(browserPopupRedirectResolver)
      ._initialize(auth)
      .catch(() => undefined);
  } catch {
    // Sem preparo o login ainda funciona: o iframe carrega no toque
  }
}

// Cache persistente: o app abre e mostra os protocolos mesmo sem internet,
// e solicitações sem foto ficam na fila até a conexão voltar.
export const db = initializeFirestore(app, {
  // Emulador: o Safari (WebKit) perde respostas do canal de streaming local de
  // vez em quando; long polling é estável. Em produção vale a detecção automática.
  ...(useEmulators ? { experimentalForceLongPolling: true } : {}),
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
