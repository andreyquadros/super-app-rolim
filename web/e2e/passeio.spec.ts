import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { answerTourOffer, expectCallsReachable, expectInBand, firstVisit, goToLastSlide, inBand, pendingTour, signIn, TEST_PASSWORD, TOUR_OFFER_TITLE, tourCard, visibleBand, waitForSettled, waitForTourStep } from "./helpers";

// Passeio pela tela inicial (DESIGN.md §11). Esperas só por papel, estado e
// localStorage: nenhum waitForTimeout.

const atHome = (url: URL) => url.pathname === "/" && url.search === "";
const layer = (page: Page) => page.locator("[data-tour-layer]");
const offer = (page: Page) => page.getByRole("dialog", { name: TOUR_OFFER_TITLE });
const title = (page: Page) => tourCard(page).getByRole("heading", { level: 2 });
const next = (page: Page) => tourCard(page).getByRole("button", { name: "Próximo", exact: true });
const storage = (page: Page, key: string) => page.evaluate((k) => localStorage.getItem(k), key);
const dutyTitle = (page: Page) => page.locator('[data-tour="plantao"] h2'); // o alvo do foco ao sair no passo 2

/** Primeiro acesso: apresentação até o fim e "Começar a usar"; espera a Início. */
async function startFromWelcome(page: Page): Promise<void> {
  await firstVisit(page);
  await goToLastSlide(page);
  await page.getByRole("button", { name: "Começar a usar" }).click();
  await page.waitForURL(atHome);
}

/** Pede o passeio: pela linha "Como usar o app" ou pelo link do Perfil (/?passeio=1). */
async function startTour(page: Page, via: "ajuda" | "link" = "ajuda"): Promise<void> {
  if (via === "link") {
    await page.goto("/?passeio=1");
    await page.waitForURL(atHome);
  } else {
    await page.goto("/");
    await waitForSettled(page);
    await page.locator('[data-tour="ajuda"]').click();
  }
  await waitForTourStep(page, 1);
  await expect(title(page)).toBeFocused();
}

/** Toca em Próximo (um toque a menos de 400 ms do anterior é ignorado: com movimento reduzido a troca é instantânea). */
async function tapNext(page: Page): Promise<void> {
  await tapped(page, () => next(page).click());
}

/** Espera 400 ms desde o último toque ou tecla do teste (pelo relógio da página), age e marca a hora. */
async function tapped(page: Page, act: () => Promise<void>): Promise<void> {
  await page.waitForFunction(() => performance.now() - Number(document.body.dataset.e2eTap ?? -1e9) >= 400);
  await act();
  await page.evaluate(() => (document.body.dataset.e2eTap = String(performance.now())));
}

/** Toca em Próximo do passo `from` até o passo `step`. */
async function goToStep(page: Page, step: number, from = 1): Promise<void> {
  for (let current = from + 1; current <= step; current++) {
    await tapNext(page);
    await waitForTourStep(page, current);
  }
}

/** Onde está o foco: no cartão, nos serviços (passo 1), num "Ligar" ou em outro lugar. */
function focusedIn(page: Page): Promise<"cartao" | "servicos" | "ligar" | "outro"> {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (el?.closest("[data-tour-layer]")) return "cartao";
    if (el?.closest('[data-tour="servicos"]')) return "servicos";
    return el?.matches('main a[href^="tel:"]') ? "ligar" : "outro";
  });
}

const attachShot = async (page: Page, testInfo: TestInfo, name: string) => testInfo.attach(name, { body: await page.screenshot(), contentType: "image/png" });

