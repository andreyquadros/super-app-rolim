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

/** Toca no que abre a janela do Google e devolve essa janela (Auth Emulator). */
export async function openGooglePopup(page: Page, open: () => Promise<void>): Promise<Page> {
  const popup = page.waitForEvent("popup");
  await open();
  const opened = await popup;
  await opened.waitForLoadState();
  return opened;
}

/** Na janela do Google do emulador: cria uma conta nova com este e-mail. */
export async function addGoogleAccount(popup: Page, email: string, name: string): Promise<void> {
  await popup.getByText("Add new account").click();
  await popup.locator("#email-input").fill(email);
  await popup.locator("#display-name-input").fill(name);
  await popup.getByRole("button", { name: "Sign in with Google.com" }).click();
}

/** Na janela do Google do emulador: escolhe uma conta que já existe. */
export async function pickGoogleAccount(popup: Page, email: string): Promise<void> {
  await popup.getByText(email, { exact: true }).click();
}
