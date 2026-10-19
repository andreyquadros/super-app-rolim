import { createContext, useContext } from "react";
import type { User } from "firebase/auth";
import type { Actor, Profile, StaffMember } from "@/domain/types";

export interface SignUpInput {
  fullName: string;
  cpf: string;
  phone: string;
  email: string;
  password: string;
}

/**
 * A conta Google escolhida já abre outra conta do app
 * (auth/credential-already-in-use ao tentar ligá-la).
 */
export type TakenGoogleAccount =
  /** Entrou só com o Google e não fez cadastro: dá para juntar */
  | {
      kind: "empty";
      email: string | null;
      /** Apaga aquela conta vazia e liga o Google a esta; devolve o e-mail do Google */
      merge: () => Promise<string | null>;
      /** Desiste sem mudar nada (sem efeito depois de `merge` começar) */
      dismiss: () => void;
    }
  /** Tem cadastro (CPF) ou é da equipe: não apagamos daqui */
  | { kind: "registered"; email: string | null };

/** Resultado de "Usar também o Google para entrar". */
export type GoogleLinkResult = { status: "linked"; email: string | null } | { status: "taken"; account: TakenGoogleAccount };

export interface AuthValue {
  user: User | null;
  profile: Profile | null;
  staff: StaffMember | null;
  /** true até sabermos quem está logado e termos lido perfil/equipe */
  loading: boolean;
  /**
   * O cadastro não pôde ser lido (servidor sem resposta e nada salvo no
   * aparelho). Com `profile` null, não significa "sem cadastro".
   */
  profileError: boolean;
  /** Assina o cadastro de novo depois de `profileError` */
  retryProfile: () => void;
  isRoot: boolean;
  isManager: boolean;
  /** Responsável por plantão (farmácias/funerárias) */
  isDutyManager: boolean;
  /** null = todas as unidades (ROOT); lista = unidades do servidor */
  buildingScope: string[] | null;
  actor: Actor | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  /** Liga uma conta Google à conta de e-mail e senha atual */
  linkGoogle: () => Promise<GoogleLinkResult>;
  /** Sai, apaga os dados locais e abre `to` (caminho do app; padrão: Início) */
  signOut: (to?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  /** Recarrega a conta; true se o e-mail já foi confirmado */
  refreshVerification: () => Promise<boolean>;
  deleteAccount: () => Promise<void>;
}

export const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return value;
}
