import { expect, test, type Page } from "@playwright/test";

// Apresentação (§11): cada ilustração toca uma vez quando o slide fica ativo,
// para no quadro final e não repete ao voltar. Movimento reduzido e modo leve
// mostram o quadro final na hora. Primeiro acesso de verdade: sem o estado
// "já conhece o app" do playwright.config.ts.
test.use({ storageState: { cookies: [], origins: [] } });

const TITLES = ["Bem-vindo ao SUPER APP Rolim de Moura", "Viu um problema na rua? Avise.", "Acompanhe cada passo", "Farmácia e funerária de plantão", "Deixe do seu jeito"];
const LAST = TITLES.length - 1;
/** Cada cena dura cerca de 1,1 s no máximo */
const SCENE_MAX_MS = 1200;
/** Pedaço do passeio: HomeTour-<hash>.js no build, HomeTour.tsx no servidor de desenvolvimento */
const TOUR_CHUNK = /HomeTour(-[\w-]+\.js|\.tsx)(\?|$)/;
const WIDTHS = [320, 375, 768, 1024, 1440] as const;

interface SceneAnimation {
  name: string;
  state: string;
  time: number;
  end: number;
}

type ProbeWindow = Window & { __mainButton?: Element; __scopes?: string[] };

async function openWelcome(page: Page, path = "/") {
  await page.goto(path);
  await page.waitForURL((url) => url.pathname === "/boas-vindas");
  await expect(page.getByRole("heading", { name: TITLES[0] })).toBeVisible();
  // O título pinta antes dos efeitos do React: sem esperar dois quadros, uma
  // seta enviada logo cedo (WebKit sob carga) chega antes do ouvinte de teclado
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

/** Setas trocam de slide; o foco vai para o título do slide novo. */
async function goToSlide(page: Page, from: number, to: number) {
  const key = to > from ? "ArrowRight" : "ArrowLeft";
  for (let i = from; i !== to; i += to > from ? 1 : -1) {
    await page.keyboard.press(key);
    await expect(page.getByRole("heading", { name: TITLES[i + (to > from ? 1 : -1)] })).toBeFocused();
  }
}

/** Animações das cenas (keyframes onb-*) dentro de um slide, inclusive as terminadas. */
function sceneAnimations(page: Page, slide: number): Promise<SceneAnimation[]> {
  return page.evaluate((i) => {
    const root = document.querySelectorAll("[aria-roledescription='slide']")[i];
    return document.getAnimations().flatMap((animation) => {
      if (!(animation instanceof CSSAnimation) || !animation.animationName.includes("onb-")) return [];
      const target = (animation.effect as KeyframeEffect | null)?.target;
      if (!target || !root?.contains(target)) return [];
      const end = Number(animation.effect?.getComputedTiming().endTime ?? 0);
      return [{ name: animation.animationName, state: animation.playState, time: Number(animation.currentTime ?? 0), end }];
    });
  }, slide);
}

async function waitForScene(page: Page, slide: number) {
  await page.waitForFunction(
    (i) => {
      const root = document.querySelectorAll("[aria-roledescription='slide']")[i];
      return document
        .getAnimations()
        .filter((a) => a instanceof CSSAnimation && a.animationName.includes("onb-") && root?.contains((a.effect as KeyframeEffect).target))
        .every((a) => a.playState === "finished");
    },
    slide,
    { timeout: 5_000 },
  );
}

/** Duas voltas ociosas do navegador (a pré-carga do passeio usa uma; as chamadas saem na ordem). */
async function idleTwice(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        // Sem nenhum quadro pedido, o Chromium sem tela pode nunca abrir um período ocioso
        let waiting = true;
        const nudge = () => {
          if (waiting) requestAnimationFrame(nudge);
        };
        requestAnimationFrame(nudge);
        const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 300));
        idle(() =>
          window.setTimeout(() =>
            idle(() => {
              waiting = false;
              resolve();
            }),
          ),
        );
      }),
  );
}

/** Partes de um slide com animação no estilo calculado (inclui o ::before da pilha do slide 3). */
function animatedParts(page: Page, slide: number): Promise<string[]> {
  return page.evaluate((i) => {
    const root = document.querySelectorAll("[aria-roledescription='slide']")[i];
    if (!root) return ["slide ausente"];
    const parts: string[] = [];
    for (const el of root.querySelectorAll("svg, svg *, [data-play], [data-play] *")) {
      if (getComputedStyle(el).animationName !== "none") parts.push(`${el.tagName} ${el.getAttribute("class") ?? ""}`);
      if (el.matches("[data-play], [data-play] *") && getComputedStyle(el, "::before").animationName !== "none") parts.push(`${el.tagName}::before`);
    }
    return parts.filter((part) => !/segment/.test(part));
  }, slide);
}

