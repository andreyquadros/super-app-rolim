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

export interface AuthValue {
  user: User | null;
  profile: Profile | null;
  staff: StaffMember | null;
  /** true até sabermos quem está logado e termos lido perfil/equipe */
  loading: boolean;
  isRoot: boolean;
  isManager: boolean;
  isPharmacist: boolean;
  /** null = todas as unidades (ROOT); lista = unidades do servidor */
  buildingScope: string[] | null;
  actor: Actor | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

export const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return value;
}
