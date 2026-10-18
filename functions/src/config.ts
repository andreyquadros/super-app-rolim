import { defineString } from "firebase-functions/params";

/** Mesma região do Firestore (São Paulo), mantendo os dados no Brasil. */
export const REGION = "southamerica-east1";

export const INSTITUTION = "Prefeitura Municipal de Rolim de Moura";

/** Tópico FCM no qual todo dispositivo registrado é inscrito. */
export const BROADCAST_TOPIC = "comunicados";

/**
 * Endereço público do app, usado nos links de e-mail e push.
 * Em produção, defina em functions/.env.<id-do-projeto>:
 *   APP_URL=https://app.rolimdemoura.ro.gov.br
 */
export const APP_URL = defineString("APP_URL", {
  default: "http://localhost:5173",
  description: "Endereço público do app (ex.: https://app.rolimdemoura.ro.gov.br)",
});

export function isEmulator(): boolean {
  return process.env.FUNCTIONS_EMULATOR === "true";
}
