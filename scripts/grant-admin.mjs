// Concede o perfil de ADMINISTRADOR (ROOT) a uma conta já cadastrada no app.
// Use só uma vez, para o primeiro administrador; os demais são liberados
// pelo próprio painel (Equipe e acessos).
//
// Pré-requisitos:
//   1. A pessoa criou a conta no app (com CPF e celular).
//   2. Credenciais de administrador do Google Cloud neste computador:
//        gcloud auth application-default login
//      (ou GOOGLE_APPLICATION_CREDENTIALS apontando para uma chave de serviço)
//
// Uso:
//   node scripts/grant-admin.mjs <id-do-projeto> <email-da-pessoa>

const [projectId, email] = process.argv.slice(2);
if (!projectId || !email) {
  console.error("Uso: node scripts/grant-admin.mjs <id-do-projeto> <email-da-pessoa>");
  process.exit(1);
}

const { initializeApp, applicationDefault } = await import("firebase-admin/app");
const { getAuth } = await import("firebase-admin/auth");
const { getFirestore, FieldValue } = await import("firebase-admin/firestore");

initializeApp({ projectId, credential: applicationDefault() });

try {
  const user = await getAuth().getUserByEmail(email);
  const db = getFirestore();
  const profile = await db.doc(`users/${user.uid}`).get();
  if (!profile.exists) {
    console.error(`A conta ${email} ainda não completou o cadastro no app (CPF e celular). Peça para concluir e rode de novo.`);
    process.exit(1);
  }
  await db.doc(`staff/${user.uid}`).set(
    {
      roles: ["ROOT"],
      buildingIds: [],
      fullName: profile.get("fullName"),
      email: profile.get("email"),
      cpf: profile.get("cpf"),
      active: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: "grant-admin-script",
    },
    { merge: true },
  );
  console.log(`Pronto: ${profile.get("fullName")} <${email}> agora é administrador(a) em ${projectId}.`);
  process.exit(0);
} catch (error) {
  console.error("Não foi possível conceder o acesso:", error instanceof Error ? error.message : error);
  process.exit(1);
}
