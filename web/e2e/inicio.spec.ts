import { expect, test, type Page } from "@playwright/test";
import { waitForSettled } from "./helpers";

// Início (DESIGN §11, "Início: animações"): a entrada toca só na primeira
// montagem da carga, nunca no H1 (LCP), sem deslocar a página; os alvos do
// passeio existem uma vez por id; e "Como usar o app" já está lá no primeiro
// quadro, antes do convite que pode surgir tarde.

const TOUR_IDS = ["servicos", "plantao", "solicitar", "abas", "conta", "ajuda"] as const;
const DUTY_STATES = ["ok", "sem-ligar", "carregando", "erro"];

/** Quantos [data-tour=id] estão à vista (o mesmo critério do findTarget do passeio). */
function visibleTargets(page: Page, id: string): Promise<number> {
  return page.evaluate(
    (tourId) =>
      [...document.querySelectorAll(`[data-tour="${tourId}"]`)].filter((el) => {
        const rect = el.getBoundingClientRect();
        return el.getClientRects().length > 0 && rect.width * rect.height > 0 && getComputedStyle(el).visibility !== "hidden";
      }).length,
    id,
  );
}

/** Soma dos deslocamentos de layout sem toque recente, desde o começo da carga. */
async function trackLayoutShift(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as Window & { __cls?: number };
    w.__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (!entry.hadRecentInput) w.__cls = (w.__cls ?? 0) + entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
}

/**
 * Movimento no H1 ou em algo que o contém: keyframes, ou transição de
 * transform/opacity. Com movimento reduzido, a regra global de 0,01 ms gera
 * transições de cor instantâneas em tudo; essas não contam.
 */
function animationsOnHeading(page: Page): Promise<number> {
  return page.evaluate(() => {
    const h1 = document.querySelector("main h1");
    if (!h1) return -1;
    return document.getAnimations().filter((a) => {
      const effect = a.effect as KeyframeEffect | null;
      if (!effect?.target || effect.pseudoElement || !effect.target.contains(h1)) return false;
      return !(a instanceof CSSTransition) || ["transform", "opacity"].includes(a.transitionProperty);
    }).length;
  });
}

test("a entrada toca na primeira montagem da carga e não ao voltar pela aba", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.locator("[data-home-intro]")).toHaveCount(1);

  const tabs = page.getByRole("navigation", { name: "Navegação principal" });
  await tabs.getByRole("link", { name: /^Plantão/ }).click();
  await expect(page).toHaveURL(/\/plantao\//);
  await tabs.getByRole("link", { name: /^Início/ }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('[data-tour="servicos"]')).toBeVisible();
  await expect(page.locator("[data-home-intro]")).toHaveCount(0);
});

for (const viewport of [
  { width: 360, height: 640 },
  { width: 1024, height: 768 },
]) {
  test.describe(`${viewport.width}px`, () => {
    test.use({ viewport });

    test("o LCP fica no cabeçalho parado e o H1 não anima", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("main h1")).toBeVisible();
      expect(await animationsOnHeading(page)).toBe(0);
      await waitForSettled(page);
      // Cabeçalho = H1, foto ou o próprio cartão verde (as curvas de nível são imagem de fundo)
      const lcp = await page.evaluate(
        () =>
          new Promise<string>((resolve) => {
            new PerformanceObserver((list) => {
              const entries = list.getEntries() as (PerformanceEntry & { element: Element | null })[];
              const element = entries.at(-1)?.element ?? null;
              resolve(element?.closest("main .home-hero-vt") ? "cabeçalho" : (element?.outerHTML.slice(0, 80) ?? "nenhum"));
            }).observe({ type: "largest-contentful-paint", buffered: true });
          }),
      );
      expect(lcp).toBe("cabeçalho");
      const headerAnimations = await page.evaluate(() =>
        document.getAnimations().filter((a) => {
          const target = (a.effect as KeyframeEffect | null)?.target;
          return target?.closest(".home-hero-vt") && a.playState === "running";
        }).length,
      );
      expect(headerAnimations).toBe(0);
    });

    test("a carga da Início não desloca a página (CLS < 0,1)", async ({ page }) => {
      await trackLayoutShift(page);
      await page.goto("/");
      await expect(page.locator("main h1")).toBeVisible();
      await waitForSettled(page);
      const cls = await page.evaluate(() => (window as Window & { __cls?: number }).__cls ?? 0);
      expect(cls).toBeLessThan(0.1);
    });

    test("os alvos do passeio existem, um só à vista por id", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("main h1")).toBeVisible();
      await waitForSettled(page);
      for (const id of TOUR_IDS) expect(await visibleTargets(page, id), `data-tour="${id}"`).toBe(1);
      const duty = page.locator('[data-tour="plantao"]');
      expect(DUTY_STATES).toContain(await duty.getAttribute("data-tour-state"));
      await expect(duty.locator('[data-tour-part="linhas"]')).toHaveCount(1);
      if (viewport.width < 768) await expect(page.locator('[data-tour-part="fab"]')).toBeVisible();
    });

    // welcome-hero e welcome-tiles são da passagem da apresentação (só no
    // celular); numa transição de aba ou de push, cabeçalho e blocos vão na raiz
    test("cabeçalho e blocos só levam nome de transição no escopo welcome", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("main h1")).toBeVisible();
      const namesWith = (scope: string | null) =>
        page.evaluate((value) => {
          const root = document.documentElement;
          if (value === null) delete root.dataset.navScope;
          else root.dataset.navScope = value;
          return [".home-hero-vt", ".home-tiles-vt"].map((selector) => {
            const el = document.querySelector(selector);
            return el ? getComputedStyle(el).viewTransitionName : "ausente";
          });
        }, scope);
      expect(await namesWith(null)).toEqual(["none", "none"]);
      expect(await namesWith("duty")).toEqual(["none", "none"]);
      const phone = viewport.width < 768;
      expect(await namesWith("welcome")).toEqual(phone ? ["welcome-hero", "welcome-tiles"] : ["none", "none"]);

      // O toque seguinte limpa o escopo antes de a transição dele capturar a tela
      await page.locator(".home-tiles-vt a").nth(2).click();
      await expect(page).toHaveURL(/\/plantao\//);
      expect(await page.evaluate(() => document.documentElement.dataset.navScope ?? null)).toBeNull();
    });
  });
}