test.describe("primeiro acesso", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("Começar a usar → oferta → passeio completo → Concluir", async ({ page }) => {
    await startFromWelcome(page);
    await answerTourOffer(page, "Mostrar o passeio");

    await waitForTourStep(page, 1);
    await expect(title(page)).toBeFocused();
    await expect(title(page)).toContainText("Os serviços ficam aqui");
    await goToStep(page, 5);
    await tapped(page, () => tourCard(page).getByRole("button", { name: "Concluir" }).click());

    await expect(layer(page)).toHaveCount(0);
    await expect(page.locator("main h1")).toBeFocused();
    expect(await storage(page, "rolim.passeio")).toBe("v1");

    await page.reload();
    await waitForSettled(page);
    await expect(offer(page)).toHaveCount(0);
    expect(await storage(page, "rolim.passeio")).toBe("v1");
  });

  test("“Agora não” encerra a oferta de vez", async ({ page }) => {
    await startFromWelcome(page);
    await answerTourOffer(page, "Agora não");
    await expect(layer(page)).toHaveCount(0);
    expect(await storage(page, "rolim.passeio")).toBe("v1");
  });

  test("Esc na oferta: volta uma vez numa página nova; no 2º Esc, nunca mais", async ({ page, context }) => {
    await startFromWelcome(page);
    await expect(offer(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(offer(page)).toBeHidden();
    expect(await storage(page, "rolim.passeio")).toBe("pendente");
    expect(await storage(page, "rolim.passeio.vezes")).toBe("1");

    const other = await context.newPage();
    await other.goto("/");
    await expect(offer(other)).toBeVisible();
    await other.keyboard.press("Escape");
    await expect(offer(other)).toBeHidden();
    expect(await storage(other, "rolim.passeio")).toBe("v1");
    expect(await storage(other, "rolim.passeio.vezes")).toBeNull();
  });

  test("“Entrar ou criar conta” → login → oferta → passo 5 com o perfil", async ({ page }) => {
    await firstVisit(page);
    await goToLastSlide(page);
    await page.getByRole("button", { name: "Entrar ou criar conta" }).click();
    await page.waitForURL((url) => url.pathname === "/entrar");
    await page.getByLabel("E-mail").fill("cidadao@rolim.test");
    await page.getByLabel("Senha").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL(atHome);
    await answerTourOffer(page, "Mostrar o passeio");
    await waitForTourStep(page, 1);
    await goToStep(page, 5);
    await expect(title(page)).toContainText("Seu perfil fica aqui");
    await expect(tourCard(page)).toContainText("Perfil › Ajuda");
  });

  test("sessão que começou por link direto não oferece (nem baixa o passeio)", async ({ page }) => {
    await pendingTour(page);
    const tourRequests: string[] = [];
    page.on("request", (request) => {
      if (/HomeTour/.test(request.url())) tourRequests.push(request.url());
    });
    await page.goto("/plantao/farmacias");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("link", { name: "Início" }).first().click();
    await page.waitForURL(atHome);
    await waitForSettled(page);
    await expect(offer(page)).toHaveCount(0);
    expect(await storage(page, "rolim.passeio")).toBe("pendente");
    expect(tourRequests).toEqual([]);
  });
});

test.describe("durante o passeio", () => {
  test("os “Ligar” continuam acesos e ao alcance em todos os passos", async ({ page }) => {
    await startTour(page, "link");
    for (let step = 1; step <= 5; step++) {
      if (step > 1) {
        await tapNext(page);
        await waitForTourStep(page, step);
      }
      if (step === 2) await page.getByRole("link", { name: /^Ligar para/ }).first().click({ trial: true });
      await expectCallsReachable(page, step === 2);
    }
  });

  test("tocar em “Problema na rua” no passo 1 sai do passeio e abre o serviço", async ({ page }) => {
    await startTour(page);
    await page.getByRole("link", { name: /^Problema na rua/ }).click();
    await expect(layer(page)).toHaveCount(0);
    await page.waitForURL((url) => url.pathname === "/zeladoria/nova" || url.pathname === "/entrar");
  });

  test("Solicitar no passo 3 abre a folha e esconde o passeio; Cancelar volta ao passo 3", async ({ page }) => {
    await startTour(page, "link");
    await goToStep(page, 3);
    await page.getByRole("button", { name: "Solicitar" }).click();
    const sheet = page.getByRole("dialog", { name: "O que você quer registrar?" });
    await expect(sheet).toBeVisible();
    await expect(layer(page)).toHaveCount(0);
    await sheet.getByRole("button", { name: "Cancelar" }).click();
    await expect(sheet).toBeHidden();
    await waitForTourStep(page, 3);
    await expect(title(page)).toBeFocused();
  });

  test("Esc no passo 2: a camada some, o foco vai para “De plantão agora” e a rolagem fica (se ele estava à vista)", async ({ page }) => {
    await startTour(page, "link");
    await goToStep(page, 2);
    const [before, shown] = [await page.evaluate(() => window.scrollY), await inBand(page, dutyTitle(page))];
    await page.keyboard.press("Escape");
    await expect(layer(page)).toHaveCount(0);
    await expect(dutyTitle(page)).toBeFocused();
    await expectInBand(page, dutyTitle(page));
    // À vista (Pixel 7), a rolagem fica; sob a AppBar (iPhone 13), sobe até ele aparecer (ver 360×640)
    if (shown) expect(await page.evaluate(() => window.scrollY)).toBe(before);
    expect(await page.evaluate(() => document.querySelectorAll("[inert]").length)).toBe(0);
  });

  test("Sair logo depois de Próximo (durante a troca de passo) fica no passo que estava à vista", async ({ page }) => {
    await startTour(page, "link");
    await goToStep(page, 2);
    // Os dois toques na mesma tarefa: a troca (160 ms, ou 0) não acontece e o foco vai para o alvo do passo 2, não o Solicitar
    await tapped(page, () =>
      tourCard(page).evaluate((card) => {
        const button = (name: string) => Array.from(card.querySelectorAll("button")).find((b) => b.textContent === name);
        button("Próximo")?.click();
        button("Sair do passeio")?.click();
      }),
    );
    await expect(layer(page)).toHaveCount(0);
    await expect(dutyTitle(page)).toBeFocused();
  });

  test("“Como usar o app” → Sair: o foco volta à linha", async ({ page }) => {
    await startTour(page, "ajuda");
    await tourCard(page).getByRole("button", { name: "Sair do passeio" }).click();
    await expect(layer(page)).toHaveCount(0);
    await expect(page.locator('[data-tour="ajuda"]')).toBeFocused();
  });

  test("Perfil › “Passeio pela tela inicial” abre a Início no passo 1", async ({ page }) => {
    await signIn(page, "cidadao@rolim.test", "/perfil");
    await page.getByRole("link", { name: /Passeio pela tela inicial/ }).click();
    await page.waitForURL(atHome);
    await waitForTourStep(page, 1);
    await expect(title(page)).toBeFocused();
  });

  test("Tab em laço só pelo que está aceso, setas e toque duplo", async ({ page }) => {
    await startTour(page, "link");
    const exit = tourCard(page).getByRole("button", { name: "Sair do passeio" });
    // Título → Sair → Próximo → controles acesos da página → volta ao Sair
    await page.keyboard.press("Tab");
    await expect(exit).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(next(page)).toBeFocused();
    await page.keyboard.press("Tab");
    expect(await focusedIn(page)).toBe("servicos");
    let looped = false;
    for (let i = 0; i < 12 && !looped; i++) {
      await page.keyboard.press("Tab");
      const where = await focusedIn(page);
      // Só o que está aceso: os serviços, um "Ligar" ou o próprio cartão
      expect(where).not.toBe("outro");
      looped = where === "cartao";
    }
    await expect(exit).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    expect(["servicos", "ligar"]).toContain(await focusedIn(page));

    // Setas valem Próximo e Voltar com o foco no cartão
    await title(page).focus();
    await tapped(page, () => page.keyboard.press("ArrowRight"));
    await waitForTourStep(page, 2);
    await expect(title(page)).toBeFocused();
    await tapped(page, () => page.keyboard.press("ArrowLeft"));
    await waitForTourStep(page, 1);

    // Dois toques em menos de 400 ms avançam um passo só
    await tapped(page, () => next(page).dblclick());
    await waitForTourStep(page, 2);
    await expect(title(page)).toContainText("Passo 2 de 5.");
  });

  test("a AppBar fica inert no passo 1", async ({ page }) => {
    await startTour(page);
    const inert = await page.evaluate(() => document.querySelector(".app-bar-vt")?.closest("[inert]") !== null);
    expect(inert).toBe(true);
  });

  test("CLS abaixo de 0,1 da carga ao fim do passeio", async ({ page }) => {
    await page.addInitScript(() => {
      const scope = window as Window & { tourCls?: number };
      scope.tourCls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
          if (!entry.hadRecentInput) scope.tourCls = (scope.tourCls ?? 0) + entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await startTour(page);
    await goToStep(page, 5);
    await tapped(page, () => tourCard(page).getByRole("button", { name: "Concluir" }).click());
    await expect(layer(page)).toHaveCount(0);
    const cls = await page.evaluate(() => (window as Window & { tourCls?: number }).tourCls ?? 0);
    expect(cls).toBeLessThan(0.1);
  });
});

test.describe("movimento reduzido", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("nenhuma animação rodando depois de cada troca de passo", async ({ page }) => {
    await startTour(page, "link");
    // A regra global de movimento reduzido deixa transições de 0,01 ms: não contam
    const running = () =>
      page.evaluate(() =>
        document
          .getAnimations()
          .filter((a) => {
            const timing = a.effect?.getComputedTiming();
            return a.playState === "running" && timing?.endTime !== Infinity && Number(timing?.duration ?? 0) > 1;
          })
          .map((a) => {
            const target = a.effect instanceof KeyframeEffect ? a.effect.target : null;
            const name = a instanceof CSSAnimation ? a.animationName : a instanceof CSSTransition ? a.transitionProperty : "?";
            return `${name} em ${target?.tagName ?? "?"}.${target?.className?.toString() ?? ""}`;
          }),
      );
    expect(await running()).toEqual([]);
    for (let step = 2; step <= 5; step++) {
      await tapNext(page);
      await expect(title(page)).toContainText(`Passo ${step} de 5.`);
      expect(await running()).toEqual([]);
    }
  });
});

test.describe("320×568 com texto muito grande", () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test("em cada passo o cartão cabe na tela, com o botão à vista e sem rolagem lateral", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("rolim.textSize", "muito-grande"));
    await startTour(page, "link");
    for (let step = 1; step <= 5; step++) {
      if (step > 1) {
        await tapNext(page);
        await waitForTourStep(page, step);
      }
      const box = (await tourCard(page).boundingBox()) ?? { x: -1, y: -1, width: 0, height: 0 };
      const inside = box.x >= 0 && box.y >= 0 && box.x + box.width <= 320 && box.y + box.height <= 568;
      expect(inside, `passo ${step}: cartão dentro da tela ${JSON.stringify(box)}`).toBe(true);
      const primary: Locator = tourCard(page).getByRole("button", { name: step === 5 ? "Concluir" : "Próximo", exact: true });
      // O WebKit arredonda o botão em 1/64 px dentro do cartão: "inteiro" com folga de 1%
      await expect(primary).toBeInViewport({ ratio: 0.99 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    }
  });
});

// O passo 2 rola as linhas para o topo da faixa e deixa o título sob a AppBar (sem internet, a
// faixa "Sem internet" deixa a AppBar mais alta que --app-bar-h: a saída mede a barra de verdade)
for (const { width, height, offline } of [{ width: 360, height: 640, offline: false }, { width: 375, height: 667, offline: true }]) {
  test.describe(`${width}×${height}${offline ? " sem internet" : ""}`, () => {
    test.use({ viewport: { width, height } });

    test("Esc no passo 2: o foco vai para “De plantão agora”, que volta à vista logo abaixo da AppBar", async ({ page, context }) => {
      await startTour(page, "link");
      if (offline) {
        await context.setOffline(true);
        await expect(page.locator(".app-bar-vt").getByText("Sem internet")).toBeVisible();
      }
      await goToStep(page, 2);
      expect(await inBand(page, dutyTitle(page))).toBe(false);
      await page.keyboard.press("Escape");
      await expect(layer(page)).toHaveCount(0);
      await expect(dutyTitle(page)).toBeFocused();
      await expectInBand(page, dutyTitle(page));
      // Só o necessário: 12 px entre a AppBar e o título
      expect(((await dutyTitle(page).boundingBox())?.y ?? 0) - (await visibleBand(page)).top).toBeLessThanOrEqual(13);
    });
  });
}

test.describe("1024×768", () => {
  test.use({ viewport: { width: 1024, height: 768 }, isMobile: false, hasTouch: false });

  test("nos passos 3 a 5 o cartão fica à direita do trilho (x ≥ 104)", async ({ page }) => {
    await startTour(page, "link");
    await goToStep(page, 2);
    for (let step = 3; step <= 5; step++) {
      await tapNext(page);
      await waitForTourStep(page, step);
      const box = await tourCard(page).boundingBox();
      expect(box?.x ?? 0).toBeGreaterThanOrEqual(104);
    }
  });
});

const SHOT_SIZES = [{ width: 320, height: 568 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }] as const;

for (const size of SHOT_SIZES) {
  for (const scheme of ["light", "dark"] as const) {
    test.describe(`capturas ${size.width} ${scheme === "light" ? "claro" : "escuro"}`, () => {
      test.use({ viewport: size, colorScheme: scheme, isMobile: size.width < 768, hasTouch: size.width < 768 });

      test("oferta e passos 1, 2 e 5", async ({ page }, testInfo) => {
        await pendingTour(page);
        await page.goto("/");
        await expect(offer(page)).toBeVisible();
        await waitForSettled(page);
        await attachShot(page, testInfo, `oferta-${size.width}-${scheme}`);
        await answerTourOffer(page, "Mostrar o passeio");
        await waitForTourStep(page, 1);
        await attachShot(page, testInfo, `passo-1-${size.width}-${scheme}`);
        await goToStep(page, 2);
        await attachShot(page, testInfo, `passo-2-${size.width}-${scheme}`);
        await goToStep(page, 5, 2);
        await attachShot(page, testInfo, `passo-5-${size.width}-${scheme}`);
      });
    });
  }
}
