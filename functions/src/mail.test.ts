import { describe, expect, it } from "vitest";
import { firstName, requestLink, statusMessage } from "./domain";
import { buildRequestMail, escapeHtml } from "./mail";

describe("buildRequestMail", () => {
  const base = {
    kind: "issues" as const,
    protocol: "ZEL-2026-ABCD2345",
    title: "Poste apagado",
    citizenName: "Maria da Silva",
    link: "https://app.exemplo.gov.br/protocolos/zeladoria/abc",
  };

  it("monta assunto com tipo, protocolo e situação", () => {
    const mail = buildRequestMail({ ...base, status: "UNDER_ANALYSIS" });
    expect(mail.subject).toBe("Zeladoria · ZEL-2026-ABCD2345 · Em análise");
    expect(mail.text).toContain("Olá, Maria!");
    expect(mail.html).toContain(base.link);
  });

  it("inclui a resposta oficial quando existe", () => {
    const mail = buildRequestMail({ ...base, status: "RESOLVED", officialResponse: "Lâmpada trocada." });
    expect(mail.text).toContain("Resposta da prefeitura:\nLâmpada trocada.");
    expect(mail.html).toContain("Resposta da prefeitura");
  });

  it("omite o bloco de resposta quando vazio", () => {
    const mail = buildRequestMail({ ...base, status: "RECEIVED", officialResponse: "   " });
    expect(mail.html).not.toContain("Resposta da prefeitura");
  });

  it("escapa conteúdo digitado pelo cidadão", () => {
    const mail = buildRequestMail({ ...base, title: "<script>alert(1)</script>", status: "RECEIVED" });
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;script&gt;");
  });
});

describe("domínio", () => {
  it("usa o primeiro nome e tolera nomes vazios", () => {
    expect(firstName("  Ana Paula Souza ")).toBe("Ana");
    expect(firstName("")).toBe("cidadão(ã)");
  });

  it("explica o indeferimento", () => {
    expect(statusMessage("REJECTED", "João").intro).toContain("não pôde ser atendida");
  });

  it("gera link para a tela do protocolo", () => {
    expect(requestLink("https://app.gov.br/", "ombudsman", "x1")).toBe("https://app.gov.br/protocolos/ouvidoria/x1");
  });

  it("escapa aspas e e-comercial", () => {
    expect(escapeHtml(`"a" & 'b'`)).toBe("&quot;a&quot; &amp; &#39;b&#39;");
  });
});
