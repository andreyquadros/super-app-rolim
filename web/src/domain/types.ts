import type { IssueCategory, OmbudsmanType, StreetType } from "./catalog";
import type { RequestStatus } from "./status";

export type Role = "ROOT" | "CIVIL_SERVANT" | "DUTY_MANAGER";

export interface Profile {
  fullName: string;
  cpf: string;
  phone: string;
  email: string;
  /** Espelha o token do Auth: true depois que a pessoa confirma o e-mail */
  emailVerified: boolean;
  createdAt: Date | null;
}

export interface StaffMember {
  id: string;
  roles: Role[];
  buildingIds: string[];
  fullName: string;
  email: string;
  cpf: string;
  active: boolean;
  updatedAt: Date | null;
}

export type BuildingType = "PUBLIC" | "PHARMACY" | "FUNERAL";

/** Estabelecimentos com plantão (lista pública, responsável atualiza). */
export type DutyType = Extract<BuildingType, "PHARMACY" | "FUNERAL">;
export type PhoneType = "WHATSAPP" | "MOBILE" | "LANDLINE";

export interface Phone {
  type: PhoneType;
  number: string;
}

export interface Building {
  id: string;
  name: string;
  type: BuildingType;
  address: string;
  lat: number;
  lng: number;
  isOpen: boolean;
  isOnDuty: boolean;
  ownerIds: string[];
  phones: Phone[];
  openingHours: string | null;
  active: boolean;
  updatedAt: Date | null;
}

export interface Address {
  streetType: StreetType | string;
  streetName: string;
  number: string | null;
  neighborhood: string;
  complement: string | null;
}

export type RequestKind = "issues" | "ombudsman";

interface RequestBase {
  id: string;
  protocol: string;
  title: string;
  description: string;
  status: RequestStatus;
  citizenId: string;
  citizenName: string;
  lastResponse: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  statusChangedAt: Date | null;
}

export interface Issue extends RequestBase {
  kind: "issues";
  category: IssueCategory;
  department: string;
  lat: number;
  lng: number;
  address: Address;
  photoPath: string | null;
}

export interface Ombudsman extends RequestBase {
  kind: "ombudsman";
  type: OmbudsmanType;
  buildingId: string;
  buildingName: string;
  occurrenceDate: string;
  occurrenceTime: string | null;
}

export type CitizenRequest = Issue | Ombudsman;

export interface HistoryEntry {
  id: string;
  from: RequestStatus;
  to: RequestStatus;
  officialResponse: string | null;
  byUid: string;
  byName: string;
  at: Date | null;
}

export interface Note {
  id: string;
  text: string;
  byUid: string;
  byName: string;
  at: Date | null;
}

export type NotificationStatus = "DRAFT" | "QUEUED" | "SENDING" | "SENT" | "FAILED";

export interface CityNotification {
  id: string;
  title: string;
  body: string;
  buildingId: string;
  buildingName: string;
  status: NotificationStatus;
  createdBy: string;
  createdByName: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  sentAt: Date | null;
  error: string | null;
}

/** Quem está agindo (para histórico e auditoria). */
export interface Actor {
  uid: string;
  name: string;
}
