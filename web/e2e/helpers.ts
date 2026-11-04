import { expect, type Locator, type Page } from "@playwright/test";

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

// ---------- Primeiro acesso e passeio pela tela inicial (DESIGN §11) ----------

/** Títulos dos slides da apresentação (/boas-vindas), em ordem */
export const WELCOME_SLIDE_TITLES = [
  "Bem-vindo ao SUPER APP Rolim de Moura",
  "Viu um problema na rua? Avise.",
  "Acompanhe cada passo",
  "Farmácia e funerária de plantão",
  "Deixe do seu jeito",
] as const;
/** Título da folha que oferece o passeio */
export const TOUR_OFFER_TITLE = "Quer conhecer a tela inicial?";
export const TOUR_STEP_COUNT = 5;
/** Escolhas do teste (ex.: tamanho do texto) que valem também no primeiro acesso */
const KEPT_ON_FIRST_VISIT = ["rolim.textSize"];

/**
 * Primeiro acesso de verdade: apaga o que diz "já conhece o app" (inclusive o
 * storageState do playwright.config.ts) e abre a Início, que leva à
 * apresentação. Para no slide 1, já visível. A limpeza é feita numa página
 * estática da mesma origem, onde o app não roda (nem grava a entrada da
 * sessão); chame no começo do teste, com o contexto ainda novo (sem service
 * worker no controle, que marcaria a pessoa como usuária antiga).
 */
export async function firstVisit(page: Page): Promise<void> {
  await page.goto("/robots.txt");
  await page.evaluate((kept) => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("rolim.") && !kept.includes(key)) localStorage.removeItem(key);
    }
    sessionStorage.clear();
  }, KEPT_ON_FIRST_VISIT);
  await page.goto("/");
  await page.waitForURL((url) => url.pathname === "/boas-vindas");
  await expect(page.getByRole("heading", { name: WELCOME_SLIDE_TITLES[0] })).toBeVisible();
}

/**
 * Quem acabou de conhecer a apresentação ("Começar a usar" numa sessão
 * anterior): a Início oferece o passeio. A limpeza roda numa página estática
 * da mesma origem, onde o app não roda.
 */