test.describe("movimento liberado", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === "movimento-reduzido", "este projeto testa o movimento reduzido");
  });

  test("cada cena toca uma vez, termina em até 1,2 s e não repete ao voltar", async ({ page }) => {
    await openWelcome(page);
    const first = await sceneAnimations(page, 0);
    expect(first.length).toBeGreaterThanOrEqual(9);
    for (const animation of first) expect(animation.end, animation.name).toBeLessThanOrEqual(SCENE_MAX_MS);

    // Até ficar ativo, o slide seguinte espera no primeiro quadro
    const waiting = await sceneAnimations(page, 1);
    expect(waiting.length).toBeGreaterThan(0);
    for (const animation of waiting) expect(animation, animation.name).toMatchObject({ state: "paused", time: 0 });
    await waitForScene(page, 0);

    for (let i = 1; i <= LAST; i++) {
      await goToSlide(page, i - 1, i);
      const scene = await sceneAnimations(page, i);
      expect(scene.length, `cena do slide ${i + 1}`).toBeGreaterThan(0);
      for (const animation of scene) expect(animation.end, animation.name).toBeLessThanOrEqual(SCENE_MAX_MS);
      await waitForScene(page, i);
    }

    // Voltar até o primeiro: as cenas ficam no quadro final, sem recomeçar
    await goToSlide(page, LAST, 0);
    for (let i = 0; i <= LAST; i++) {
      for (const animation of await sceneAnimations(page, i)) {
        expect(animation.state, `${animation.name} no slide ${i + 1}`).not.toBe("running");
        expect(animation.time, `${animation.name} no slide ${i + 1}`).toBeGreaterThanOrEqual(animation.end - 1);
      }
    }
  });

  test("nenhum nó animado do SVG tem o atributo transform e os títulos ficam parados", async ({ page }) => {
    await openWelcome(page);
    const report = await page.evaluate(() => {
      const moving = [...document.querySelectorAll("main svg *")].filter((el) => {
        const style = getComputedStyle(el);
        const transition = style.transitionProperty.includes("transform") && Number.parseFloat(style.transitionDuration) > 0;
        return style.animationName !== "none" || transition;
      });
      return { count: moving.length, withTransform: moving.filter((el) => el.hasAttribute("transform")).map((el) => el.outerHTML.slice(0, 80)) };
    });
    expect(report.count).toBeGreaterThanOrEqual(20);
    expect(report.withTransform).toEqual([]);

    // O h2 de cada slide (o LCP do slide 1) e o texto nunca animam
    const still = await page.evaluate(() =>
      [...document.querySelectorAll("[aria-roledescription='slide'] :is(h2, h2 *, p)")].filter(
        (el) => getComputedStyle(el).animationName !== "none" || el.getAnimations().length > 0,
      ).length,
    );
    expect(still).toBe(0);
  });

  test("o pino do slide 1 começa inteiro dentro do desenho e visível", async ({ page }) => {
    await openWelcome(page);
    // Primeiro quadro da queda: o <svg> recorta o que passa da borda de cima
    const first = await page.evaluate(() => {
      const drop = document.querySelector("[aria-roledescription='slide'] svg g[transform^='translate(120 14)']")?.parentElement;
      const svg = drop?.closest("svg");
      if (!drop || !svg) return null;
      const animations = drop.getAnimations();
      for (const animation of animations) {
        animation.pause();
        animation.currentTime = 0;
      }
      const top = (drop.querySelector("path")?.getBoundingClientRect().top ?? 0) - svg.getBoundingClientRect().top;
      return { animations: animations.length, top, opacity: Number(getComputedStyle(drop).opacity) };
    });
    expect(first?.animations).toBe(1);
    expect(first?.top).toBeGreaterThanOrEqual(0);
    expect(first?.opacity).toBeGreaterThan(0);
  });

  test("só o slide ativo leva onb-hero-vt e a faixa da marca é a app-bar-vt", async ({ page }) => {
    await openWelcome(page);
    for (let i = 0; i <= LAST; i++) {
      if (i > 0) await goToSlide(page, i - 1, i);
      const hero = await page.evaluate((index) => {
        const all = document.querySelectorAll(".onb-hero-vt");
        const active = document.querySelectorAll("[aria-roledescription='slide']")[index];
        return { count: all.length, inActive: all.length === 1 && !!active?.contains(all[0]), bars: document.querySelectorAll(".app-bar-vt").length };
      }, i);
      expect(hero, `slide ${i + 1}`).toEqual({ count: 1, inActive: true, bars: 1 });
    }
  });

  test("o check do tamanho só anima depois do primeiro toque", async ({ page }) => {
    await openWelcome(page);
    await goToSlide(page, 0, LAST);
    const group = page.getByRole("radiogroup", { name: "Tamanho do texto" });
    const checkAnimation = () =>
      group.evaluate((el) => {
        const check = el.querySelector("input:checked")?.nextElementSibling;
        return check ? getComputedStyle(check).animationName : "sem check";
      });
    expect(await group.getAttribute("data-touched")).toBeNull();
    expect(await checkAnimation()).toBe("none");

    await page.getByRole("radio", { name: "Grande", exact: true }).check();
    await expect(group).toHaveAttribute("data-touched", "true");
    expect(await checkAnimation()).toContain("size-check");
  });

  test("trocar para Começar a usar não tira o foco do título nem remonta o botão", async ({ page }) => {
    await openWelcome(page);
    await goToSlide(page, 0, 1);
    // De Próximo para Próximo, o rótulo não anima
    const label = () => page.getByRole("button", { name: /^(Próximo|Começar a usar)$/ }).locator(":scope > span");
    expect(await label().evaluate((el) => getComputedStyle(el).animationName)).toBe("none");

    await goToSlide(page, 1, LAST - 1);
    const next = page.getByRole("button", { name: "Próximo" });
    await next.evaluate((el) => {
      (window as ProbeWindow).__mainButton = el;
    });
    await next.click();
    const title = page.getByRole("heading", { name: TITLES[LAST] });
    await expect(title).toBeFocused();
    const start = page.getByRole("button", { name: "Começar a usar" });
    await expect(start).toBeVisible();
    expect(await start.evaluate((el) => el === (window as ProbeWindow).__mainButton)).toBe(true);
    expect(await label().evaluate((el) => getComputedStyle(el).animationName)).toContain("onb-label");
    await page.waitForFunction(() => document.getAnimations().every((a) => !(a instanceof CSSAnimation) || !a.animationName.includes("onb-label")));
    await expect(title).toBeFocused();

    // E de volta: o mesmo botão, rótulo "Próximo"
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("heading", { name: TITLES[LAST - 1] })).toBeFocused();
    expect(await page.getByRole("button", { name: "Próximo" }).evaluate((el) => el === (window as ProbeWindow).__mainButton)).toBe(true);
  });

  test("no último slide, o pedaço do passeio é baixado no tempo ocioso", async ({ page }) => {
    const early: string[] = [];
    page.on("request", (request) => {
      if (TOUR_CHUNK.test(request.url())) early.push(request.url());
    });
    await openWelcome(page);
    await goToSlide(page, 0, LAST - 1);
    expect(early).toEqual([]);
    const requested = page.waitForRequest(TOUR_CHUNK);
    await goToSlide(page, LAST - 1, LAST);
    await requested;
  });
});

