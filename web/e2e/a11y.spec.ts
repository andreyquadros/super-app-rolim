import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const TEST_PASSWORD = process.env.E2E_PASSWORD ?? "rolim-dev-2026";

const PUBLIC_PAGES = ["/", "/plantao/farmacias", "/plantao/funerarias", "/comunicados", "/entrar", "/cadastro", "/privacidade"];
const CITIZEN_PAGES = ["/protocolos", "/perfil", "/perfil/dados", "/zeladoria/nova", "/ouvidoria/nova"];

async function expectNoViolations(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("main h1, main [role=heading][aria-level='1']").first()).toBeVisible();
  // Espera as entradas animadas terminarem (o axe mede contraste do estado final)
  await page.waitForTimeout(600);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude(".leaflet-container")
    .analyze();
  const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  expect(summary, `${path}`).toEqual([]);
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`acessibilidade (${scheme === "light" ? "claro" : "escuro"})`, () => {
    test.use({ colorScheme: scheme });

    test("telas públicas sem violações", async ({ page }) => {
      for (const path of PUBLIC_PAGES) await expectNoViolations(page, path);
    });

    test("telas do cidadão sem violações", async ({ page }) => {
      await page.goto("/entrar?next=%2Fprotocolos");
      await page.getByLabel("E-mail").fill("cidadao@rolim.test");
      await page.getByLabel("Senha").fill(TEST_PASSWORD);
      await page.getByRole("button", { name: "Entrar", exact: true }).click();
      await page.waitForURL((url) => url.pathname === "/protocolos");
      for (const path of CITIZEN_PAGES) await expectNoViolations(page, path);
    });
  });
}
