import { FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import * as functionsV1 from "firebase-functions/v1";
import { db } from "../admin";
import { REGION } from "../config";

/**
 * Exclusão de conta (direito previsto na LGPD): remove dados pessoais do
 * perfil, libera o CPF, desativa o acesso de equipe e apaga os dispositivos.
 * As solicitações abertas permanecem para fins de registro público, apenas
 * com o nome informado na época.
 *
 * Substitui o agendador diário que conferia usuários removidos do Keycloak.
 */
export const onAccountDeleted = functionsV1
  .region(REGION)
  .auth.user()
  .onDelete(async (user) => {
    const firestore = db();
    const profileRef = firestore.doc(`users/${user.uid}`);
    const profile = await profileRef.get();
    const cpf = profile.get("cpf");

    const batch = firestore.batch();
    batch.delete(profileRef);
    if (typeof cpf === "string") batch.delete(firestore.doc(`cpfs/${cpf}`));

    const staffRef = firestore.doc(`staff/${user.uid}`);
    if ((await staffRef.get()).exists) {
      batch.update(staffRef, { active: false, updatedAt: FieldValue.serverTimestamp(), updatedBy: "system" });
    }

    const devices = await firestore.collection("devices").where("uid", "==", user.uid).get();
    devices.docs.forEach((d) => batch.delete(d.ref));

    await batch.commit();
    logger.info("dados da conta removidos", { uid: user.uid, devices: devices.size });
  });
