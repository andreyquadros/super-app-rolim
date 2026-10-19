import type { User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { BootError } from "@/components/LoadingScreen";
import { lazyWatcher } from "@/data/lazy";
import type { Profile, StaffMember } from "@/domain/types";
import { AuthContext, type AuthValue, type SignUpInput } from "./AuthContext";

/**
 * O Firebase do login vem em pedaço à parte (authRuntime.ts), pedido depois da
 * primeira pintura: a Início aparece sem esperar o SDK. Até ele responder,
 * `loading` fica true, como antes enquanto o Auth lia a sessão salva.
 */
const loadRuntime = () => import("./authRuntime");

const signIn = (email: string, password: string) => loadRuntime().then((runtime) => runtime.signIn(email, password));
const signUp = (input: SignUpInput) => loadRuntime().then((runtime) => runtime.signUp(input));
const signInWithGoogle = () => loadRuntime().then((runtime) => runtime.signInWithGoogle());
const linkGoogle = () => loadRuntime().then((runtime) => runtime.linkGoogle());
const signOut = (to?: string) => loadRuntime().then((runtime) => runtime.signOut(to));
const resetPassword = (email: string) => loadRuntime().then((runtime) => runtime.resetPassword(email));
const resendVerification = () => loadRuntime().then((runtime) => runtime.resendVerification());
const deleteAccount = () => loadRuntime().then((runtime) => runtime.deleteAccount());

interface Session {
  user: User | null;
  profile: Profile | null;
  staff: StaffMember | null;
  /** Cadastro ilegível (sem servidor e nada salvo): não é o mesmo que "sem cadastro" */
  profileError: boolean;
  ready: { auth: boolean; profile: boolean; staff: boolean };
}

const INITIAL: Session = {
  user: null,
  profile: null,
  staff: null,
  profileError: false,
  ready: { auth: false, profile: false, staff: false },
};

/** Ignora eventos atrasados de uma sessão anterior (troca de usuário). */
function forUser(uid: string, update: (s: Session) => Session) {
  return (s: Session): Session => (s.user?.uid === uid ? update(s) : s);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(INITIAL);
  const [profileAttempt, setProfileAttempt] = useState(0);
  const [runtimeFailed, setRuntimeFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | undefined;
    const start = () =>
      loadRuntime().then(
        (runtime) => {
          if (cancelled) return;
          stop = runtime.observeUser((user) => {
            setSession({
              user,
              profile: null,
              staff: null,
              profileError: false,
              ready: { auth: true, profile: user === null, staff: user === null },
            });
          });
        },
        (error: unknown) => {
          if (cancelled) return;
          // A conexão caiu logo depois da primeira tela: ela continua (com o
          // aviso "Sem internet") e o login carrega quando a conexão voltar
          if (!navigator.onLine) {
            window.addEventListener("online", start, { once: true });
            return;
          }
          // Sem o login nada funciona: a mesma abertura com "Tentar de novo" de
          // quando o app não abre (detalhe técnico só no console)
          console.error("Falha ao carregar o login", error);
          setRuntimeFailed(true);
        },
      );
    start();
    return () => {
      cancelled = true;
      window.removeEventListener("online", start);
      stop?.();
    };
  }, []);

  const uid = session.user?.uid ?? null;

  useEffect(() => {
    if (!uid) return undefined;
    // `null` aqui é confirmado pelo servidor; sem resposta, chega o erro
    return lazyWatcher(() => loadRuntime().then((runtime) => runtime.watchProfile(uid)))(
      (profile) => setSession(forUser(uid, (s) => ({ ...s, profile, profileError: false, ready: { ...s.ready, profile: true } }))),
      () => setSession(forUser(uid, (s) => ({ ...s, profileError: true, ready: { ...s.ready, profile: true } }))),
    );
  }, [uid, profileAttempt]);

  useEffect(() => {
    if (!uid) return undefined;
    return lazyWatcher(() => loadRuntime().then((runtime) => runtime.watchStaffMember(uid)))(
      (staff) => setSession(forUser(uid, (s) => ({ ...s, staff: staff?.active ? staff : null, ready: { ...s.ready, staff: true } }))),
      () => setSession(forUser(uid, (s) => ({ ...s, ready: { ...s.ready, staff: true } }))),
    );
  }, [uid]);

  /** "Tentar de novo": volta ao carregando e assina o cadastro outra vez. */
  const retryProfile = useCallback(() => {
    setSession((s) => ({ ...s, profileError: false, ready: { ...s.ready, profile: s.user === null } }));
    setProfileAttempt((n) => n + 1);
  }, []);

  // Mantém o cadastro alinhado quando a pessoa confirma o e-mail
  const { user, profile } = session;
  useEffect(() => {
    if (!user || !profile || profile.emailVerified === user.emailVerified) return;
    user
      .getIdToken(true)
      .then(loadRuntime)
      .then((runtime) => runtime.updateProfile(user.uid, { fullName: profile.fullName, phone: profile.phone, email: profile.email }))
      .catch(() => undefined);
  }, [user, profile]);

  /** Depois de clicar no link do e-mail: atualiza o token e o cadastro. */
  const refreshVerification = useCallback(() => loadRuntime().then((runtime) => runtime.refreshVerification(profile)), [profile]);

  const value = useMemo<AuthValue>(() => {
    const { staff, ready, profileError } = session;
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
      profileError,
      retryProfile,
      isRoot,
      isManager,
      isDutyManager: roles.includes("DUTY_MANAGER"),
      buildingScope: isRoot ? null : (staff?.buildingIds ?? []),
      actor: user ? { uid: user.uid, name } : null,
      signIn,
      signUp,
      signInWithGoogle,
      linkGoogle,
      signOut,
      resetPassword,
      resendVerification,
      refreshVerification,
      deleteAccount,
    };
  }, [session, user, profile, retryProfile, refreshVerification]);

  if (runtimeFailed) return <BootError />;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
