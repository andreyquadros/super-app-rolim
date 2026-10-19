import { defineString } from "firebase-functions/params";

/** Mesma região do Firestore (São Paulo), mantendo os dados no Brasil. */
export const REGION = "southamerica-east1";

export const APP_NAME = "SUPER APP Rolim de Moura";
export const INSTITUTION = "Prefeitura Municipal de Rolim de Moura";
export const PARTNER_NAME = "Projeto Cidades Inteligentes";
export const MAINTAINER_LINE = `Uma iniciativa da Prefeitura de Rolim de Moura junto com o ${PARTNER_NAME}`;
/** Logo do parceiro servida pelo próprio app (caminho a partir do endereço público) */
export const PARTNER_LOGO_PATH = "/parceiros/cidades-inteligentes.png";

/** Tópico FCM no qual todo dispositivo registrado é inscrito. */
export const BROADCAST_TOPIC = "comunicados";

/**
 * Endereço público do app, usado nos links de e-mail e push.
 * Em produção, defina em functions/.env.<id-do-projeto>:
 *   APP_URL=https://app.rolimdemoura.ro.gov.br
 * Sem valor padrão de propósito: o deploy pede o endereço se ele faltar.
 */
export const APP_URL = defineString("APP_URL", {
  description: "Endereço público do app (ex.: https://app.rolimdemoura.ro.gov.br)",
});

export function isEmulator(): boolean {
  return process.env.FUNCTIONS_EMULATOR === "true";
}

/** Endereço do app validado: HTTPS em produção (exigência do push na Web). */
export function appUrl(): string {
  const value = APP_URL.value().replace(/\/+$/, "");
  if (!isEmulator() && !value.startsWith("https://")) {
    throw new Error(`APP_URL inválido ("${value}"): use o endereço HTTPS do app em functions/.env.<id-do-projeto>`);
  }
  return value;
}
