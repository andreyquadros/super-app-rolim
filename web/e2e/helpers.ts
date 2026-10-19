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

/** Abas que o app baixa sozinho depois do load (preloadMainTabs em src/main.tsx). */
const BACKGROUND_CHUNKS = ["DutyPage", "MyRequestsPage", "NoticesPage"];

/**
 * Espera o app baixar as abas principais em segundo plano: logo depois do
 * load, ou 1,5 s depois no Safari (sem requestIdleCallback). No WebKit, sair
 * da página com um import() pendente o cancela, e o app (vite:preloadError em
 * src/main.tsx) recarrega a página antiga por cima do page.goto seguinte.
 */
export async function waitForBackgroundImports(page: Page): Promise<void> {
  const chunks = await page.waitForFunction((names) => {
    // Economia de dados ou aparelho modesto: o app não baixa nada antes da hora
    if (document.documentElement.dataset.motion === "lite") return [];
    const loaded = performance.getEntriesByType("resource").map((entry) => entry.name);
    const urls = names.map((name) => loaded.find((url) => new RegExp(`^/assets/${name}-[\\w-]+\\.js$`).test(new URL(url).pathname)));
    return urls.every(Boolean) && urls;
  }, BACKGROUND_CHUNKS);
  const urls = (await chunks.jsonValue()) as string[];
  // O mesmo import() do app: só termina quando o módulo e as dependências chegaram
  await page.evaluate((list) => Promise.all(list.map((url) => import(url))), urls);
}

/**
 * Espera a tela assentar: dados carregados (sem os blocos `.shimmer`), as
 * entradas animadas concluídas e os downloads em segundo plano terminados. Os
 * cartões entram com `.enter-rise` (opacidade 0 → 1) quando os dados chegam,
 * o que pode ser bem depois do título. As animações sem fim (ponto "ao vivo",
 * indicadores de carregamento) não contam.
 */
export async function waitForSettled(page: Page): Promise<void> {
  await waitForScreen(page);
  await page.waitForFunction(
    () =>
      !document.querySelector(".shimmer") &&
      document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getComputedTiming().endTime === Infinity),
  );
  await waitForBackgroundImports(page);
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
