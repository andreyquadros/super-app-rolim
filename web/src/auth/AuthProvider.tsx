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
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createProfile, watchProfile, watchStaffMember } from "@/data/people";
import type { Profile, StaffMember } from "@/domain/types";
import { auth } from "@/lib/firebase";
import { disablePush } from "@/lib/push";
import { AuthContext, type AuthValue, type SignUpInput } from "./AuthContext";

interface Session {
  user: User | null;
  profile: Profile | null;
  staff: StaffMember | null;
  ready: { auth: boolean; profile: boolean; staff: boolean };
}

const INITIAL: Session = { user: null, profile: null, staff: null, ready: { auth: false, profile: false, staff: false } };

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
    const markReady = (key: "profile" | "staff") => (s: Session) => ({ ...s, ready: { ...s.ready, [key]: true } });
    const stopProfile = watchProfile(uid)(
      (profile) => setSession((s) => ({ ...markReady("profile")(s), profile })),
      () => setSession(markReady("profile")),
    );
    const stopStaff = watchStaffMember(uid)(
      (staff) => setSession((s) => ({ ...markReady("staff")(s), staff: staff?.active ? staff : null })),
      () => setSession(markReady("staff")),
    );
    return () => {
      stopProfile();
      stopStaff();
    };
  }, [uid]);

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
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const deleteAccount = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return;
    await disablePush();
    await deleteUser(current);
  }, []);

  const value = useMemo<AuthValue>(() => {
    const { user, profile, staff, ready } = session;
    const roles = staff?.roles ?? [];
    const isRoot = roles.includes("ROOT");
    const isManager = isRoot || roles.includes("CIVIL_SERVANT");
    return {
      user,
      profile,
      staff,
      loading: !(ready.auth && ready.profile && ready.staff),
      isRoot,
      isManager,
      isPharmacist: roles.includes("PHARMACY_MANAGER"),
      buildingScope: isRoot ? null : (staff?.buildingIds ?? []),
      actor: user ? { uid: user.uid, name: profile?.fullName || staff?.fullName || user.displayName || user.email || "Usuário" } : null,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      resetPassword,
      deleteAccount,
    };
  }, [session, signIn, signUp, signInWithGoogle, signOut, resetPassword, deleteAccount]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
