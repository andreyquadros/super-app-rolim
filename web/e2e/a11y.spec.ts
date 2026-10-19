import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { signIn, waitForSettled } from "./helpers";

const PUBLIC_PAGES = ["/", "/plantao/farmacias", "/plantao/funerarias", "/comunicados", "/entrar", "/cadastro", "/privacidade"];
const CITIZEN_PAGES = ["/protocolos", "/perfil", "/perfil/dados", "/zeladoria/nova", "/ouvidoria/nova"];

async function expectNoViolations(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("main h1, main [role=heading][aria-level='1']").first()).toBeVisible();
  // O axe mede o contraste do estado final: dados na tela e entradas concluídas
  await waitForSettled(page);
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
      await signIn(page, "cidadao@rolim.test", "/protocolos");
      for (const path of CITIZEN_PAGES) await expectNoViolations(page, path);
    });
  });
}
