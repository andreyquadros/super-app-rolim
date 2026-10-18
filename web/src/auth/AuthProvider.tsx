import {
  createUserWithEmailAndPassword,
  deleteUser,
  GoogleAuthProvider,
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
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useEmulators } from "@/config/env";
import { createProfile, updateProfile, watchProfile, watchStaffMember } from "@/data/people";
import type { Profile, StaffMember } from "@/domain/types";
import { auth, db } from "@/lib/firebase";
import { disablePush } from "@/lib/push";
import { AuthContext, type AuthValue, type SignUpInput } from "./AuthContext";

interface Session {
  user: User | null;
  profile: Profile | null;
  staff: StaffMember | null;
  ready: { auth: boolean; profile: boolean; staff: boolean };
}

const INITIAL: Session = { user: null, profile: null, staff: null, ready: { auth: false, profile: false, staff: false } };

/**
 * Ao sair, apaga o cache local do Firestore (CPFs, telefones e solicitações)
 * para não deixar dados pessoais em computadores e celulares compartilhados.
 * Recarrega a página porque a instância do banco é encerrada.
 */
async function wipeLocalDataAndReload(): Promise<void> {
  if (!useEmulators) {
    await terminate(db).catch(() => undefined);
    await clearIndexedDbPersistence(db).catch(() => undefined);
  }
  window.location.replace("/");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(INITIAL);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setSession({
        user,
        profile: null,
        staff: null,
        ready: { auth: true, profile: user === null, staff: user === null },
      });
    });
  }, []);

  const uid = session.user?.uid ?? null;

  useEffect(() => {
    if (!uid) return undefined;
    // Ignora eventos atrasados de uma sessão anterior (troca de usuário)
    const forThisUser = (update: (s: Session) => Session) => (s: Session) => (s.user?.uid === uid ? update(s) : s);
    const ready = (key: "profile" | "staff") => (s: Session) => ({ ...s, ready: { ...s.ready, [key]: true } });
    const stopProfile = watchProfile(uid)(
      (profile) => setSession(forThisUser((s) => ({ ...ready("profile")(s), profile }))),
      () => setSession(forThisUser(ready("profile"))),
    );
    const stopStaff = watchStaffMember(uid)(
      (staff) => setSession(forThisUser((s) => ({ ...ready("staff")(s), staff: staff?.active ? staff : null }))),
      () => setSession(forThisUser(ready("staff"))),
    );
    return () => {
      stopProfile();
      stopStaff();
    };
  }, [uid]);

  // Mantém o cadastro alinhado quando a pessoa confirma o e-mail
  const { user, profile } = session;
  useEffect(() => {
    if (!user || !profile || profile.emailVerified === user.emailVerified) return;
    user
      .getIdToken(true)
      .then(() => updateProfile(user.uid, { fullName: profile.fullName, phone: profile.phone, email: profile.email }))
      .catch(() => undefined);
  }, [user, profile]);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const credential = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
    await updateAuthProfile(credential.user, { displayName: input.fullName.trim() });
    sendEmailVerification(credential.user).catch(() => undefined);
    await createProfile(credential.user.uid, {
      fullName: input.fullName,
      cpf: input.cpf,
      phone: input.phone,
      email: credential.user.email ?? input.email.trim().toLowerCase(),
    });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(auth, provider);
  }, []);

  const signOut = useCallback(async () => {
    await disablePush();
    await firebaseSignOut(auth);
    await wipeLocalDataAndReload();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const resendVerification = useCallback(async () => {
    if (auth.currentUser) await sendEmailVerification(auth.currentUser);
  }, []);

  /** Depois de clicar no link do e-mail: atualiza o token e o cadastro. */
  const refreshVerification = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return false;
    await current.reload();
    await current.getIdToken(true);
    if (current.emailVerified && profile && !profile.emailVerified) {
      await updateProfile(current.uid, { fullName: profile.fullName, phone: profile.phone, email: profile.email });
    }
    return current.emailVerified;
  }, [profile]);

  const deleteAccount = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return;
    await disablePush();
    await deleteUser(current);
    await wipeLocalDataAndReload();
  }, []);

  const value = useMemo<AuthValue>(() => {
    const { staff, ready } = session;
    const roles = staff?.roles ?? [];
    const isRoot = roles.includes("ROOT");
    const isManager = isRoot || roles.includes("CIVIL_SERVANT");
    // Ações da equipe usam o nome oficial do cadastro de equipe (conferido nas regras)
    const name = staff?.fullName || profile?.fullName || user?.displayName || user?.email || "Usuário";
    return {
      user,
      profile,
      staff,
      loading: !(ready.auth && ready.profile && ready.staff),
      isRoot,
      isManager,
      isPharmacist: roles.includes("PHARMACY_MANAGER"),
      buildingScope: isRoot ? null : (staff?.buildingIds ?? []),
      actor: user ? { uid: user.uid, name } : null,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      resetPassword,
      resendVerification,
      refreshVerification,
      deleteAccount,
    };
  }, [session, user, profile, signIn, signUp, signInWithGoogle, signOut, resetPassword, resendVerification, refreshVerification, deleteAccount]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
