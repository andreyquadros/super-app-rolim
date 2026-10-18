// Popula o Firebase Emulator Suite com dados de demonstração.
// Uso: npm run emulators (em um terminal) e depois npm run seed.
// Recusa-se a rodar fora de um projeto "demo-": nunca toca em produção.

const PROJECT_ID = process.env.GCLOUD_PROJECT ?? "demo-rolim";
if (!PROJECT_ID.startsWith("demo-")) {
  console.error(`Abortado: o seed só roda em projetos de demonstração (recebido "${PROJECT_ID}").`);
  process.exit(1);
}
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8180";
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9399";

const { initializeApp } = await import("firebase-admin/app");
const { getAuth } = await import("firebase-admin/auth");
const { getFirestore, Timestamp } = await import("firebase-admin/firestore");

initializeApp({ projectId: PROJECT_ID });
const auth = getAuth();
const db = getFirestore();

/** Senha das contas de teste do emulador (não existe em produção). */
const TEST_PASSWORD = "rolim-dev-2026";
const CENTER = { lat: -11.7271, lng: -61.7782 };
const now = Date.now();
const ago = (days, hours = 0) => Timestamp.fromMillis(now - (days * 24 + hours) * 3600 * 1000);
const near = (dLat, dLng) => ({ lat: +(CENTER.lat + dLat).toFixed(6), lng: +(CENTER.lng + dLng).toFixed(6) });

