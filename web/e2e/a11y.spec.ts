import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { answerTourOffer, pendingTour, signIn, TOUR_OFFER_TITLE, tourCard, waitForSettled, waitForTourStep } from "./helpers";

const PUBLIC_PAGES = ["/", "/plantao/farmacias", "/plantao/funerarias", "/comunicados", "/entrar", "/cadastro", "/privacidade"];
const CITIZEN_PAGES = ["/protocolos", "/perfil", "/perfil/dados", "/zeladoria/nova", "/ouvidoria/nova"];

async function violations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude(".leaflet-container")
    .analyze();
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

async function expectNoViolations(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("main h1, main [role=heading][aria-level='1']").first()).toBeVisible();
  // O axe mede o contraste do estado final: dados na tela e entradas concluídas
  await waitForSettled(page);
  expect(await violations(page), `${path}`).toEqual([]);
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

    test("passeio: oferta e passos 1, 2 e 5 sem violações", async ({ page }) => {
      await pendingTour(page);
      await page.goto("/");
      await expect(page.getByRole("dialog", { name: TOUR_OFFER_TITLE })).toBeVisible();
      await waitForSettled(page);
      expect(await violations(page), "oferta").toEqual([]);

      await answerTourOffer(page, "Mostrar o passeio");
      const next = tourCard(page).getByRole("button", { name: "Próximo", exact: true });
      for (let step = 1; step <= 5; step++) {
        if (step > 1) await next.click();
        await waitForTourStep(page, step);
        if (step === 1 || step === 2 || step === 5) expect(await violations(page), `passo ${step}`).toEqual([]);
      }
    });
  });
}
