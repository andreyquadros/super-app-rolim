import { expect, test, type Page } from "@playwright/test";
import { addGoogleAccount, openGooglePopup, pickGoogleAccount, TEST_PASSWORD, waitForScreen } from "./helpers";

// Mesma pessoa com conta de e-mail e senha e com Google (Auth Emulator).
// A regra "1 CPF = 1 conta" continua: o Google passa a abrir a conta que tem o CPF.

/** CPF da cidadã criada por scripts/seed-emulator.mjs (já reservado). */
const SEEDED_CPF = "12345678909";

/** CPF válido e novo a cada execução (dígitos verificadores calculados). */
function freshCpf(): string {
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  for (const len of [9, 10]) {
    const sum = digits.slice(0, len).reduce((acc, d, i) => acc + d * (len + 1 - i), 0);
    digits.push(((sum * 10) % 11) % 10);
  }
  return digits.join("");
}

const unique = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

/** Conta nova por e-mail e senha, com cadastro (CPF livre). */
async function createEmailAccount(page: Page, fullName: string): Promise<void> {
  await page.goto("/cadastro");
  await page.getByLabel("Nome completo").fill(fullName);
  await page.getByLabel("CPF").fill(freshCpf());
  await page.getByLabel("Celular").fill("69999990088");
  await page.getByLabel("E-mail").fill(`${unique("email")}@rolim.test`);
  await page.getByLabel("Senha").fill(TEST_PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.waitForURL((url) => url.pathname === "/");
  await waitForScreen(page);
}

/**
 * Entra com o Google pela tela Entrar (conta nova ou já existente no emulador)
 * a caminho de Meus pedidos: quem não tem cadastro para em Completar cadastro.
 */
async function signInWithGoogle(page: Page, email: string, { create }: { create: boolean }): Promise<void> {
  await page.goto("/entrar?next=%2Fprotocolos");
  const popup = await openGooglePopup(page, () => page.getByRole("button", { name: "Entrar com Google" }).click());
  if (create) await addGoogleAccount(popup, email, "Pessoa do Google");
  else await pickGoogleAccount(popup, email);
}

async function signOutFromProfile(page: Page): Promise<void> {
  await page.goto("/perfil");
  await page.getByRole("button", { name: /^Sair/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Sair", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/");
  await waitForScreen(page);
}

async function linkGoogleFromProfile(page: Page, google: string, { create }: { create: boolean }): Promise<void> {
  await page.goto("/perfil");
  const popup = await openGooglePopup(page, () => page.getByRole("button", { name: /Usar também o Google para entrar/ }).click());
  if (create) await addGoogleAccount(popup, google, "Pessoa do Google");
  else await pickGoogleAccount(popup, google);
}

test("CPF de outra conta depois do Google: “Entrar com a outra conta” leva ao Entrar e ao destino", async ({ page }) => {
  await page.goto("/entrar?next=%2Fprotocolos");
  const popup = await openGooglePopup(page, () => page.getByRole("button", { name: "Entrar com Google" }).click());
  await addGoogleAccount(popup, `${unique("google-cpf")}@gmail.test`, "Maria da Silva Souza");
  await page.waitForURL((url) => url.pathname === "/completar-cadastro");

  await page.getByLabel("CPF").fill(SEEDED_CPF);
  await page.getByLabel("Celular").fill("69999990001");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Salvar e continuar" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Este CPF pode já estar ligado a outra conta" })).toBeVisible();
  await expect(page.getByText("Usar também o Google para entrar")).toBeVisible();

  // Sai do Google e abre o Entrar com o mesmo destino
  await page.getByRole("button", { name: "Entrar com a outra conta" }).click();
  await page.waitForURL((url) => url.pathname === "/entrar" && url.searchParams.get("next") === "/protocolos");
  await expect(page.getByRole("button", { name: "Entrar com Google" })).toBeVisible();

  await page.getByLabel("E-mail").fill("cidadao@rolim.test");
  await page.getByLabel("Senha").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/protocolos");
});

