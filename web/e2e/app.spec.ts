import { expect, test } from "@playwright/test";
import { signIn, TEST_PASSWORD } from "./helpers";

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

test("CPF de outra conta: o aviso fica na tela e nada some sem explicação", async ({ page }) => {
  const conflict = page.getByRole("alert").filter({ hasText: "Este CPF pode já estar ligado a outra conta" });

  // Cadastro por e-mail com o CPF de outra conta: a conta nasce, o cadastro não
  await page.goto("/cadastro");
  await page.getByLabel("Nome completo").fill("Pessoa do Teste de Conflito");
  await page.getByLabel("CPF").fill(SEEDED_CPF);
  await page.getByLabel("Celular").fill("69999990077");
  await page.getByLabel("E-mail").fill(`conflito-${Date.now()}@rolim.test`);
  await page.getByLabel("Senha").fill(TEST_PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.waitForURL((url) => url.pathname === "/completar-cadastro");
  await expect(conflict).toBeVisible();

  // De novo pela tela de completar (o caminho de quem entra com Google): o
  // cadastro local desfeito pelo servidor não pode levar à Início
  const save = page.getByRole("button", { name: "Salvar e continuar" });
  await page.getByRole("checkbox").check();
  // O aviso anterior já está na tela: espera o envio começar (botão em
  // "carregando") e terminar antes de conferir que ficou tudo no lugar
  const sentToServer = page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const observer = new MutationObserver(() => {
          if (!document.querySelector("button[data-loading]")) return;
          observer.disconnect();
          resolve();
        });
        observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ["data-loading"] });
      }),
  );
  await save.click();
  await sentToServer;
  await expect(save).not.toHaveAttribute("data-loading");
  await expect(conflict).toBeVisible();
  await expect(page).toHaveURL(/\/completar-cadastro/);

  // Com um CPF livre o cadastro é salvo e continua salvo depois de recarregar
  await page.getByLabel("CPF").fill(freshCpf());
  await page.getByRole("button", { name: "Salvar e continuar" }).click();
  await page.waitForURL((url) => url.pathname === "/");
  await page.goto("/completar-cadastro");
  await page.waitForURL((url) => url.pathname === "/");
});
