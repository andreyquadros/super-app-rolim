import { expect, test, type Page } from "@playwright/test";
import { signIn, waitForScreen } from "./helpers";

// Varredura visual: cada tela em 5 larguras e nos dois temas, sem rolagem
// lateral. As capturas ficam anexadas ao relatório para revisão humana
// (os dados de demonstração mudam com o tempo, então não comparamos pixels).

const WIDTHS = [320, 375, 768, 1024, 1440] as const;
const PUBLIC = ["/", "/plantao/farmacias", "/plantao/funerarias", "/comunicados", "/entrar"];
const CITIZEN = ["/protocolos", "/perfil"];

async function checkPage(page: Page, path: string, label: string) {
  await page.goto(path);
  await expect(page.locator("main h1, main [role=heading][aria-level='1']").first()).toBeVisible();
  await waitForScreen(page);
  await page.waitForTimeout(400);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `rolagem lateral em ${path} (${label})`).toBeLessThanOrEqual(0);
  await test.info().attach(`${label} ${path}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`visual (${scheme === "light" ? "claro" : "escuro"})`, () => {
    test.use({ colorScheme: scheme });

    for (const width of WIDTHS) {
      test(`${width}px sem rolagem lateral`, async ({ page }) => {
        await page.setViewportSize({ width, height: width < 768 ? 740 : 900 });
        for (const path of PUBLIC) await checkPage(page, path, `${width}px ${scheme}`);
        await signIn(page, "cidadao@rolim.test", "/protocolos");
        for (const path of CITIZEN) await checkPage(page, path, `${width}px ${scheme}`);
      });
    }
  });
}

test("apresentação cabe em 320px com texto muito grande", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.addInitScript(() => localStorage.setItem("rolim.textSize", "muito-grande"));
  await page.goto("/boas-vindas?rever=1");
  await expect(page.getByRole("button", { name: "Pular" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