test("com movimento reduzido nada anima na Início depois de assentar", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("main h1")).toBeVisible();
  await waitForSettled(page);
  const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length);
  expect(running).toBe(0);
  await expect(page.locator('[data-tour="servicos"] > li').first()).toHaveCSS("animation-name", "none");
});

test("no modo leve o ponto ao vivo fica parado e não há entrada animada", async ({ page }) => {
  // Script de início: marca o <html> assim que ele existe, antes do app
  await page.addInitScript(() => {
    new MutationObserver((_, observer) => {
      if (!document.documentElement) return;
      document.documentElement.dataset.motion = "lite";
      observer.disconnect();
    }).observe(document, { childList: true });
  });
  await page.goto("/");
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "lite");
  await expect(page.locator('[data-tour="servicos"] > li').first()).toHaveCSS("animation-name", "none");
  await expect(page.locator('[data-tour="plantao"]')).toHaveCSS("animation-name", "none");
  await waitForSettled(page);
  const dots = page.locator(".live-dot");
  await expect(dots.first()).toBeVisible();
  const dotAnimations = await dots.evaluateAll((list) => list.map((dot) => getComputedStyle(dot, "::after").animationName));
  expect(dotAnimations.every((name) => name === "none")).toBe(true);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
});

test("Como usar o app está no primeiro quadro, antes do convite tardio", async ({ page }) => {
  // No instante em que o H1 entra na página, a linha de ajuda já tem de estar lá
  await page.addInitScript(() => {
    const w = window as Window & { __helpWithH1?: boolean };
    new MutationObserver((_, observer) => {
      if (!document.querySelector("main h1")) return;
      w.__helpWithH1 = document.querySelector('[data-tour="ajuda"]') !== null;
      observer.disconnect();
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto("/");
  await expect(page.locator("main h1")).toBeVisible();
  expect(await page.evaluate(() => (window as Window & { __helpWithH1?: boolean }).__helpWithH1)).toBe(true);

  const help = page.getByRole("button", { name: /Como usar o app/ });
  await expect(help).toHaveAttribute("aria-haspopup", "dialog");
  await waitForSettled(page);
  const before = await help.boundingBox();

  // O Chrome oferece a instalação depois de a página abrir: o convite surge abaixo
  await page.evaluate(() => {
    const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
      prompt: () => Promise.resolve(),
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });
    window.dispatchEvent(event);
  });
  const invite = page.locator('aside[data-kind="install"]');
  await expect(invite).toBeVisible();
  const order = await page.evaluate(() => {
    const row = document.querySelector('[data-tour="ajuda"]');
    const aside = document.querySelector('aside[data-kind="install"]');
    return row && aside ? row.compareDocumentPosition(aside) & Node.DOCUMENT_POSITION_FOLLOWING : 0;
  });
  expect(order).toBeTruthy();
  expect((await help.boundingBox())?.y).toBe(before?.y);
});

test.describe("Como usar o app sem o pedaço do passeio", () => {
  // O service worker entregaria o pedaço do cache sem passar pela rota
  test.use({ serviceWorkers: "block" });

  test("avisa que está abrindo e, se o pedaço falhar, mostra o alerta", async ({ page }) => {
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(/\/HomeTour[-.]/, async (route) => {
      await held;
      await route.abort();
    });
    await page.goto("/");
    await expect(page.locator("main h1")).toBeVisible();
    await waitForSettled(page);

    // O nome do botão muda enquanto abre: localiza pelo alvo do passeio
    const help = page.locator('[data-tour="ajuda"]');
    await help.click();
    await expect(help).toHaveAttribute("aria-busy", "true");
    await expect(help).toContainText("Abrindo o passeio…");

    release();
    await expect(page.getByRole("alert").filter({ hasText: "Não foi possível abrir o passeio agora." })).toBeVisible();
    await expect(help).not.toHaveAttribute("aria-busy");
    await expect(help).toContainText("Como usar o app");
  });
});
