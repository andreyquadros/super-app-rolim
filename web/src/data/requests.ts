import {
  collection,
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { categoryOf, type IssueCategory, type OmbudsmanType } from "@/domain/catalog";
import { makeProtocol } from "@/domain/protocol";
import { isRequestStatus, type RequestStatus } from "@/domain/status";
import type { Actor, Address, CitizenRequest, HistoryEntry, Issue, Note, Ombudsman, RequestKind } from "@/domain/types";
import { db } from "@/lib/firebase";
import { num, optionalStr, str, toDate } from "./convert";
import { chunk, mergeWatchers, watchDoc, watchQuery, type Watcher } from "./watch";

/** Limite de itens carregados no painel (os mais recentes). */
export const ADMIN_LIST_LIMIT = 500;

function parseStatus(value: unknown): RequestStatus {
  return isRequestStatus(value) ? value : "RECEIVED";
}

function parseAddress(value: unknown): Address {
  const a = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  return {
    streetType: str(a.streetType, "Rua"),
    streetName: str(a.streetName),
    number: optionalStr(a.number),
    neighborhood: str(a.neighborhood),
    complement: optionalStr(a.complement),
  };
}

function parseBase(id: string, d: DocumentData) {
  return {
    id,
    protocol: str(d.protocol),
    title: str(d.title),
    description: str(d.description),
    status: parseStatus(d.status),
    citizenId: str(d.citizenId),
    citizenName: str(d.citizenName),
    lastResponse: optionalStr(d.lastResponse),
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
    statusChangedAt: toDate(d.statusChangedAt),
  };
}

export function parseIssue(id: string, d: DocumentData): Issue {
  return {
    ...parseBase(id, d),
    kind: "issues",
    category: categoryOf(str(d.category)).value,
    department: str(d.department),
    lat: num(d.lat),
    lng: num(d.lng),
    address: parseAddress(d.address),
    photoPath: optionalStr(d.photoPath),
  };
}

export function parseOmbudsman(id: string, d: DocumentData): Ombudsman {
  return {
    ...parseBase(id, d),
    kind: "ombudsman",
    type: (str(d.type) || "others") as OmbudsmanType,
    buildingId: str(d.buildingId),
    buildingName: str(d.buildingName),
    occurrenceDate: str(d.occurrenceDate),
    occurrenceTime: optionalStr(d.occurrenceTime),
  };
}

const parsers = { issues: parseIssue, ombudsman: parseOmbudsman } as const;

function parseRequest(kind: RequestKind) {
  return (id: string, d: DocumentData): CitizenRequest => parsers[kind](id, d);
}

// ---------- Consultas ----------

export function watchMyRequests(kind: RequestKind, uid: string): Watcher<CitizenRequest[]> {
  const q = query(collection(db, kind), where("citizenId", "==", uid), orderBy("createdAt", "desc"), limit(100));
  return watchQuery(q, parseRequest(kind));
}

export function watchRequest(kind: RequestKind, id: string): Watcher<CitizenRequest | null> {
  return watchDoc(doc(db, kind, id), parseRequest(kind));
}

/**
 * Lista do painel. Servidores veem a ouvidoria apenas das unidades
 * atribuídas (buildingIds); `null` significa sem restrição (ROOT).
 */
export function watchAdminRequests(kind: RequestKind, buildingScope: string[] | null): Watcher<CitizenRequest[]> {
  const ref = collection(db, kind);
  const parse = parseRequest(kind);
  if (kind === "issues" || buildingScope === null) {
    return watchQuery(query(ref, orderBy("createdAt", "desc"), limit(ADMIN_LIST_LIMIT)), parse);
  }
  const watchers = chunk(buildingScope, 30).map((ids) =>
    watchQuery(query(ref, where("buildingId", "in", ids), orderBy("createdAt", "desc"), limit(ADMIN_LIST_LIMIT)), parse),
  );
  const merged = mergeWatchers(watchers);
  return (onData, onError) =>
    merged((items) => onData([...items].sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))), onError);
}

function parseHistory(id: string, d: DocumentData): HistoryEntry {
  return {
    id,
    from: parseStatus(d.from),
    to: parseStatus(d.to),
    officialResponse: optionalStr(d.officialResponse),
    byUid: str(d.byUid),
    byName: str(d.byName),
    at: toDate(d.at),
  };
}

