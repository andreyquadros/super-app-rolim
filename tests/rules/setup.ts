import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, serverTimestamp, setDoc, setLogLevel, type Firestore } from "firebase/firestore";

// As negações esperadas geram logs ruidosos; os asserts já cobrem o resultado.
setLogLevel("silent");

export const PROJECT_ID = "demo-rolim";

export const UIDS = {
  citizen: "cidadao-1",
  otherCitizen: "cidadao-2",
  root: "admin-1",
  servant: "servidor-1",
  dutyManager: "plantao-1",
} as const;

export const BUILDINGS = {
  ubs: "ubs-centro",
  hospital: "hospital-municipal",
  pharmacy: "farmacia-exemplo",
  funeral: "funeraria-exemplo",
  otherFuneral: "funeraria-outra",
} as const;

export async function createEnv(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve("firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 8180,
    },
    storage: {
      rules: readFileSync(resolve("storage.rules"), "utf8"),
      host: "127.0.0.1",
      port: 9499,
    },
  });
}

export function asUser(env: RulesTestEnvironment, uid: string, emailVerified = false) {
  return env.authenticatedContext(uid, { email: `${uid}@rolim.test`, email_verified: emailVerified }).firestore();
}

export function asAnonymous(env: RulesTestEnvironment) {
  return env.unauthenticatedContext().firestore();
}

/** Cria os dados base ignorando as regras (como faria o console do Firebase). */
export async function seedBase(env: RulesTestEnvironment) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore() as unknown as Firestore;
    const now = serverTimestamp();
    const profile = (name: string, cpf: string, uid: string) => ({
      fullName: name,
      cpf,
      phone: "69999990000",
      email: `${uid}@rolim.test`,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });
    await setDoc(doc(db, "users", UIDS.citizen), profile("Maria Cidadã", "52998224725", UIDS.citizen));
    await setDoc(doc(db, "users", UIDS.otherCitizen), profile("João Cidadão", "11144477735", UIDS.otherCitizen));
    await setDoc(doc(db, "users", UIDS.servant), profile("Servidora Ana", "39053344705", UIDS.servant));

    const staff = (roles: string[], buildingIds: string[], fullName: string) => ({
      roles,
      buildingIds,
      fullName,
      email: "",
      cpf: "",
      active: true,
      createdAt: now,
      updatedAt: now,
      updatedBy: "seed",
    });
    await setDoc(doc(db, "staff", UIDS.root), staff(["ROOT"], [], "Admin Geral"));
    await setDoc(doc(db, "staff", UIDS.servant), staff(["CIVIL_SERVANT"], [BUILDINGS.ubs], "Servidora Ana"));
    await setDoc(doc(db, "staff", UIDS.dutyManager), staff(["DUTY_MANAGER"], [], "Responsável Plantão"));

    const building = (name: string, type: string, ownerIds: string[] = []) => ({
      name,
      type,
      address: "Av. Norte Sul, 1000 - Centro",
      lat: -11.7271,
      lng: -61.7782,
      isOpen: true,
      isOnDuty: false,
      ownerIds,
      phones: [],
      openingHours: null,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    await setDoc(doc(db, "buildings", BUILDINGS.ubs), building("UBS Centro", "PUBLIC"));
    await setDoc(doc(db, "buildings", BUILDINGS.hospital), building("Hospital Municipal", "PUBLIC"));
    await setDoc(doc(db, "buildings", BUILDINGS.pharmacy), building("Farmácia Exemplo", "PHARMACY", [UIDS.dutyManager]));
    await setDoc(doc(db, "buildings", BUILDINGS.funeral), building("Funerária Exemplo", "FUNERAL", [UIDS.dutyManager]));
    await setDoc(doc(db, "buildings", BUILDINGS.otherFuneral), building("Funerária de Outra Pessoa", "FUNERAL", ["outra-pessoa"]));
  });
}

export function newIssue(citizenId: string, citizenName: string, issueId = "issue-1") {
  return {
    protocol: "ZEL-2026-ABCD2345",
    title: "Poste apagado na esquina",
    description: "O poste da esquina está apagado há uma semana.",
    category: "lighting",
    department: "Iluminação Pública",
    lat: -11.7271,
    lng: -61.7782,
    address: {
      streetType: "Avenida",
      streetName: "Norte Sul",
      number: "1000",
      neighborhood: "Centro",
      complement: null,
    },
    photoPath: `issues/${citizenId}/${issueId}/foto.jpg`,
    status: "RECEIVED",
    citizenId,
    citizenName,
    lastResponse: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    statusChangedAt: serverTimestamp(),
  };
}

export function newOmbudsman(citizenId: string, citizenName: string, buildingId: string, buildingName: string) {
  return {
    protocol: "OUV-2026-ABCD2345",
    title: "Demora no atendimento",
    description: "Esperei mais de três horas para ser atendido na recepção.",
    type: "service_delay",
    buildingId,
    buildingName,
    occurrenceDate: "2026-10-10",
    occurrenceTime: "08:30",
    status: "RECEIVED",
    citizenId,
    citizenName,
    lastResponse: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    statusChangedAt: serverTimestamp(),
  };
}
