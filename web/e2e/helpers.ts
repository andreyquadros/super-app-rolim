import type { Page } from "@playwright/test";

/** Senha das contas criadas por scripts/seed-emulator.mjs (só existem no emulador). */
export const TEST_PASSWORD = process.env.E2E_PASSWORD ?? "rolim-dev-2026";

/**
 * Espera a transição de tela terminar: durante ela o navegador não entrega
 * toques à página e o WebKit interrompe uma navegação nova.
 */
export async function waitForScreen(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    try {
      return !document.documentElement.matches(":active-view-transition");
    } catch {
      return true;
    }
  });
}

/** Entra pela tela de login e espera chegar em `next`. */
export async function signIn(page: Page, email: string, next: string): Promise<void> {
  await page.goto(`/entrar?next=${encodeURIComponent(next)}`);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((url) => url.pathname === next);
  await waitForScreen(page);
}
