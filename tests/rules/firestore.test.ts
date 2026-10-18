import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { asAnonymous, asUser, BUILDINGS, createEnv, newIssue, newOmbudsman, seedBase, UIDS } from "./setup";

let env: RulesTestEnvironment;
const db = (uid: string) => asUser(env, uid) as unknown as Firestore;

beforeAll(async () => {
  env = await createEnv();
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await seedBase(env);
});

async function seedDoc(path: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore() as unknown as Firestore, path), data);
  });
}

function statusChange(firestore: Firestore, collectionName: string, id: string, from: string, to: string, response: string | null) {
  const batch = writeBatch(firestore);
  batch.update(doc(firestore, collectionName, id), {
    status: to,
    lastResponse: response,
    updatedAt: serverTimestamp(),
    statusChangedAt: serverTimestamp(),
  });
  batch.set(doc(firestore, collectionName, id, "history", to), {
    from,
    to,
    officialResponse: response,
    byUid: UIDS.servant,
    byName: "Servidora Ana",
    at: serverTimestamp(),
  });
  return batch;
}

describe("cadastro do cidadão", () => {
  const profile = (uid: string, cpf: string) => ({
    fullName: "Nova Pessoa",
    cpf,
    phone: "69988887777",
    email: `${uid}@rolim.test`,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  it("cria perfil junto com o índice de CPF", async () => {
    const firestore = db("novo-1");
    const batch = writeBatch(firestore);
    batch.set(doc(firestore, "users", "novo-1"), profile("novo-1", "15350946056"));
    batch.set(doc(firestore, "cpfs", "15350946056"), { uid: "novo-1" });
    await assertSucceeds(batch.commit());
  });

  it("recusa CPF já usado por outra conta", async () => {
    await seedDoc("cpfs/15350946056", { uid: "outra-conta" });
    const firestore = db("novo-1");
    const batch = writeBatch(firestore);
    batch.set(doc(firestore, "users", "novo-1"), profile("novo-1", "15350946056"));
    batch.set(doc(firestore, "cpfs", "15350946056"), { uid: "novo-1" });
    await assertFails(batch.commit());
  });

  it("recusa e-mail diferente do login", async () => {
    const firestore = db("novo-1");
    const batch = writeBatch(firestore);
    batch.set(doc(firestore, "users", "novo-1"), { ...profile("novo-1", "15350946056"), email: "falso@x.com" });
    batch.set(doc(firestore, "cpfs", "15350946056"), { uid: "novo-1" });
    await assertFails(batch.commit());
  });

  it("cidadão não lê perfil de outro; servidor lê", async () => {
    await assertFails(getDoc(doc(db(UIDS.citizen), "users", UIDS.otherCitizen)));
    await assertSucceeds(getDoc(doc(db(UIDS.servant), "users", UIDS.otherCitizen)));
  });

  it("não permite alterar o CPF", async () => {
    await assertFails(
      updateDoc(doc(db(UIDS.citizen), "users", UIDS.citizen), { cpf: "11144477735", updatedAt: serverTimestamp() }),
    );
  });
});

describe("equipe", () => {
  const staffDoc = (by: string, roles: string[], buildingIds: string[]) => ({
    roles,
    buildingIds,
    fullName: "Pessoa",
    email: "p@rolim.test",
    cpf: "11144477735",
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: by,
  });

  it("cidadão não se promove", async () => {
    await assertFails(setDoc(doc(db(UIDS.citizen), "staff", UIDS.citizen), staffDoc(UIDS.citizen, ["ROOT"], [])));
  });

  it("admin cadastra servidor", async () => {
    await assertSucceeds(
      setDoc(doc(db(UIDS.root), "staff", UIDS.otherCitizen), staffDoc(UIDS.root, ["CIVIL_SERVANT"], [BUILDINGS.hospital])),
    );
  });

  it("servidor cadastra colega apenas nas próprias unidades", async () => {
    await assertSucceeds(
      setDoc(doc(db(UIDS.servant), "staff", UIDS.otherCitizen), staffDoc(UIDS.servant, ["CIVIL_SERVANT"], [BUILDINGS.ubs])),
    );
    await assertFails(
      setDoc(doc(db(UIDS.servant), "staff", UIDS.otherCitizen), staffDoc(UIDS.servant, ["CIVIL_SERVANT"], [BUILDINGS.hospital])),
    );
    await assertFails(setDoc(doc(db(UIDS.servant), "staff", UIDS.otherCitizen), staffDoc(UIDS.servant, ["ROOT"], [])));
  });

  it("servidor não altera o próprio acesso", async () => {
    await assertFails(
      setDoc(doc(db(UIDS.servant), "staff", UIDS.servant), staffDoc(UIDS.servant, ["CIVIL_SERVANT"], [BUILDINGS.ubs])),
    );
  });
});

describe("unidades e farmácias", () => {
  it("leitura é pública", async () => {
    await assertSucceeds(getDoc(doc(asAnonymous(env) as unknown as Firestore, "buildings", BUILDINGS.pharmacy)));
  });

  it("cidadão não edita unidade", async () => {
    await assertFails(updateDoc(doc(db(UIDS.citizen), "buildings", BUILDINGS.ubs), { name: "X", updatedAt: serverTimestamp() }));
  });

  it("farmacêutico alterna plantão da própria farmácia, e só isso", async () => {
    const ref = doc(db(UIDS.pharmacist), "buildings", BUILDINGS.pharmacy);
    await assertSucceeds(updateDoc(ref, { isOnDuty: true, isOpen: true, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref, { name: "Outro nome", updatedAt: serverTimestamp() }));
    await assertFails(
      updateDoc(doc(db(UIDS.pharmacist), "buildings", BUILDINGS.ubs), { isOnDuty: true, updatedAt: serverTimestamp() }),
    );
  });

  it("admin não cria unidade fora do município", async () => {
    await assertFails(
      setDoc(doc(db(UIDS.root), "buildings", "fora"), {
        name: "Fora",
        type: "PUBLIC",
        address: "Porto Velho",
        lat: -8.76,
        lng: -63.9,
        isOpen: true,
        isOnDuty: false,
        ownerIds: [],
        phones: [],
        openingHours: null,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  });
});

describe("zeladoria", () => {
  it("cidadão abre solicitação válida", async () => {
    await assertSucceeds(setDoc(doc(db(UIDS.citizen), "issues", "issue-1"), newIssue(UIDS.citizen, "Maria Cidadã")));
  });

  it("recusa local fora do município, status forjado ou autor trocado", async () => {
    const base = newIssue(UIDS.citizen, "Maria Cidadã");
    const ref = doc(db(UIDS.citizen), "issues", "issue-1");
    await assertFails(setDoc(ref, { ...base, lat: -9.9, lng: -63.03 }));
    await assertFails(setDoc(ref, { ...base, status: "RESOLVED" }));
    await assertFails(setDoc(ref, { ...base, citizenId: UIDS.otherCitizen }));
    await assertFails(setDoc(ref, { ...base, photoPath: `issues/${UIDS.otherCitizen}/issue-1/foto.jpg` }));
  });

  it("exige cadastro completo", async () => {
    await assertFails(setDoc(doc(db("sem-perfil"), "issues", "issue-1"), newIssue("sem-perfil", "Sem Perfil")));
  });

  it("cada cidadão vê apenas as próprias solicitações", async () => {
    await seedDoc("issues/issue-1", newIssue(UIDS.citizen, "Maria Cidadã"));
    await assertSucceeds(getDoc(doc(db(UIDS.citizen), "issues", "issue-1")));
    await assertFails(getDoc(doc(db(UIDS.otherCitizen), "issues", "issue-1")));
    await assertSucceeds(
      getDocs(query(collection(db(UIDS.citizen), "issues"), where("citizenId", "==", UIDS.citizen))),
    );
    await assertFails(getDocs(collection(db(UIDS.citizen), "issues")));
    await assertSucceeds(getDocs(collection(db(UIDS.servant), "issues")));
  });

  it("servidor avança o status com histórico no mesmo lote", async () => {
    await seedDoc("issues/issue-1", newIssue(UIDS.citizen, "Maria Cidadã"));
    await assertSucceeds(statusChange(db(UIDS.servant), "issues", "issue-1", "RECEIVED", "UNDER_ANALYSIS", null).commit());
  });

  it("recusa status sem histórico, pulando etapas ou indeferido sem justificativa", async () => {
    await seedDoc("issues/issue-1", newIssue(UIDS.citizen, "Maria Cidadã"));
    await assertFails(
      updateDoc(doc(db(UIDS.servant), "issues", "issue-1"), {
        status: "UNDER_ANALYSIS",
        updatedAt: serverTimestamp(),
        statusChangedAt: serverTimestamp(),
      }),
    );
    await assertFails(statusChange(db(UIDS.servant), "issues", "issue-1", "RECEIVED", "RESOLVED", null).commit());
    await assertFails(statusChange(db(UIDS.servant), "issues", "issue-1", "RECEIVED", "REJECTED", null).commit());
    await assertSucceeds(
      statusChange(db(UIDS.servant), "issues", "issue-1", "RECEIVED", "REJECTED", "Solicitação duplicada do protocolo ZEL-2026-AAAA2222").commit(),
    );
  });

  it("cidadão não muda status, mas pode cancelar enquanto recebida", async () => {
    await seedDoc("issues/issue-1", newIssue(UIDS.citizen, "Maria Cidadã"));
    await assertFails(statusChange(db(UIDS.citizen), "issues", "issue-1", "RECEIVED", "UNDER_ANALYSIS", null).commit());
    await assertSucceeds(
      updateDoc(doc(db(UIDS.citizen), "issues", "issue-1"), {
        status: "CANCELED",
        updatedAt: serverTimestamp(),
        statusChangedAt: serverTimestamp(),
      }),
    );
  });

  it("observações internas não aparecem para o cidadão", async () => {
    await seedDoc("issues/issue-1", newIssue(UIDS.citizen, "Maria Cidadã"));
    await seedDoc("issues/issue-1/notes/n1", { text: "interno", byUid: UIDS.servant, byName: "Ana", at: new Date() });
    await assertFails(getDocs(collection(db(UIDS.citizen), "issues", "issue-1", "notes")));
    await assertSucceeds(getDocs(collection(db(UIDS.citizen), "issues", "issue-1", "history")));
    await assertSucceeds(getDocs(collection(db(UIDS.servant), "issues", "issue-1", "notes")));
  });
});

describe("ouvidoria", () => {
  it("só aceita unidades públicas", async () => {
    await assertSucceeds(
      setDoc(doc(db(UIDS.citizen), "ombudsman", "o1"), newOmbudsman(UIDS.citizen, "Maria Cidadã", BUILDINGS.ubs, "UBS Centro")),
    );
    await assertFails(
      setDoc(
        doc(db(UIDS.citizen), "ombudsman", "o2"),
        newOmbudsman(UIDS.citizen, "Maria Cidadã", BUILDINGS.pharmacy, "Farmácia Exemplo"),
      ),
    );
  });

  it("servidor só vê e atende as unidades atribuídas", async () => {
    await seedDoc("ombudsman/ubs", newOmbudsman(UIDS.citizen, "Maria Cidadã", BUILDINGS.ubs, "UBS Centro"));
    await seedDoc("ombudsman/hosp", newOmbudsman(UIDS.citizen, "Maria Cidadã", BUILDINGS.hospital, "Hospital Municipal"));
    await assertSucceeds(getDoc(doc(db(UIDS.servant), "ombudsman", "ubs")));
    await assertFails(getDoc(doc(db(UIDS.servant), "ombudsman", "hosp")));
    await assertSucceeds(
      getDocs(query(collection(db(UIDS.servant), "ombudsman"), where("buildingId", "in", [BUILDINGS.ubs]))),
    );
    await assertFails(getDocs(collection(db(UIDS.servant), "ombudsman")));
    await assertSucceeds(getDocs(collection(db(UIDS.root), "ombudsman")));
    await assertSucceeds(statusChange(db(UIDS.servant), "ombudsman", "ubs", "RECEIVED", "UNDER_ANALYSIS", null).commit());
    await assertFails(statusChange(db(UIDS.servant), "ombudsman", "hosp", "RECEIVED", "UNDER_ANALYSIS", null).commit());
  });
});

describe("comunicados", () => {
  const draft = (buildingId: string, buildingName: string) => ({
    title: "Campanha de vacinação",
    body: "Vacinação contra gripe neste sábado na UBS Centro.",
    buildingId,
    buildingName,
    status: "DRAFT",
    createdBy: UIDS.servant,
    createdByName: "Servidora Ana",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  it("servidor cria rascunho só para a própria unidade", async () => {
    await assertSucceeds(setDoc(doc(db(UIDS.servant), "notifications", "n1"), draft(BUILDINGS.ubs, "UBS Centro")));
    await assertFails(setDoc(doc(db(UIDS.servant), "notifications", "n2"), draft(BUILDINGS.hospital, "Hospital Municipal")));
  });

  it("servidor coloca na fila, mas não marca como enviado", async () => {
    await seedDoc("notifications/n1", { ...draft(BUILDINGS.ubs, "UBS Centro"), createdAt: new Date(), updatedAt: new Date() });
    const ref = doc(db(UIDS.servant), "notifications", "n1");
    await assertFails(updateDoc(ref, { status: "SENT", updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(ref, { status: "QUEUED", updatedAt: serverTimestamp() }));
  });

  it("qualquer pessoa lê enviados; rascunhos não", async () => {
    await seedDoc("notifications/sent", { ...draft(BUILDINGS.ubs, "UBS Centro"), status: "SENT", sentAt: new Date() });
    await seedDoc("notifications/draft", { ...draft(BUILDINGS.ubs, "UBS Centro"), createdAt: new Date() });
    const anon = asAnonymous(env) as unknown as Firestore;
    await assertSucceeds(getDoc(doc(anon, "notifications", "sent")));
    await assertFails(getDoc(doc(anon, "notifications", "draft")));
    await assertSucceeds(getDocs(query(collection(anon, "notifications"), where("status", "==", "SENT"))));
  });
});

describe("dispositivos e coleções internas", () => {
  it("registra apenas o próprio dispositivo", async () => {
    const device = (uid: string) => ({ uid, token: "tok-1", userAgent: "teste", updatedAt: serverTimestamp() });
    await assertSucceeds(setDoc(doc(db(UIDS.citizen), "devices", "tok-1"), device(UIDS.citizen)));
    await assertFails(setDoc(doc(db(UIDS.citizen), "devices", "tok-2"), { ...device(UIDS.otherCitizen), token: "tok-2" }));
  });

  it("e-mails e auditoria não são acessíveis pelo app", async () => {
    await assertFails(setDoc(doc(db(UIDS.root), "mail", "m1"), { to: "x@y.com" }));
    await assertFails(getDocs(collection(db(UIDS.servant), "audit")));
    await assertSucceeds(getDocs(collection(db(UIDS.root), "audit")));
  });
});