export function watchHistory(kind: RequestKind, id: string): Watcher<HistoryEntry[]> {
  return watchQuery(query(collection(db, kind, id, "history"), orderBy("at", "asc")), parseHistory);
}

function parseNote(id: string, d: DocumentData): Note {
  return { id, text: str(d.text), byUid: str(d.byUid), byName: str(d.byName), at: toDate(d.at) };
}

export function watchNotes(kind: RequestKind, id: string): Watcher<Note[]> {
  return watchQuery(query(collection(db, kind, id, "notes"), orderBy("at", "asc")), parseNote);
}

// ---------- Escritas do cidadão ----------

export interface NewIssueInput {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  lat: number;
  lng: number;
  address: Address;
  photoPath: string | null;
}

/** Gera um id antes do envio para que a foto possa ser gravada na pasta certa. */
export function newIssueId(): string {
  return doc(collection(db, "issues")).id;
}

function requestStamps(citizen: Actor) {
  return {
    status: "RECEIVED",
    citizenId: citizen.uid,
    citizenName: citizen.name,
    lastResponse: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    statusChangedAt: serverTimestamp(),
  };
}

export interface Created {
  id: string;
  protocol: string;
  /** Promessa de confirmação no servidor (fica pendente enquanto offline). */
  committed: Promise<void>;
}

export function createIssue(input: NewIssueInput, citizen: Actor): Created {
  const protocol = makeProtocol("ZEL");
  const committed = setDoc(doc(db, "issues", input.id), {
    protocol,
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    department: categoryOf(input.category).department,
    lat: input.lat,
    lng: input.lng,
    address: {
      streetType: input.address.streetType,
      streetName: input.address.streetName.trim(),
      number: input.address.number?.trim() || null,
      neighborhood: input.address.neighborhood.trim(),
      complement: input.address.complement?.trim() || null,
    },
    photoPath: input.photoPath,
    ...requestStamps(citizen),
  });
  return { id: input.id, protocol, committed };
}

export interface NewOmbudsmanInput {
  title: string;
  description: string;
  type: OmbudsmanType;
  buildingId: string;
  buildingName: string;
  occurrenceDate: string;
  occurrenceTime: string | null;
}

export function createOmbudsman(input: NewOmbudsmanInput, citizen: Actor): Created {
  const ref = doc(collection(db, "ombudsman"));
  const protocol = makeProtocol("OUV");
  const committed = setDoc(ref, {
    protocol,
    title: input.title.trim(),
    description: input.description.trim(),
    type: input.type,
    buildingId: input.buildingId,
    buildingName: input.buildingName,
    occurrenceDate: input.occurrenceDate,
    occurrenceTime: input.occurrenceTime || null,
    ...requestStamps(citizen),
  });
  return { id: ref.id, protocol, committed };
}

export async function cancelRequest(kind: RequestKind, id: string): Promise<void> {
  await updateDoc(doc(db, kind, id), {
    status: "CANCELED",
    updatedAt: serverTimestamp(),
    statusChangedAt: serverTimestamp(),
  });
}

// ---------- Escritas da equipe ----------

export interface StatusChangeInput {
  to: RequestStatus;
  officialResponse: string | null;
  internalNote: string | null;
}

/** Atualiza status + histórico (+ nota interna) num único lote atômico. */
export async function changeStatus(request: CitizenRequest, input: StatusChangeInput, actor: Actor): Promise<void> {
  const response = input.officialResponse?.trim() || null;
  const batch = writeBatch(db);
  batch.update(doc(db, request.kind, request.id), {
    status: input.to,
    lastResponse: response ?? request.lastResponse,
    updatedAt: serverTimestamp(),
    statusChangedAt: serverTimestamp(),
  });
  batch.set(doc(db, request.kind, request.id, "history", input.to), {
    from: request.status,
    to: input.to,
    officialResponse: response,
    byUid: actor.uid,
    byName: actor.name,
    at: serverTimestamp(),
  });
  const note = input.internalNote?.trim();
  if (note) {
    batch.set(doc(collection(db, request.kind, request.id, "notes")), {
      text: note,
      byUid: actor.uid,
      byName: actor.name,
      at: serverTimestamp(),
    });
  }
  await batch.commit();
}

export async function addNote(kind: RequestKind, id: string, text: string, actor: Actor): Promise<void> {
  await setDoc(doc(collection(db, kind, id, "notes")), {
    text: text.trim(),
    byUid: actor.uid,
    byName: actor.name,
    at: serverTimestamp(),
  });
}