export async function pendingTour(page: Page): Promise<void> {
  await page.goto("/robots.txt");
  await page.evaluate((kept) => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("rolim.") && !kept.includes(key)) localStorage.removeItem(key);
    }
    sessionStorage.clear();
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    localStorage.setItem("rolim.firstSeen", `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
    localStorage.setItem("rolim.onboarding", "v1");
    localStorage.setItem("rolim.novidades", "2026-10-funerarias");
    localStorage.setItem("rolim.passeio", "pendente");
  }, KEPT_ON_FIRST_VISIT);
}

/** Na apresentação: toca em Próximo até o último slide (onde ficam "Começar a usar" e "Entrar ou criar conta"). */
export async function goToLastSlide(page: Page): Promise<void> {
  const next = page.getByRole("button", { name: "Próximo", exact: true });
  for (const title of WELCOME_SLIDE_TITLES.slice(1)) {
    await next.click();
    await expect(page.getByRole("heading", { name: title })).toBeFocused();
  }
}

/** Espera a folha "Quer conhecer a tela inicial?", toca na resposta e espera a folha fechar. */
export async function answerTourOffer(page: Page, answer: "Mostrar o passeio" | "Agora não"): Promise<void> {
  const offer = page.getByRole("dialog", { name: TOUR_OFFER_TITLE });
  await expect(offer).toBeVisible();
  await offer.getByRole("button", { name: answer, exact: true }).click();
  await expect(offer).toBeHidden();
}

/** O cartão do passeio: role="dialog" (não modal) dentro da camada [data-tour-layer]. */
export function tourCard(page: Page): Locator {
  return page.locator("[data-tour-layer]").getByRole("dialog");
}

type Box = NonNullable<Awaited<ReturnType<Locator["boundingBox"]>>>;

const crosses = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** Faixa visível da página: entre a AppBar e a TabBar (ou o pé da tela). */
export async function visibleBand(page: Page): Promise<{ top: number; bottom: number }> {
  return page.evaluate(() => {
    const shown = (s: string) => Array.from(document.querySelectorAll(s)).find((el) => el.getClientRects().length > 0);
    const top = shown(".app-bar-vt")?.getBoundingClientRect().bottom ?? 0;
    const bottom = shown(".tab-bar-vt")?.getBoundingClientRect().top ?? window.innerHeight;
    return { top, bottom };
  });
}

type Band = Awaited<ReturnType<typeof visibleBand>>;

const inside = (box: Box | null, band: Band) => !!box && box.y >= band.top && box.y + box.height <= band.bottom;

/** O elemento está inteiro na faixa visível (nem sob a AppBar nem sob a TabBar)? */
export async function inBand(page: Page, target: Locator): Promise<boolean> {
  return inside(await target.boundingBox(), await visibleBand(page));
}

/** O foco nunca fica escondido: o elemento inteiro na faixa visível. */
export async function expectInBand(page: Page, target: Locator): Promise<void> {
  const [box, band] = [await target.boundingBox(), await visibleBand(page)];
  expect(inside(box, band), `fora da faixa visível: ${JSON.stringify({ box, band })}`).toBe(true);
}

/**
 * Todo "Ligar" da página inteiro na faixa visível e fora do cartão do passeio
 * aceita o toque (`strict`: nenhum sob o cartão). A conferência inteira se
 * repete até valer: dados que chegam tarde mudam a página, e o passeio se mede
 * de novo (o cartão pode mudar de lugar).
 */
export async function expectCallsReachable(page: Page, strict: boolean): Promise<void> {
  await expect(async () => {
    const card = await tourCard(page).boundingBox();
    expect(card).not.toBeNull();
    const band = await visibleBand(page);
    const calls = page.locator('main a[href^="tel:"]');
    for (let i = 0; i < (await calls.count()); i++) {
      const call = calls.nth(i);
      const box = await call.boundingBox();
      if (!box || !card) continue;
      if (strict) expect(crosses(card, box), `o cartão cobre o Ligar ${i + 1}`).toBe(false);
      if (inside(box, band) && !crosses(card, box)) await call.click({ trial: true, timeout: 2000 });
    }
  }).toPass();
}

/**
 * Espera o passeio mostrar o passo `step` (o h2 começa com "Passo N de 5.",
 * oculto na tela) e assentar: a rolagem parada e as transições da camada
 * (véu, furo, cartão, entrada do anel) concluídas. O pulso do anel (::after)
 * não conta. Não exige o foco no título: confira com toBeFocused quando for o caso.
 */
export async function waitForTourStep(page: Page, step: number): Promise<void> {
  const title = tourCard(page).getByRole("heading", { level: 2, name: new RegExp(`^Passo ${step} de ${TOUR_STEP_COUNT}\\.`) });
  await expect(title).toBeVisible();
  // Rolagem (suave ou não) parada por 3 quadros seguidos
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let last = window.scrollY;
        let still = 0;
        const tick = () => {
          still = window.scrollY === last ? still + 1 : 0;
          last = window.scrollY;
          if (still >= 3) resolve();
          else window.requestAnimationFrame(tick);
        };
        window.requestAnimationFrame(tick);
      }),
  );
  // O anel entra logo depois da medida que corrige o passo (rolagem e dados que chegaram tarde):
  // antes dela, um "Ligar" ainda pode estar apagado, e o toque de teste do Playwright rolaria a página
  await page.waitForFunction(() => !document.querySelector("[data-tour-ring]:not([data-on])"));
  await page.waitForFunction(() => {
    const layer = document.querySelector("[data-tour-layer]");
    if (!layer) return false;
    return document.getAnimations().every((animation) => {
      const effect = animation.effect;
      if (!(effect instanceof KeyframeEffect) || !effect.target || effect.pseudoElement) return true;
      if (!layer.contains(effect.target)) return true;
      return animation.playState !== "running" || effect.getComputedTiming().endTime === Infinity;
    });
  });
}
