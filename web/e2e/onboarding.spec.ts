import { expect, test, type Page } from "@playwright/test";
import {
  answerTourOffer,
  firstVisit,
  goToLastSlide,
  signIn,
  TOUR_OFFER_TITLE,
  waitForSettled,
  WELCOME_SLIDE_TITLES as SLIDE_TITLES,
} from "./helpers";

// Primeiro acesso de verdade: sem o estado "já conhece o app" do playwright.config.ts
test.use({ storageState: { cookies: [], origins: [] } });

const WELCOME = SLIDE_TITLES[0];
const TOUR_KEY = "rolim.passeio";

const atHome = (url: URL) => url.pathname === "/";

async function expectHome(page: Page) {
  await page.waitForURL(atHome);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: WELCOME })).toHaveCount(0);
}

/** Aperta Tab até o botão com esse texto receber o foco. */
async function tabTo(page: Page, label: string, maxPresses = 15) {
  for (let i = 0; i < maxPresses; i++) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
    if (focused === label) return;
  }
  throw new Error(`"${label}" não recebeu o foco pelo Tab`);
}

const tourState = (page: Page) => page.evaluate((key) => localStorage.getItem(key), TOUR_KEY);
const tourOffer = (page: Page) => page.getByRole("dialog", { name: TOUR_OFFER_TITLE });

/** Endereços do pedaço do passeio pedidos pela página (dev: HomeTour.tsx; build: HomeTour-hash.js). */
function watchTourChunk(page: Page): string[] {
  const requested: string[] = [];
  page.on("request", (request) => {
    if (/\/HomeTour[-.]/.test(new URL(request.url()).pathname)) requested.push(request.url());
  });
  return requested;
}

/**
 * Espera o navegador ficar ocioso duas vezes: a pré-carga ociosa do passeio
 * (registrada antes, ao abrir a Início) já teria rodado e feito o pedido.
 */
async function afterIdle(page: Page) {
  for (let round = 0; round < 2; round++) {
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(() => resolve(), { timeout: 3000 });
          else window.setTimeout(resolve, 2500);
        }),
    );
  }
}

/** A Início assentou e nada do passeio apareceu nem foi baixado. */
async function expectNoTourOffer(page: Page, tourRequests: string[]) {
  await waitForSettled(page);
  await afterIdle(page);
  expect(tourRequests).toEqual([]);
  await expect(tourOffer(page)).toHaveCount(0);
}

test("primeiro acesso pela Início mostra a apresentação", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL((url) => url.pathname === "/boas-vindas");
  await expect(page.getByRole("heading", { name: WELCOME })).toBeVisible();
  await expect(page.getByText("Uma iniciativa da Prefeitura de Rolim de Moura junto com o Projeto Cidades Inteligentes")).toBeVisible();
});

test("Pular leva à Início e recarregar não mostra de novo", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL((url) => url.pathname === "/boas-vindas");
  await page.getByRole("button", { name: "Pular" }).click();
  await expectHome(page);

  await page.reload();
  await expectHome(page);
});

test("voltar à Início na mesma sessão não mostra de novo, mesmo sem concluir", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL((url) => url.pathname === "/boas-vindas");
  await page.goto("/");
  await expectHome(page);
});

test("links diretos nunca são interceptados", async ({ page }) => {
  await page.goto("/plantao/funerarias");
  await expect(page.getByRole("heading", { name: "Funerárias de plantão", level: 1 })).toBeVisible();
  await expect(page).not.toHaveURL(/boas-vindas/);

  // Mesma sessão: a entrada foi um link direto, então a Início também não mostra
  await page.goto("/");
  await expectHome(page);
});

test("link direto de um pedido não mostra a apresentação", async ({ page }) => {
  await page.goto("/protocolos/zeladoria/x");
  // Sem login, o guarda leva para Entrar (e volta ao pedido depois)
  await page.waitForURL((url) => url.pathname === "/entrar");
  await expect(page).not.toHaveURL(/boas-vindas/);
  await expect(page.getByRole("heading", { name: WELCOME })).toHaveCount(0);
});

