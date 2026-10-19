import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { APP_NAME, INSTITUTION, MAINTAINER_LINE, PARTNER_LOGO_PATH } from "./config";
import { KIND_LABEL, STATUS_LABEL, statusMessage, type RequestKind, type RequestStatus } from "./domain";

export interface MailMessage {
  subject: string;
  text: string;
  html: string;
}

export interface RequestMailInput {
  kind: RequestKind;
  protocol: string;
  title: string;
  citizenName: string;
  status: RequestStatus;
  officialResponse?: string | null;
  link: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** E-mail enviado ao cidadão quando a solicitação é aberta ou muda de status. */
/** A logo do parceiro vem do mesmo endereço do app (o link do pedido). */
function partnerLogoUrl(link: string): string | null {
  try {
    return new URL(PARTNER_LOGO_PATH, link).toString();
  } catch {
    return null;
  }
}

export function buildRequestMail(input: RequestMailInput): MailMessage {
  const kindLabel = KIND_LABEL[input.kind];
  const statusLabel = STATUS_LABEL[input.status];
  const message = statusMessage(input.status, input.citizenName);
  const response = input.officialResponse?.trim() || null;

  const subject = `${kindLabel} · ${input.protocol} · ${statusLabel}`;

  const text = [
    message.intro,
    "",
    `Protocolo: ${input.protocol}`,
    `Assunto: ${input.title}`,
    `Situação: ${statusLabel}`,
    ...(response ? ["", "Resposta da prefeitura:", response] : []),
    "",
    message.closing,
    `Acompanhe pelo aplicativo: ${input.link}`,
    "",
    "Atenciosamente,",
    INSTITUTION,
    "",
    `${APP_NAME} · ${MAINTAINER_LINE}`,
  ].join("\n");

  const responseBlock = response
    ? `<tr><td style="padding:16px 24px 0">
         <div style="border-left:4px solid #e39f00;background:#fff9e1;padding:12px 16px;border-radius:4px">
           <div style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#7a5600;margin-bottom:4px">Resposta da prefeitura</div>
           <div style="white-space:pre-line">${escapeHtml(response)}</div>
         </div>
       </td></tr>`
    : "";

  const partnerLogo = partnerLogoUrl(input.link);
  const html = `<!doctype html>
<html lang="pt-BR"><body style="margin:0;background:#f3f5f2;font-family:Arial,Helvetica,sans-serif;color:#1d2a22">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
  <tr><td style="background:#0d7a49;color:#ffffff;padding:20px 24px">
    <div style="font-size:12px;letter-spacing:.14em;font-weight:bold;opacity:.9">${escapeHtml(APP_NAME.toUpperCase())}</div>
    <div style="font-size:20px;font-weight:bold;margin-top:4px">${escapeHtml(kindLabel)} · ${escapeHtml(statusLabel)}</div>
  </td></tr>
  <tr><td style="padding:24px 24px 0;font-size:16px;line-height:1.5">${escapeHtml(message.intro)}</td></tr>
  <tr><td style="padding:16px 24px 0">
    <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.6">
      <tr><td style="color:#5b6b61;padding-right:12px">Protocolo</td><td style="font-family:monospace;font-weight:bold">${escapeHtml(input.protocol)}</td></tr>
      <tr><td style="color:#5b6b61;padding-right:12px">Assunto</td><td>${escapeHtml(input.title)}</td></tr>
      <tr><td style="color:#5b6b61;padding-right:12px">Situação</td><td>${escapeHtml(statusLabel)}</td></tr>
    </table>
  </td></tr>
  ${responseBlock}
  <tr><td style="padding:16px 24px 0;font-size:14px;line-height:1.5;color:#3b4a41">${escapeHtml(message.closing)}</td></tr>
  <tr><td style="padding:20px 24px 24px">
    <a href="${escapeHtml(input.link)}" style="display:inline-block;background:#0d7a49;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold">Acompanhar no aplicativo</a>
  </td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin-top:12px"><tr>
  ${partnerLogo ? `<td style="padding-right:10px;vertical-align:middle"><img src="${escapeHtml(partnerLogo)}" width="32" height="32" alt="" style="display:block;border:0"></td>` : ""}
  <td style="font-size:12px;color:#5b6b61;vertical-align:middle">${escapeHtml(MAINTAINER_LINE)} · Mensagem automática, não responda este e-mail.</td>
</tr></table>
</td></tr></table>
</body></html>`;

  return { subject, text, html };
}

const ALREADY_EXISTS = 6;

/**
 * Enfileira o e-mail na coleção "mail", lida pela extensão oficial
 * "Trigger Email from Firestore" (firebase/firestore-send-email).
 * O id vem do evento que gerou o e-mail: se o gatilho rodar duas vezes,
 * o segundo create falha e o cidadão não recebe a mensagem repetida.
 */
export async function queueMail(db: Firestore, id: string, to: string, message: MailMessage): Promise<void> {
  try {
    await db.collection("mail").doc(id).create({
      to,
      message,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    if ((error as { code?: number }).code !== ALREADY_EXISTS) throw error;
  }
}