function cpfFrom(base9) {
  const digits = base9.split("").map(Number);
  const dv = (len) => {
    const sum = digits.slice(0, len).reduce((acc, d, i) => acc + d * (len + 1 - i), 0);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  digits.push(dv(9));
  digits.push(dv(10));
  return digits.join("");
}

const PEOPLE = [
  { key: "citizen", email: "cidadao@rolim.test", name: "Maria da Silva Souza", cpf: cpfFrom("123456789"), phone: "69999990001" },
  { key: "root", email: "admin@rolim.test", name: "Administração Prefeitura", cpf: cpfFrom("987654321"), phone: "69999990002", staff: { roles: ["ROOT"] } },
  { key: "servant", email: "servidor@rolim.test", name: "Ana Paula Ribeiro", cpf: cpfFrom("111222333"), phone: "69999990003", staff: { roles: ["CIVIL_SERVANT"], units: ["ubs-centro", "secretaria-obras"] } },
  { key: "pharmacist", email: "farmacia@rolim.test", name: "José Carlos Lima", cpf: cpfFrom("444555666"), phone: "69999990004", staff: { roles: ["PHARMACY_MANAGER"] } },
];

async function upsertUser(person) {
  try {
    const existing = await auth.getUserByEmail(person.email);
    return existing.uid;
  } catch {
    const created = await auth.createUser({ email: person.email, password: TEST_PASSWORD, displayName: person.name, emailVerified: true });
    return created.uid;
  }
}

const uids = {};
for (const person of PEOPLE) {
  const uid = await upsertUser(person);
  uids[person.key] = uid;
  await db.doc(`users/${uid}`).set({ fullName: person.name, cpf: person.cpf, phone: person.phone, email: person.email, createdAt: ago(60), updatedAt: ago(60) });
  await db.doc(`cpfs/${person.cpf}`).set({ uid });
  if (person.staff) {
    await db.doc(`staff/${uid}`).set({
      roles: person.staff.roles,
      buildingIds: person.staff.units ?? [],
      fullName: person.name,
      email: person.email,
      cpf: person.cpf,
      active: true,
      createdAt: ago(60),
      updatedAt: ago(60),
      updatedBy: "seed",
    });
  }
}

const building = (name, type, point, extra = {}) => ({
  name,
  type,
  address: extra.address ?? "Rolim de Moura - RO",
  lat: point.lat,
  lng: point.lng,
  isOpen: extra.isOpen ?? true,
  isOnDuty: extra.isOnDuty ?? false,
  ownerIds: extra.ownerIds ?? [],
  phones: extra.phones ?? [],
  openingHours: extra.openingHours ?? null,
  active: true,
  createdAt: ago(90),
  updatedAt: ago(extra.updatedDaysAgo ?? 1),
});

const BUILDINGS = {
  "paco-municipal": building("Paço Municipal (exemplo)", "PUBLIC", near(0.001, 0.002), { address: "Av. Norte Sul, Centro" }),
  "ubs-centro": building("UBS Centro (exemplo)", "PUBLIC", near(-0.004, 0.003), { address: "Rua Exemplo, 100 - Centro" }),
  "hospital-municipal": building("Hospital Municipal (exemplo)", "PUBLIC", near(0.006, -0.004), { address: "Av. Exemplo, 2000" }),
  "secretaria-obras": building("Secretaria de Obras (exemplo)", "PUBLIC", near(-0.008, -0.006), { address: "Rua das Obras, 50" }),
  "escola-centro": building("Escola Municipal Centro (exemplo)", "PUBLIC", near(0.003, 0.008), { address: "Rua da Escola, 300" }),
  "farmacia-centro": building("Farmácia Exemplo Centro", "PHARMACY", near(0.0015, -0.0012), {
    address: "Av. Norte Sul, 1200 - Centro",
    isOnDuty: true,
    ownerIds: [uids.pharmacist],
    phones: [{ type: "LANDLINE", number: "6934420001" }, { type: "WHATSAPP", number: "69999991001" }],
    openingHours: "Plantão 24h nesta semana",
  }),
  "drogaria-bela-vista": building("Drogaria Exemplo Bela Vista", "PHARMACY", near(-0.006, 0.009), {
    address: "Rua Exemplo, 455 - Bela Vista",
    phones: [{ type: "MOBILE", number: "69999991002" }],
    openingHours: "Seg–Sáb 7h às 21h",
  }),
  "farmacia-jardim": building("Farmácia Exemplo Jardim", "PHARMACY", near(0.009, 0.004), {
    address: "Av. Exemplo, 88 - Jardim Tropical",
    isOpen: false,
    phones: [{ type: "LANDLINE", number: "6934420003" }],
    openingHours: "Seg–Sex 8h às 18h",
  }),
};
for (const [id, data] of Object.entries(BUILDINGS)) await db.doc(`buildings/${id}`).set(data);

const citizen = { citizenId: uids.citizen, citizenName: "Maria da Silva Souza" };
const servant = { byUid: uids.servant, byName: "Ana Paula Ribeiro" };

async function request(collection, id, data, history = []) {
  const last = history.at(-1);
  await db.doc(`${collection}/${id}`).set({
    ...data,
    ...citizen,
    status: last?.to ?? "RECEIVED",
    lastResponse: [...history].reverse().find((h) => h.officialResponse)?.officialResponse ?? null,
    updatedAt: last?.at ?? data.createdAt,
    statusChangedAt: last?.at ?? data.createdAt,
  });
  for (const h of history) await db.doc(`${collection}/${id}/history/${h.to}`).set({ ...servant, officialResponse: null, ...h });
}

const address = (streetType, streetName, number, neighborhood, complement = null) => ({ streetType, streetName, number, neighborhood, complement });

await request("issues", "demo-iluminacao", {
  protocol: "ZEL-2026-K7Q2MX9P", title: "Poste apagado em frente à escola", description: "O poste está apagado há uma semana e a rua fica muito escura à noite.",
  category: "lighting", department: "Iluminação Pública", ...near(0.0032, 0.0075), address: address("Rua", "da Escola", "300", "Centro", "Em frente ao portão principal"),
  photoPath: null, createdAt: ago(9),
}, [
  { from: "RECEIVED", to: "UNDER_ANALYSIS", at: ago(7) },
  { from: "UNDER_ANALYSIS", to: "IN_PROGRESS", at: ago(3), officialResponse: "Equipe de iluminação agendada para esta semana." },
]);
await request("issues", "demo-buraco", {
  protocol: "ZEL-2026-B4RACQS2", title: "Buraco grande no asfalto", description: "Buraco no meio da via, carros desviando pela contramão.",
  category: "pavement", department: "Secretaria de Obras", ...near(-0.0052, -0.0021), address: address("Avenida", "Norte Sul", "1850", "Centro"),
  photoPath: null, createdAt: ago(2, 5),
});
await request("issues", "demo-mato", {
  protocol: "ZEL-2026-M4TQALTQ", title: "Terreno baldio com mato alto", description: "Mato alto acumulando lixo e mosquitos ao lado das casas.",
  category: "vegetation", department: "Parques e Jardins", ...near(0.0071, -0.0058), address: address("Rua", "Exemplo", null, "Jardim Tropical"),
  photoPath: null, createdAt: ago(25),
}, [
  { from: "RECEIVED", to: "UNDER_ANALYSIS", at: ago(22) },
  { from: "UNDER_ANALYSIS", to: "IN_PROGRESS", at: ago(18) },
  { from: "IN_PROGRESS", to: "RESOLVED", at: ago(12), officialResponse: "Limpeza realizada e proprietário notificado." },
]);
await request("issues", "demo-lixo", {
  protocol: "ZEL-2026-LQXQDESC", title: "Entulho descartado na calçada", description: "Descarte irregular de entulho bloqueando a calçada há vários dias.",
  category: "sanitation", department: "Limpeza Urbana e Saneamento", ...near(-0.0023, 0.0094), address: address("Travessa", "Exemplo", "12", "Bela Vista"),
  photoPath: null, createdAt: ago(11),
});

await request("ombudsman", "demo-elogio", {
  protocol: "OUV-2026-ELQGIQ2A", title: "Atendimento excelente na recepção", description: "Fui muito bem atendida pela equipe da recepção, com paciência e cuidado.",
  type: "compliment", buildingId: "ubs-centro", buildingName: BUILDINGS["ubs-centro"].name, occurrenceDate: "2026-10-10", occurrenceTime: "09:30", createdAt: ago(6),
}, [{ from: "RECEIVED", to: "UNDER_ANALYSIS", at: ago(5), officialResponse: "Obrigado! O elogio foi repassado à equipe." }]);
await request("ombudsman", "demo-demora", {
  protocol: "OUV-2026-DEMQRA7X", title: "Demora para marcar consulta", description: "Tentei marcar consulta três vezes e não consegui atendimento por telefone.",
  type: "service_delay", buildingId: "hospital-municipal", buildingName: BUILDINGS["hospital-municipal"].name, occurrenceDate: "2026-10-14", occurrenceTime: null, createdAt: ago(1, 3),
});

await db.doc("notifications/demo-vacina").set({
  title: "Campanha de vacinação neste sábado", body: "Vacinação contra a gripe das 8h às 17h na UBS Centro. Leve documento e cartão de vacina.",
  buildingId: "ubs-centro", buildingName: BUILDINGS["ubs-centro"].name, status: "SENT",
  createdBy: uids.servant, createdByName: "Ana Paula Ribeiro", createdAt: ago(2), updatedAt: ago(2), sentAt: ago(2),
});
await db.doc("notifications/demo-rascunho").set({
  title: "Interdição parcial da Av. Norte Sul", body: "Obras de recapeamento entre as ruas X e Y na próxima segunda-feira.",
  buildingId: "secretaria-obras", buildingName: BUILDINGS["secretaria-obras"].name, status: "DRAFT",
  createdBy: uids.servant, createdByName: "Ana Paula Ribeiro", createdAt: ago(0, 4), updatedAt: ago(0, 4),
});

console.log("Dados de demonstração criados. Contas (senha de teste em scripts/seed-emulator.mjs):");
for (const p of PEOPLE) console.log(`  ${p.key.padEnd(10)} ${p.email}`);
process.exit(0);
