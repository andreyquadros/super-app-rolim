import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

/** Pedaço da tela "Criar conta", baixado só quando a pessoa a abre. */
const REGISTER_CHUNK = /\/assets\/RegisterPage-[\w-]+\.js$/;

/** Conta as cargas de documento da página (a primeira é o goto do teste). */
function countLoads(page: Page): () => number {
  let loads = 0;
  page.on("load", () => (loads += 1));
  return () => loads;
}

/** Arquivo de um pedaço no build que o teste usa (dist/.vite/manifest.json). */
function builtChunk(source: string): string {
  const manifest = JSON.parse(readFileSync(new URL("../dist/.vite/manifest.json", import.meta.url), "utf8"));
  return manifest[source].file;
}

test("sair da página com um pedaço ainda baixando não volta para a página antiga", async ({ page }) => {
  // O Safari cancela os import() pendentes ao começar uma navegação de
  // documento ("Importing a module script failed"): não é versão nova
  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route(REGISTER_CHUNK, async (route) => {
    await held;
    await route.continue().catch(() => undefined);
  });

  await page.goto("/entrar");
  const requested = page.waitForRequest(REGISTER_CHUNK);
  await page.getByRole("link", { name: "Criar conta" }).click();
  await requested;

  try {
    await page.goto("/privacidade");
    await expect(page).toHaveURL(/\/privacidade$/);
    await expect(page.getByRole("heading", { name: "Privacidade e uso de dados", level: 1 })).toBeVisible();
  } finally {
    release();
  }
});

test.describe("versão nova no ar", () => {
  // Sem service worker, como na primeira visita: é quando o aparelho pede ao
  // servidor um pedaço que a versão nova já apagou
  test.use({ serviceWorkers: "block" });

  test("pedaço apagado recarrega o app uma vez e depois mostra o aviso", async ({ page }) => {
    await page.goto("/entrar");
    const html = await (await page.request.get("/")).text();
    const entry = /<script type="module" crossorigin src="([^"]+)"/.exec(html)?.[1];
    expect(entry, "script de entrada no index.html").toBeTruthy();

    // O servidor passa a ter outra versão: outro script de entrada e sem o pedaço antigo
    await page.route(REGISTER_CHUNK, (route) => route.fulfill({ status: 404, body: "" }));
    let versionChecks = 0;
    await page.route(
      (url) => url.pathname === "/",
      (route) => {
        if (route.request().resourceType() === "document") return route.continue();
        versionChecks += 1;
        return route.fulfill({ contentType: "text/html", body: html.replace(entry!, "/assets/index-versao-nova.js") });
      },
    );

    const loads = countLoads(page);
    const reloaded = page.waitForEvent("load");
    await page.getByRole("link", { name: "Criar conta" }).click();
    await reloaded;

    // Depois de recarregar o pedaço continua faltando: em vez de recarregar
    // sem parar (nem perguntar de novo ao servidor), o app explica o que houve
    await expect(page.getByText("O app foi atualizado ou você está sem internet.")).toBeVisible();
    await expect(page).toHaveURL(/\/cadastro$/);
    expect(versionChecks).toBe(1);
    expect(loads()).toBe(1);
  });
});

test.describe("rede instável", () => {
  // Sem service worker, como na primeira visita (com ele, os pedaços vêm da cópia offline)
  test.use({ serviceWorkers: "block" });

  test("pedaço que não chegou: o app oferece recarregar e volta inteiro", async ({ page, context, browserName }) => {
    // Os avisos flutuantes descem logo depois da abertura. O navegador guarda a
    // falha do módulo, então tentar o import() de novo não adianta
    const chunk = builtChunk("node_modules/@mantine/notifications/esm/index.mjs");
    let requests = 0;
    await context.route(`**/${chunk}`, (route) => (++requests === 1 ? route.fulfill({ status: 503, body: "" }) : route.continue()));
    const notifications = (target: Page) => target.locator('.mantine-Notifications-root[data-position="bottom-center"]');

    await page.goto("/");
    const notice = page.getByRole("status").filter({ hasText: "Uma parte do app não carregou." });
    await expect(notice).toBeVisible();
    await expect(notifications(page)).not.toBeAttached();
    await notice.getByRole("button", { name: "Recarregar" }).click();

    if (browserName !== "webkit") {
      await expect(notifications(page)).toBeAttached();
      await expect(notice).toBeHidden();
      expect(requests).toBe(2);
      return;
    }
    // O Safari guarda o pedaço que veio com erro mesmo depois de recarregar
    // (só um processo novo o baixa de novo): o aviso pede para fechar e abrir
    await expect(page.getByRole("status").filter({ hasText: "Feche e abra o app de novo." })).toBeVisible();
    expect(requests).toBe(1);
    const reopened = await context.newPage();
    await reopened.goto("/");
    await expect(notifications(reopened)).toBeAttached();
    expect(requests).toBe(2);
  });
});