test("/?intro=0 vai direto para a Início, desliga o passeio e não volta a mostrar", async ({ page, context }) => {
  await page.goto("/?intro=0");
  await expectHome(page);
  expect(new URL(page.url()).search).toBe("");
  // Lighthouse e links de divulgação: nem apresentação nem oferta do passeio
  expect(await tourState(page)).toBe("v1");

  // Outra aba (sessão nova) também não mostra: a escolha ficou gravada
  const other = await context.newPage();
  await other.goto("/");
  await expectHome(other);
});

test("Começar a usar oferece o passeio e Agora não leva à Início", async ({ page }) => {
  await firstVisit(page);
  await goToLastSlide(page);
  await page.getByRole("button", { name: "Começar a usar" }).click();
  await page.waitForURL(atHome);
  // A oferta só conta a vez ao abrir: até a resposta, o passeio segue pendente
  expect(await tourState(page)).toBe("pendente");

  await answerTourOffer(page, "Agora não");
  await expectHome(page);
  expect(await tourState(page)).toBe("v1");
});

const LEAVE_EARLY = [
  { how: "Pular", leave: (page: Page) => page.getByRole("button", { name: "Pular" }).click() },
  { how: "Esc", leave: (page: Page) => page.keyboard.press("Escape") },
] as const;

for (const { how, leave } of LEAVE_EARLY) {
  test(`${how} não deixa o passeio pendente nem baixa o pedaço dele`, async ({ page }) => {
    const tourRequests = watchTourChunk(page);
    await firstVisit(page);
    await leave(page);
    await expectHome(page);
    await expectNoTourOffer(page, tourRequests);
    expect(await tourState(page)).toBeNull();
  });
}

test("Tab e Enter percorrem toda a apresentação e respondem à oferta", async ({ page }) => {
  await firstVisit(page);

  // "Pular" é o primeiro item do Tab
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Pular" })).toBeFocused();

  for (let i = 1; i < SLIDE_TITLES.length; i++) {
    await tabTo(page, "Próximo");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: SLIDE_TITLES[i] })).toBeFocused();
    await expect(page.getByText(`Passo ${i + 1} de ${SLIDE_TITLES.length}`)).toBeAttached();
  }

  await tabTo(page, "Começar a usar");
  await page.keyboard.press("Enter");

  // A oferta do passeio abre sobre a Início: responde pelo teclado antes de conferir a Início
  const offer = tourOffer(page);
  await expect(offer).toBeVisible();
  await expect(offer.getByRole("button", { name: "Mostrar o passeio" })).toBeFocused();
  await tabTo(page, "Agora não", 3);
  await page.keyboard.press("Enter");
  await expect(offer).toBeHidden();
  await expectHome(page);
  expect(await tourState(page)).toBe("v1");
});

test("setas trocam de slide e Esc equivale a Pular", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL((url) => url.pathname === "/boas-vindas");
  await expect(page.getByRole("heading", { name: WELCOME })).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("heading", { name: SLIDE_TITLES[1] })).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("heading", { name: WELCOME })).toBeFocused();

  await page.keyboard.press("Escape");
  await expectHome(page);
});

test("rever a apresentação pelo Perfil e Começar a usar volta ao Perfil, sem oferta", async ({ page }) => {
  const tourRequests = watchTourChunk(page);
  // Sessão que começou pela Início, como a de quem pode receber a oferta
  await firstVisit(page);
  await page.getByRole("button", { name: "Pular" }).click();
  await expectHome(page);
  await signIn(page, "cidadao@rolim.test", "/perfil");

  await page.getByRole("link", { name: /^Ver a apresentação de novo/ }).click();
  await page.waitForURL((url) => url.pathname === "/boas-vindas" && url.searchParams.get("rever") === "1");
  await expect(page.getByRole("heading", { name: WELCOME })).toBeVisible();
  await goToLastSlide(page);
  await page.getByRole("button", { name: "Começar a usar" }).click();
  await page.waitForURL((url) => url.pathname === "/perfil");
  expect(await tourState(page)).toBeNull();

  // Nem na volta à Início
  await page.getByRole("link", { name: "Início", exact: true }).click();
  await expectHome(page);
  await expectNoTourOffer(page, tourRequests);
  expect(await tourState(page)).toBeNull();
});
