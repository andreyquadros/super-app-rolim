import { expect, test, type Page } from "@playwright/test";

/** Senha das contas criadas por scripts/seed-emulator.mjs (só existem no emulador). */
const TEST_PASSWORD = process.env.E2E_PASSWORD ?? "rolim-dev-2026";

async function signIn(page: Page, email: string, next: string) {
  await page.goto(`/entrar?next=${encodeURIComponent(next)}`);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((url) => url.pathname === next);
}

test("início mostra os serviços e dados públicos ao vivo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /Zeladoria/ })).toBeVisible();
  await expect(page.getByText(/de plantão agora/i).first()).toBeVisible();
  await expect(page.getByText("Campanha de vacinação neste sábado")).toBeVisible();
});

test("PWA instalável: manifesto, service worker e abertura sem internet", async ({ page, context }) => {
  await page.goto("/");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).toBeTruthy();
  const manifest = await (await page.request.get(href!)).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.lang).toBe("pt-BR");
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);

  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  // Sem rede, o service worker entrega o app a partir do cache
  await context.setOffline(true);
  await page.goto("/farmacias");
  await expect(page.getByRole("heading", { name: "Farmácias", level: 1 })).toBeVisible();
  await context.setOffline(false);
});

test("avisa quando a conexão cai e some quando volta", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await context.setOffline(true);
  await expect(page.getByText(/Sem internet/)).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText(/Sem internet/)).toHaveCount(0);
});

test("farmácias de plantão aparecem sem login", async ({ page }) => {
  await page.goto("/farmacias");
  await expect(page.getByText("Farmácia Exemplo Centro")).toBeVisible();
  await expect(page.getByText("De plantão", { exact: true }).first()).toBeVisible();
});

test("cidadão entra e acompanha seus protocolos", async ({ page }) => {
  await signIn(page, "cidadao@rolim.test", "/protocolos");
  await page.getByText("Todos", { exact: true }).click();
  await expect(page.getByText("ZEL-2026-K7Q2MX9P")).toBeVisible();
  await page.getByText("Poste apagado em frente à escola", { exact: true }).click();
  await expect(page.getByText("Equipe de iluminação agendada para esta semana.")).toBeVisible();
});

test("área da prefeitura é bloqueada para quem não é da equipe", async ({ page }) => {
  await signIn(page, "cidadao@rolim.test", "/");
  await page.goto("/painel/inicio");
  await expect(page.getByText("Acesso restrito")).toBeVisible();
});

test("servidora vê só a ouvidoria das unidades atribuídas", async ({ page }) => {
  await signIn(page, "servidor@rolim.test", "/painel/ouvidoria");
  await page.getByText("Todas", { exact: true }).click();
  await expect(page.getByText("Atendimento excelente na recepção")).toBeVisible();
  await expect(page.getByText("Demora para marcar consulta")).toHaveCount(0);
});

test("servidora responde a zeladoria e a cidadã vê a resposta", async ({ page }) => {
  const response = `Equipe agendada (teste ${Date.now()})`;
  await signIn(page, "servidor@rolim.test", "/painel/zeladoria");
  await page.getByText("Buraco grande no asfalto").first().click();
  await page.getByLabel("Resposta ao cidadão").fill(response);
  await page.getByLabel("Observação interna").fill("Prioridade média");
  await page.getByRole("button", { name: "Confirmar: Em análise" }).click();
  await expect(page.getByText(/Situação alterada para/)).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Menu do usuário" }).click();
  await page.getByRole("menuitem", { name: "Sair" }).click();
  await page.waitForURL((url) => url.pathname === "/");

  await signIn(page, "cidadao@rolim.test", "/protocolos");
  await page.getByText("Buraco grande no asfalto").click();
  await expect(page.getByText(response)).toBeVisible();
  await expect(page.getByText("Prioridade média")).toHaveCount(0);
});
