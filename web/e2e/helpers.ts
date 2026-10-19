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

/**
 * Espera a tela assentar: dados carregados (sem os blocos `.shimmer`) e as
 * entradas animadas concluídas. Os cartões entram com `.enter-rise`
 * (opacidade 0 → 1) quando os dados chegam, o que pode ser bem depois do
 * título. As animações sem fim (ponto "ao vivo", indicadores de carregamento)
 * não contam.
 */
export async function waitForSettled(page: Page): Promise<void> {
  await waitForScreen(page);
  await page.waitForFunction(
    () =>
      !document.querySelector(".shimmer") &&
      document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getComputedTiming().endTime === Infinity),
  );
}

/** Entra pela tela de login e espera a tela de `next` assentar. */
export async function signIn(page: Page, email: string, next: string): Promise<void> {
  await page.goto(`/entrar?next=${encodeURIComponent(next)}`);
  const password = page.getByLabel("Senha");
  await page.getByLabel("E-mail").fill(email);
  await password.fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((url) => url.pathname === next);
  // A URL muda antes da tela: o login ainda aparece e a transição nem começou
  await password.waitFor({ state: "hidden" });
  await waitForSettled(page);
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