test("conta de e-mail liga o Google no Perfil e depois entra por ele", async ({ page }) => {
  const google = `${unique("ligar")}@gmail.test`;
  await createEmailAccount(page, "Pessoa Que Liga o Google");

  await linkGoogleFromProfile(page, google, { create: true });
  await expect(page.getByText(`Ligado: ${google}`)).toBeVisible();
  await expect(page.getByRole("button", { name: /Usar também o Google para entrar/ })).toHaveCount(0);

  await signOutFromProfile(page);
  await signInWithGoogle(page, google, { create: false });
  await page.waitForURL((url) => url.pathname === "/protocolos");
  await page.goto("/perfil");
  await expect(page.getByRole("heading", { name: "Pessoa Que Liga o Google" })).toBeVisible();
  await expect(page.getByText(`Ligado: ${google}`)).toBeVisible();
});

test("Google que já entrou sozinho, sem cadastro: juntar apaga essa entrada e liga à conta de e-mail", async ({ page }) => {
  const google = `${unique("sozinho")}@gmail.test`;
  // Entrou com o Google e não terminou o cadastro
  await signInWithGoogle(page, google, { create: true });
  await page.waitForURL((url) => url.pathname === "/completar-cadastro");
  // Só com o Google: o Perfil não oferece ligar o Google
  await page.goto("/perfil");
  await expect(page.getByRole("heading", { name: "Pessoa do Google" })).toBeVisible();
  await expect(page.getByText("Formas de entrar")).toHaveCount(0);
  await page.goto("/completar-cadastro");
  await page.getByRole("button", { name: "Usar outra conta" }).click();
  await page.waitForURL((url) => url.pathname === "/entrar");

  await createEmailAccount(page, "Pessoa Com Duas Entradas");
  await linkGoogleFromProfile(page, google, { create: false });
  const sheet = page.getByRole("dialog", { name: "Juntar com sua entrada pelo Google" });
  await expect(sheet).toContainText(google);
  await sheet.getByRole("button", { name: "Apagar e usar o Google aqui" }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByText(`Ligado: ${google}`)).toBeVisible();

  // O Google agora abre a conta com cadastro (não pede CPF de novo)
  await signOutFromProfile(page);
  await signInWithGoogle(page, google, { create: false });
  await page.waitForURL((url) => url.pathname === "/protocolos");
  await page.goto("/perfil");
  await expect(page.getByRole("heading", { name: "Pessoa Com Duas Entradas" })).toBeVisible();
});

test("Google com cadastro próprio não é apagado ao tentar ligar", async ({ page }) => {
  const google = `${unique("com-cadastro")}@gmail.test`;
  await signInWithGoogle(page, google, { create: true });
  await page.waitForURL((url) => url.pathname === "/completar-cadastro");
  await page.getByLabel("CPF").fill(freshCpf());
  await page.getByLabel("Celular").fill("69999990099");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Salvar e continuar" }).click();
  await page.waitForURL((url) => url.pathname === "/protocolos");
  await signOutFromProfile(page);

  await createEmailAccount(page, "Pessoa de Outra Conta");
  await linkGoogleFromProfile(page, google, { create: false });
  const sheet = page.getByRole("dialog", { name: "Este Google já tem outra conta" });
  await expect(sheet).toContainText(google);
  await expect(sheet.getByRole("button", { name: /Apagar/ })).toHaveCount(0);
  await sheet.getByRole("button", { name: "Entendi" }).click();
  await expect(page.getByRole("button", { name: /Usar também o Google para entrar/ })).toBeVisible();

  // A conta do Google continua com o próprio cadastro
  await signOutFromProfile(page);
  await signInWithGoogle(page, google, { create: false });
  await page.waitForURL((url) => url.pathname === "/protocolos");
  await page.goto("/perfil");
  await expect(page.getByRole("heading", { name: "Pessoa do Google" })).toBeVisible();
});
