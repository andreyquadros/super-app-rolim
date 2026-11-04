import { describe, expect, it } from "vitest";
import {
  STEP_COUNT,
  STEP_IDS,
  stepContent,
  stepLabel,
  toAccountVariant,
  toDutyVariant,
  type AccountVariant,
  type DutyVariant,
  type NavVariant,
  type StepContext,
} from "./tourSteps";

const NAVS: NavVariant[] = ["barra", "menu"];
const ACCOUNTS: AccountVariant[] = ["anon", "user", "carregando"];
const DUTIES: DutyVariant[] = ["ok", "sem-ligar", "carregando", "erro"];

const CONTEXTS: StepContext[] = NAVS.flatMap((nav) =>
  ACCOUNTS.flatMap((account) => DUTIES.map((duty) => ({ nav, account, duty }))),
);

const LIMITS = { title: 36, text: 115, short: 60, note: 80 };
/** Palavras que dizem onde a coisa fica, para quem não vê o destaque */
const PLACE_WORDS = /\b(barra|menu|alto|pé|baixo|meio|esquerda)\b/i;

describe("tourSteps", () => {
  it("são sempre 5 passos, na mesma ordem", () => {
    expect(STEP_COUNT).toBe(5);
    expect(STEP_IDS).toEqual(["servicos", "plantao", "solicitar", "abas", "conta"]);
    // O conteúdo segue a mesma ordem: serviços e plantão primeiro
    for (const ctx of CONTEXTS) {
      expect([0, 1].map((i) => stepContent(i, ctx).title)).toEqual(["Os serviços ficam aqui", "De plantão agora"]);
    }
  });

  it("o contador diz Passo N de 5", () => {
    expect(stepLabel(0)).toBe("Passo 1 de 5");
    expect(stepLabel(4)).toBe("Passo 5 de 5");
  });

  it("todas as combinações respeitam os limites e usam 'toque', nunca 'clique'", () => {
    for (const ctx of CONTEXTS) {
      STEP_IDS.forEach((id, i) => {
        const step = stepContent(i, ctx);
        const where = `${id} ${JSON.stringify(ctx)}`;
        expect(step.title.length, where).toBeLessThanOrEqual(LIMITS.title);
        expect(step.text.length, where).toBeLessThanOrEqual(LIMITS.text);
        expect(step.short.length, where).toBeLessThanOrEqual(LIMITS.short);
        expect((step.note ?? "").length, where).toBeLessThanOrEqual(LIMITS.note);
        const all = [step.title, step.text, step.short, step.note ?? ""].join(" ");
        expect(all, where).not.toMatch(/clique|clicar/i);
        expect(step.title.trim(), where).not.toBe("");
        expect(step.text.trim(), where).not.toBe("");
        expect(step.short.trim(), where).not.toBe("");
      });
    }
  });

  it("os passos 3 a 5 dizem onde a coisa fica, no texto e no texto curto", () => {
    for (const ctx of CONTEXTS) {
      for (const i of [2, 3, 4]) {
        const step = stepContent(i, ctx);
        const where = `${STEP_IDS[i]} ${JSON.stringify(ctx)}`;
        expect(`${step.title} ${step.text}`, where).toMatch(PLACE_WORDS);
        expect(`${step.title} ${step.short}`, where).toMatch(PLACE_WORDS);
      }
    }
  });

  it("só Solicitar e Conta sem login pulsam; o plantão nunca", () => {
    for (const ctx of CONTEXTS) {
      const pulses = STEP_IDS.map((_, i) => stepContent(i, ctx).pulse);
      expect(pulses, JSON.stringify(ctx)).toEqual([false, false, true, false, ctx.account === "anon"]);
    }
  });

  it("o último passo usa Concluir e a nota cita “Como usar o app”", () => {
    for (const ctx of CONTEXTS) {
      STEP_IDS.forEach((_, i) => {
        const step = stepContent(i, ctx);
        expect(step.primary).toBe(i === STEP_COUNT - 1 ? "Concluir" : "Próximo");
        if (i < STEP_COUNT - 1) expect(step.note).toBeNull();
      });
      expect(stepContent(STEP_COUNT - 1, ctx).note).toContain("“Como usar o app”");
    }
    expect(stepContent(4, { nav: "barra", account: "user", duty: "ok" }).note).toContain("Perfil › Ajuda");
    expect(stepContent(4, { nav: "barra", account: "anon", duty: "ok" }).note).not.toContain("Perfil");
  });

  it("sem conta, o passo 3 avisa que enviar pede conta", () => {
    const anon = stepContent(2, { nav: "barra", account: "anon", duty: "ok" });
    const user = stepContent(2, { nav: "menu", account: "user", duty: "ok" });
    expect(anon.text).toContain("Para enviar, é preciso entrar na conta.");
    expect(user.text).toContain("Ele aparece em todas as telas.");
    expect(user.text).toContain("no alto do menu verde");
  });

  it("o passo 2 acompanha o estado do cartão de plantão", () => {
    const text = (duty: DutyVariant) => stepContent(1, { nav: "barra", account: "anon", duty }).text;
    expect(text("ok")).toContain("“Ligar” chama direto");
    expect(text("sem-ligar")).toContain("Toque no nome");
    expect(text("erro")).toContain("“Tentar de novo”");
    expect(stepContent(1, { nav: "menu", account: "user", duty: "ok" }).title).toBe("De plantão agora");
  });

  it("o passo 5 aponta Entrar, o perfil ou a conta carregando", () => {
    const title = (account: AccountVariant) => stepContent(4, { nav: "barra", account, duty: "ok" }).title;
    expect(title("anon")).toBe("Entre quando quiser");
    expect(title("user")).toBe("Seu perfil fica aqui");
    expect(title("carregando")).toBe("Sua conta fica aqui");
  });

  it("traduz o data-tour-state e o login em variantes", () => {
    expect(toDutyVariant("ok", true)).toBe("ok");
    expect(toDutyVariant("sem-ligar", false)).toBe("sem-ligar");
    expect(toDutyVariant("erro", false)).toBe("erro");
    expect(toDutyVariant("carregando", false)).toBe("carregando");
    // Sem o atributo: decide pelos "Ligar" na tela
    expect(toDutyVariant(null, true)).toBe("ok");
    expect(toDutyVariant(undefined, false)).toBe("carregando");
    expect(toDutyVariant("outra-coisa", false)).toBe("carregando");

    expect(toAccountVariant({ loading: true, signedIn: false })).toBe("carregando");
    expect(toAccountVariant({ loading: false, signedIn: true })).toBe("user");
    expect(toAccountVariant({ loading: false, signedIn: false })).toBe("anon");
  });
});
