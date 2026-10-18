import { Timestamp, type DocumentData, type DocumentSnapshot, type QuerySnapshot } from "firebase/firestore";

/** Converte Timestamp do Firestore (ou estimativa local) em Date. */
export function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

export function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function optionalStr(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function strList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/** Lê o documento usando estimativa para serverTimestamp() pendente. */
export function dataOf(snapshot: DocumentSnapshot<DocumentData>): DocumentData {
  return snapshot.data({ serverTimestamps: "estimate" }) ?? {};
}

export function mapDocs<T>(snapshot: QuerySnapshot<DocumentData>, parse: (id: string, data: DocumentData) => T): T[] {
  return snapshot.docs.map((d) => parse(d.id, d.data({ serverTimestamps: "estimate" })));
}
