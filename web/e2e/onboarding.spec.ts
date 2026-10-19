import { expect, test, type Page } from "@playwright/test";

// Primeiro acesso de verdade: sem o estado "já conhece o app" do playwright.config.ts
test.use({ storageState: { cookies: [], origins: [] } });

const WELCOME = "Bem-vindo ao SUPER APP Rolim de Moura";
const SLIDE_TITLES = [WELCOME, "Viu um problema na rua? Avise.", "Acompanhe cada passo", "Farmácia e funerária de plantão", "Deixe do seu jeito"];

const atHome = (url: URL) => url.pathname === "/";

async function expectHome(page: Page) {
  await page.waitForURL(atHome);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: WELCOME })).toHaveCount(0);
}

/** Aperta Tab até o botão com esse texto receber o foco. */
async function tabTo(page: Page, label: string, maxPresses = 15) {
  for (let i = 0; i < maxPresses; i++) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
    if (focused === label) return;
  }
  throw new Error(`"${label}" não recebeu o foco pelo Tab`);
}

test("primeiro acesso pela Início mostra a apresentação", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL((url) => url.pathname === "/boas-vindas");
  await expect(page.getByRole("heading", { name: WELCOME })).toBeVisible();
  await expect(page.getByText("Uma iniciativa da Prefeitura de Rolim de Moura junto com o Projeto Cidades Inteligentes")).toBeVisible();
});

test("Pular leva à Início e recarregar não mostra de novo", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL((url) => url.pathname === "/boas-vindas");
  await page.getByRole("button", { name: "Pular" }).click();
  await expectHome(page);

  await page.reload();
  await expectHome(page);
});

test("voltar à Início na mesma sessão não mostra de novo, mesmo sem concluir", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL((url) => url.pathname === "/boas-vindas");
  await page.goto("/");
  await expectHome(page);
});

test("links diretos nunca são interceptados", async ({ page }) => {
  await page.goto("/plantao/funerarias");
  await expect(page.getByRole("heading", { name: "Funerárias de plantão", level: 1 })).toBeVisible();
  await expect(page).not.toHaveURL(/boas-vindas/);

  // Mesma sessão: a entrada foi um link direto, então a Início também não mostra
  await page.goto("/");
  await expectHome(page);
});

test("link direto de um pedido não mostra a apresentação", async ({ page }) => {
  await page.goto("/protocolos/zeladoria/x");
  // Sem login, o guarda leva para Entrar (e volta ao pedido depois)
  await page.waitForURL((url) => url.pathname === "/entrar");
  await expect(page).not.toHaveURL(/boas-vindas/);
  await expect(page.getByRole("heading", { name: WELCOME })).toHaveCount(0);
});

test("/?intro=0 vai direto para a Início e não volta a mostrar", async ({ page, context }) => {
  await page.goto("/?intro=0");
  await expectHome(page);
  expect(new URL(page.url()).search).toBe("");

  // Outra aba (sessão nova) também não mostra: a escolha ficou gravada
  const other = await context.newPage();
  await other.goto("/");
  await expectHome(other);
});

test("Tab e Enter percorrem toda a apresentação", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL((url) => url.pathname === "/boas-vindas");
  await expect(page.getByRole("heading", { name: WELCOME })).toBeVisible();

  // "Pular" é o primeiro item do Tab
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Pular" })).toBeFocused();

  for (let i = 1; i < SLIDE_TITLES.length; i++) {
    await tabTo(page, "Próximo");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: SLIDE_TITLES[i] })).toBeFocused();
    await expect(page.getByText(`Passo ${i + 1} de ${SLIDE_TITLES.length}`)).toBeAttached();
  }

  await tabTo(page, "Começar a usar");
  await page.keyboard.press("Enter");
  await expectHome(page);
});

test("setas trocam de slide e Esc equivale a Pular", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL((url) => url.pathname === "/boas-vindas");
  await expect(page.getByRole("heading", { name: WELCOME })).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("heading", { name: SLIDE_TITLES[1] })).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("heading", { name: WELCOME })).toBeFocused();

  await page.keyboard.press("Escape");
  await expectHome(page);
});
