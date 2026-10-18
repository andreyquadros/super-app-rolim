import { collection, doc, query, serverTimestamp, setDoc, updateDoc, where, type DocumentData } from "firebase/firestore";
import type { Building, BuildingType, Phone } from "@/domain/types";
import { db } from "@/lib/firebase";
import { bool, num, optionalStr, str, strList, toDate } from "./convert";
import { watchQuery, type Watcher } from "./watch";

function parsePhones(value: unknown): Phone[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null)
    .map((p) => ({ type: (str(p.type) || "MOBILE") as Phone["type"], number: str(p.number) }))
    .filter((p) => p.number.length > 0);
}

export function parseBuilding(id: string, d: DocumentData): Building {
  return {
    id,
    name: str(d.name),
    type: (str(d.type) || "PUBLIC") as BuildingType,
    address: str(d.address),
    lat: num(d.lat),
    lng: num(d.lng),
    isOpen: bool(d.isOpen),
    isOnDuty: bool(d.isOnDuty),
    ownerIds: strList(d.ownerIds),
    phones: parsePhones(d.phones),
    openingHours: optionalStr(d.openingHours),
    active: bool(d.active, true),
    updatedAt: toDate(d.updatedAt),
  };
}

const byName = (a: Building, b: Building) => a.name.localeCompare(b.name, "pt-BR");

/** Todas as unidades (painel). Ordenação local: a coleção é pequena. */
export function watchBuildings(type?: BuildingType): Watcher<Building[]> {
  const ref = collection(db, "buildings");
  const watcher = watchQuery(type ? query(ref, where("type", "==", type)) : ref, parseBuilding);
  return (onData, onError) => watcher((items) => onData([...items].sort(byName)), onError);
}

/** Farmácias que um responsável pode atualizar. */
export function watchOwnedPharmacies(uid: string): Watcher<Building[]> {
  const q = query(collection(db, "buildings"), where("ownerIds", "array-contains", uid));
  const watcher = watchQuery(q, parseBuilding);
  return (onData, onError) => watcher((items) => onData(items.filter((b) => b.type === "PHARMACY").sort(byName)), onError);
}

export type BuildingInput = Omit<Building, "id" | "updatedAt">;

export async function saveBuilding(id: string | null, input: BuildingInput): Promise<string> {
  const ref = id ? doc(db, "buildings", id) : doc(collection(db, "buildings"));
  const payload = {
    ...input,
    name: input.name.trim(),
    address: input.address.trim(),
    ownerIds: input.type === "PHARMACY" ? input.ownerIds : [],
    openingHours: input.openingHours?.trim() || null,
    updatedAt: serverTimestamp(),
    ...(id ? {} : { createdAt: serverTimestamp() }),
  };
  await setDoc(ref, payload, { merge: true });
  return ref.id;
}

export async function setPharmacyState(id: string, state: { isOpen: boolean; isOnDuty: boolean }): Promise<void> {
  await updateDoc(doc(db, "buildings", id), { ...state, updatedAt: serverTimestamp() });
}