test.describe("modo leve", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "movimento-reduzido", "este projeto testa o movimento reduzido");
    // Aparelho de 1 GB: o main.tsx liga <html data-motion="lite">
    await page.addInitScript(() => Object.defineProperty(navigator, "deviceMemory", { configurable: true, get: () => 1 }));
  });

  test("as ilustrações ficam paradas e o passeio não é baixado", async ({ page }) => {
    const tour: string[] = [];
    page.on("request", (request) => {
      if (TOUR_CHUNK.test(request.url())) tour.push(request.url());
    });
    await openWelcome(page);
    await expect(page.locator("html")).toHaveAttribute("data-motion", "lite");
    for (let i = 0; i <= LAST; i++) {
      if (i > 0) await goToSlide(page, i - 1, i);
      expect(await animatedParts(page, i), `slide ${i + 1}`).toEqual([]);
      expect(await sceneAnimations(page, i)).toEqual([]);
    }
    // Uma pré-carga, se houvesse, já teria pedido o pedaço
    await idleTwice(page);
    expect(tour).toEqual([]);
  });
});

test.describe("movimento reduzido", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === "celular", "o projeto movimento-reduzido cobre este caso");
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`os 5 slides mostram o quadro final, sem animação (${scheme === "light" ? "claro" : "escuro"})`, async ({ page }) => {
      test.slow();
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: width < 768 ? 740 : 900 });
        await page.goto("/boas-vindas");
        await expect(page.getByRole("heading", { name: TITLES[0] })).toBeVisible();
        for (let i = 0; i <= LAST; i++) {
          if (i > 0) await goToSlide(page, i - 1, i);
          expect(await animatedParts(page, i), `slide ${i + 1} em ${width}px`).toEqual([]);
          await expect.poll(() => page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length)).toBe(0);
          await test.info().attach(`${width}px ${scheme} slide ${i + 1}`, { body: await page.screenshot(), contentType: "image/png" });
        }
      }
    });
  }
});

