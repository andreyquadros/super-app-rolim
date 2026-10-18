import { collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, updateDoc, where, writeBatch, type DocumentData } from "firebase/firestore";
import { onlyDigits } from "@/domain/documents";
import type { Actor, Profile, Role, StaffMember } from "@/domain/types";
import { auth, db } from "@/lib/firebase";
import { bool, str, strList, toDate } from "./convert";
import { watchDoc, watchQuery, type Watcher } from "./watch";

// ---------- Cadastro do cidadão (antes: atributos do Keycloak) ----------

export function parseProfile(_id: string, d: DocumentData): Profile {
  return {
    fullName: str(d.fullName),
    cpf: str(d.cpf),
    phone: str(d.phone),
    email: str(d.email),
    emailVerified: bool(d.emailVerified),
    createdAt: toDate(d.createdAt),
  };
}

/** O valor precisa coincidir com o token (validado em firestore.rules). */
function tokenEmailVerified(): boolean {
  return auth.currentUser?.emailVerified ?? false;
}

export function watchProfile(uid: string): Watcher<Profile | null> {
  return watchDoc(doc(db, "users", uid), parseProfile);
}

export interface ProfileInput {
  fullName: string;
  cpf: string;
  phone: string;
  email: string;
}

/** Cria o cadastro e reserva o CPF no mesmo lote (garante 1 CPF = 1 conta). */
export async function createProfile(uid: string, input: ProfileInput): Promise<void> {
  const cpf = onlyDigits(input.cpf);
  const batch = writeBatch(db);
  batch.set(doc(db, "users", uid), {
    fullName: input.fullName.trim(),
    cpf,
    phone: onlyDigits(input.phone),
    email: input.email,
    emailVerified: tokenEmailVerified(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, "cpfs", cpf), { uid });
  await batch.commit();
}

export async function updateProfile(uid: string, input: { fullName: string; phone: string; email: string }): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    fullName: input.fullName.trim(),
    phone: onlyDigits(input.phone),
    email: input.email,
    emailVerified: tokenEmailVerified(),
    updatedAt: serverTimestamp(),
  });
}

export interface FoundCitizen extends Profile {
  uid: string;
}

/** Busca um cidadão cadastrado por CPF ou e-mail (somente equipe). */
export async function findCitizen(term: string): Promise<FoundCitizen | null> {
  const trimmed = term.trim();
  if (trimmed.includes("@")) {
    const snap = await getDocs(query(collection(db, "users"), where("email", "==", trimmed.toLowerCase()), limit(1)));
    const first = snap.docs[0];
    return first ? { uid: first.id, ...parseProfile(first.id, first.data()) } : null;
  }
  const cpf = onlyDigits(trimmed);
  const index = await getDoc(doc(db, "cpfs", cpf));
  const uid = index.get("uid");
  if (typeof uid !== "string") return null;
  const profile = await getDoc(doc(db, "users", uid));
  return profile.exists() ? { uid, ...parseProfile(uid, profile.data()) } : null;
}

// ---------- Equipe (antes: tabela users com roles/policies) ----------

export function parseStaff(id: string, d: DocumentData): StaffMember {
  return {
    id,
    roles: strList(d.roles) as Role[],
    buildingIds: strList(d.buildingIds),
    fullName: str(d.fullName),
    email: str(d.email),
    cpf: str(d.cpf),
    active: bool(d.active),
    updatedAt: toDate(d.updatedAt),
  };
}

export function watchStaffMember(uid: string): Watcher<StaffMember | null> {
  return watchDoc(doc(db, "staff", uid), parseStaff);
}

export function watchStaff(): Watcher<StaffMember[]> {
  return watchQuery(collection(db, "staff"), parseStaff);
}

export interface StaffInput {
  roles: Role[];
  buildingIds: string[];
  fullName: string;
  email: string;
  cpf: string;
  active: boolean;
}

export async function saveStaff(uid: string, input: StaffInput, actor: Actor, isNew: boolean): Promise<void> {
  await setDoc(doc(db, "staff", uid), {
    ...input,
    ...(isNew ? { createdAt: serverTimestamp() } : {}),
    updatedAt: serverTimestamp(),
    updatedBy: actor.uid,
  }, { merge: true });
}
