import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { getBytes, ref, uploadBytes } from "firebase/storage";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { createEnv, seedBase, UIDS } from "./setup";

let env: RulesTestEnvironment;
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

beforeAll(async () => {
  env = await createEnv();
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await seedBase(env);
});

const storageOf = (uid: string) => env.authenticatedContext(uid).storage();

describe("fotos da zeladoria", () => {
  const path = `issues/${UIDS.citizen}/issue-1/foto.jpg`;

  it("cidadão envia imagem na própria pasta", async () => {
    await assertSucceeds(uploadBytes(ref(storageOf(UIDS.citizen), path), JPEG, { contentType: "image/jpeg" }));
  });

  it("não permite trocar a foto depois de enviada nem enviar SVG", async () => {
    const storage = storageOf(UIDS.citizen);
    const own = `issues/${UIDS.citizen}/issue-2/foto-1.jpg`;
    await assertSucceeds(uploadBytes(ref(storage, own), JPEG, { contentType: "image/jpeg" }));
    await assertFails(uploadBytes(ref(storage, own), JPEG, { contentType: "image/jpeg" }));
    await assertFails(
      uploadBytes(ref(storage, `issues/${UIDS.citizen}/issue-1/x.svg`), JPEG, { contentType: "image/svg+xml" }),
    );
  });

  it("recusa pasta de outra pessoa e arquivos que não são imagem", async () => {
    await assertFails(uploadBytes(ref(storageOf(UIDS.otherCitizen), path), JPEG, { contentType: "image/jpeg" }));
    await assertFails(
      uploadBytes(ref(storageOf(UIDS.citizen), `issues/${UIDS.citizen}/issue-1/doc.pdf`), JPEG, {
        contentType: "application/pdf",
      }),
    );
  });

  it("somente autor e equipe veem a foto", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), path), JPEG, { contentType: "image/jpeg" });
    });
    await assertSucceeds(getBytes(ref(storageOf(UIDS.citizen), path)));
    await assertSucceeds(getBytes(ref(storageOf(UIDS.servant), path)));
    await assertFails(getBytes(ref(storageOf(UIDS.otherCitizen), path)));
    await assertFails(getBytes(ref(env.unauthenticatedContext().storage(), path)));
  });
});