test.describe("ligação com o passeio", () => {
  test("Começar a usar deixa o passeio pendente e leva a faixa verde para a Início", async ({ page }) => {
    await openWelcome(page);
    await page.evaluate(() => {
      const scopes: string[] = [];
      (window as ProbeWindow).__scopes = scopes;
      new MutationObserver(() => scopes.push(document.documentElement.dataset.navScope ?? "")).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-nav-scope"],
      });
    });
    await goToSlide(page, 0, LAST);
    await page.getByRole("button", { name: "Começar a usar" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    expect(await page.evaluate(() => localStorage.getItem("rolim.passeio"))).toBe("pendente");
    expect(await page.evaluate(() => (window as ProbeWindow).__scopes)).toContain("welcome");
    // No celular os blocos têm grupo próprio e pintam acima do cabeçalho que encolhe
    await expect(page.locator(".home-tiles-vt")).toHaveCSS("view-transition-name", "welcome-tiles");
  });

  test("Pular e Esc não deixam o passeio pendente", async ({ page }) => {
    await openWelcome(page);
    await page.getByRole("button", { name: "Pular" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    expect(await page.evaluate(() => localStorage.getItem("rolim.passeio"))).toBeNull();

    await page.evaluate(() => localStorage.removeItem("rolim.onboarding"));
    await page.goto("/boas-vindas");
    await expect(page.getByRole("heading", { name: TITLES[0] })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.waitForURL((url) => url.pathname === "/");
    expect(await page.evaluate(() => localStorage.getItem("rolim.passeio"))).toBeNull();
  });

  test("Entrar ou criar conta deixa o passeio pendente", async ({ page }) => {
    await openWelcome(page);
    await goToSlide(page, 0, LAST);
    await page.getByRole("button", { name: "Entrar ou criar conta" }).click();
    await page.waitForURL((url) => url.pathname === "/entrar");
    expect(await page.evaluate(() => localStorage.getItem("rolim.passeio"))).toBe("pendente");
  });

  test("revendo pelo Perfil, nada fica pendente e o passeio não é baixado", async ({ page }) => {
    const tour: string[] = [];
    page.on("request", (request) => {
      if (TOUR_CHUNK.test(request.url())) tour.push(request.url());
    });
    await page.goto("/boas-vindas?rever=1");
    await expect(page.getByRole("heading", { name: TITLES[0] })).toBeVisible();
    await goToSlide(page, 0, LAST);
    await idleTwice(page);
    await page.getByRole("button", { name: "Começar a usar" }).click();
    await page.waitForURL((url) => url.pathname !== "/boas-vindas");
    expect(await page.evaluate(() => localStorage.getItem("rolim.passeio"))).toBeNull();
    expect(tour).toEqual([]);
  });
});

test.describe("instalação", () => {
  test("instalar com a tela aberta mostra a confirmação no próprio grupo", async ({ page }) => {
    await openWelcome(page);
    await goToSlide(page, 0, LAST);
    const group = page.getByRole("region", { name: "Colocar o app na tela do celular" });
    await expect(group).toBeVisible();
    await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
    await expect(group.getByRole("status")).toHaveText("Pronto! O app está na tela do celular.");
    await expect(group).toBeVisible();
  });

  test("quem abre com o app já instalado não vê o grupo", async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, "standalone", { configurable: true, get: () => true }));
    await openWelcome(page);
    await goToSlide(page, 0, LAST);
    await expect(page.getByRole("radiogroup", { name: "Tamanho do texto" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Colocar o app na tela do celular" })).toHaveCount(0);
  });
});
