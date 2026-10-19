import { deleteApp, initializeApp, type FirebaseError } from "firebase/app";
import {
  connectAuthEmulator,
  deleteUser,
  GoogleAuthProvider,
  inMemoryPersistence,
  initializeAuth,
  linkWithCredential,
  signInWithCredential,
  type User,
} from "firebase/auth";
import { connectFirestoreEmulator, doc, getDoc, initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { EMULATOR_PORTS, firebaseConfig, useEmulators } from "@/config/env";
import type { TakenGoogleAccount } from "./AuthContext";

// Quem tem conta por e-mail e senha tenta ligar um Google que já entrou no app
// sozinho (auth/credential-already-in-use). Costuma ser a mesma pessoa: entrou
// com o Google, o CPF já era da conta de e-mail e o cadastro parou ali.
// Confere essa outra conta numa instância paralela do Firebase, só na memória,
// sem tirar a pessoa da conta em que está.

const RETRY_LINK =
  "A entrada antiga pelo Google foi apagada, mas não deu para terminar agora. Toque de novo em “Usar também o Google para entrar”.";

let sequence = 0;

export async function inspectTakenGoogleAccount(owner: User, error: unknown): Promise<TakenGoogleAccount> {
  const credential = GoogleAuthProvider.credentialFromError(error as FirebaseError);
  if (!credential) throw error;

  sequence += 1;
  const app = initializeApp(firebaseConfig, `conta-google-${sequence}`);
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    deleteApp(app).catch(() => undefined);
  };
  try {
    const auth = initializeAuth(app, { persistence: inMemoryPersistence });
    const db = initializeFirestore(app, {
      localCache: memoryLocalCache(),
      ...(useEmulators ? { experimentalForceLongPolling: true } : {}),
    });
    if (useEmulators) {
      const host = window.location.hostname;
      connectAuthEmulator(auth, `http://${host}:${EMULATOR_PORTS.auth}`, { disableWarnings: true });
      connectFirestoreEmulator(db, host, EMULATOR_PORTS.firestore);
    }

    const { user: other } = await signInWithCredential(auth, credential);
    const [profile, staff] = await Promise.all([getDoc(doc(db, "users", other.uid)), getDoc(doc(db, "staff", other.uid))]);
    const email = other.email;
    // Com cadastro (CPF, pedidos) ou acesso da equipe: excluir apagaria dados
    if (profile.exists() || staff.exists()) {
      release();
      return { kind: "registered", email };
    }

    let merging = false;
    return {
      kind: "empty",
      email,
      // Depois de começar a juntar, desistir não interrompe
      dismiss: () => {
        if (!merging) release();
      },
      merge: async () => {
        merging = true;
        try {
          await deleteUser(other);
        } finally {
          release();
        }
        // O mesmo token do Google vale de novo enquanto não expira (1 h)
        await linkWithCredential(owner, credential).catch((linkError: unknown) => {
          console.error("Falha ao ligar o Google depois de apagar a conta vazia", linkError);
          throw new Error(RETRY_LINK);
        });
        return email;
      },
    };
  } catch (inspectError: unknown) {
    release();
    throw inspectError;
  }
}
