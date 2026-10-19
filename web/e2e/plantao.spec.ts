import { expect, test } from "@playwright/test";

test("funerárias de plantão aparecem sem login, com telefone para ligar", async ({ page }) => {
  await page.goto("/plantao/funerarias");
  await expect(page.getByRole("heading", { name: "Funerárias de plantão", level: 1 })).toBeVisible();
  await expect(page.getByText("Funerária Exemplo Central")).toBeVisible();
  await expect(page.getByText("De plantão", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Ligar para Funerária Exemplo Central" })).toHaveAttribute("href", /^tel:\d+$/);
});

test("o seletor troca entre farmácias e funerárias", async ({ page }) => {
  await page.goto("/plantao/farmacias");
  await expect(page.getByText("Farmácia Exemplo Centro")).toBeVisible();
  await page.getByRole("link", { name: "Funerárias", exact: true }).click();
  await expect(page).toHaveURL(/\/plantao\/funerarias$/);
  await expect(page.getByRole("heading", { name: "Funerárias de plantão", level: 1 })).toBeVisible();
  // "Todas" mostra também as que não estão de plantão
  await page.getByRole("button", { name: /^Todas/ }).click();
  await expect(page.getByText("Funerária Exemplo Paz")).toBeVisible();
});

test("endereços antigos e a aba Plantão levam à lista certa", async ({ page }) => {
  await page.goto("/funerarias");
  await expect(page).toHaveURL(/\/plantao\/funerarias$/);
  await page.goto("/farmacias");
  await expect(page).toHaveURL(/\/plantao\/farmacias$/);
  await page.goto("/plantao/inexistente");
  await expect(page.getByText("Página não encontrada").first()).toBeVisible();
});

test("responsável liga e desliga o plantão, com opção de desfazer", async ({ page }) => {
  const password = process.env.E2E_PASSWORD ?? "rolim-dev-2026";
  await page.goto(`/entrar?next=${encodeURIComponent("/painel/meus-plantoes")}`);
  await page.getByLabel("E-mail").fill("plantao@rolim.test");
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/painel/meus-plantoes");

  const duty = page.getByRole("switch", { name: /De plantão/ }).first();
  await expect(duty).toBeChecked();
  await duty.click({ force: true });
  await expect(duty).not.toBeChecked();
  await expect(page.getByText(/^Plantão desligado\./)).toBeVisible();
  await page.getByRole("button", { name: "Desfazer" }).click();
  await expect(duty).toBeChecked();
});
