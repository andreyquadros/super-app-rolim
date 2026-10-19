import {
  browserPopupRedirectResolver,
  createUserWithEmailAndPassword,
  deleteUser,
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile as updateAuthProfile,
  type User,
} from "firebase/auth";
import { clearIndexedDbPersistence, terminate } from "firebase/firestore";
import { useEmulators } from "@/config/env";
import { createProfile, updateProfile, watchProfile, watchStaffMember } from "@/data/people";
import type { Profile } from "@/domain/types";
import { errorCode } from "@/lib/errors";
import { auth, db } from "@/lib/firebase";
import { disablePush } from "@/lib/push";
import type { GoogleLinkResult, SignUpInput } from "./AuthContext";

// Tudo do Firebase que o AuthProvider usa. Ele importa este módulo depois da
// primeira pintura: a Início aparece sem esperar o SDK (~110 KB).

export { updateProfile, watchProfile, watchStaffMember };

export function observeUser(onUser: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, onUser);
}

/**
 * Ao sair, apaga o cache local do Firestore (CPFs, telefones e solicitações)
 * para não deixar dados pessoais em computadores e celulares compartilhados.
 * Recarrega a página porque a instância do banco é encerrada.
 */
async function wipeLocalDataAndReload(to = "/"): Promise<void> {
  if (!useEmulators) {
    await terminate(db).catch(() => undefined);
    await clearIndexedDbPersistence(db).catch(() => undefined);
  }
  window.location.replace(to);
}

export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signUp(input: SignUpInput): Promise<void> {
  const credential = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
  await updateAuthProfile(credential.user, { displayName: input.fullName.trim() });
  sendEmailVerification(credential.user).catch(() => undefined);
  await createProfile(credential.user.uid, {
    fullName: input.fullName,
    cpf: input.cpf,
    phone: input.phone,
    email: credential.user.email ?? input.email.trim().toLowerCase(),
  });
}

function googleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

/** E-mail da conta Google ligada (pode diferir do e-mail da conta). */
function googleEmail(user: User): string | null {
  return user.providerData.find((info) => info.providerId === GoogleAuthProvider.PROVIDER_ID)?.email ?? null;
}

export async function signInWithGoogle(): Promise<void> {
  // O resolvedor vem aqui, não no initializeAuth (ver lib/firebase.ts)
  await signInWithPopup(auth, googleProvider(), browserPopupRedirectResolver);
}

/**
 * Quem tem conta por e-mail e senha passa a entrar também com o Google.
 * Se esse Google já abre outra conta do app, confere qual é o caso (pedaço
 * à parte: só quem cai nele baixa).
 */
export async function linkGoogle(): Promise<GoogleLinkResult> {
  const current = auth.currentUser;
  if (!current) throw new Error("Entre na sua conta para continuar.");
  try {
    const { user } = await linkWithPopup(current, googleProvider(), browserPopupRedirectResolver);
    return { status: "linked", email: googleEmail(user) };
  } catch (error: unknown) {
    if (errorCode(error) !== "auth/credential-already-in-use") throw error;
    const { inspectTakenGoogleAccount } = await import("./takenGoogleAccount");
    return { status: "taken", account: await inspectTakenGoogleAccount(current, error) };
  }
}

export async function signOut(to?: string): Promise<void> {
  await disablePush();
  await firebaseSignOut(auth);
  await wipeLocalDataAndReload(to);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function resendVerification(): Promise<void> {
  if (auth.currentUser) await sendEmailVerification(auth.currentUser);
}

/** Depois de clicar no link do e-mail: atualiza o token e o cadastro. */
export async function refreshVerification(profile: Profile | null): Promise<boolean> {
  const current = auth.currentUser;
  if (!current) return false;
  await current.reload();
  await current.getIdToken(true);
  if (current.emailVerified && profile && !profile.emailVerified) {
    await updateProfile(current.uid, { fullName: profile.fullName, phone: profile.phone, email: profile.email });
  }
  return current.emailVerified;
}

export async function deleteAccount(): Promise<void> {
  const current = auth.currentUser;
  if (!current) return;
  await disablePush();
  await deleteUser(current);
  await wipeLocalDataAndReload();
}
