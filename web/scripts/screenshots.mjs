// Prints das telas para o README (docs/screenshots/).
// Precisa do app rodando com os emuladores e os dados de demonstração:
//   npm run emulators   (na raiz)      npm run seed   (na raiz)
//   npm --prefix web run dev            node web/scripts/screenshots.mjs
// Endereço do app: SCREENSHOTS_URL (padrão http://localhost:5180).
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const BASE = process.env.SCREENSHOTS_URL ?? "http://localhost:5180";
const OUT = fileURLToPath(new URL("../../docs/screenshots/", import.meta.url));
const PASSWORD = process.env.E2E_PASSWORD ?? "rolim-dev-2026";
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const TABLET = { viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, isMobile: false, hasTouch: true };
const DESKTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };

/** Quem já conhece o app: sem apresentação nem "Novidade". */
function returningUser() {
  localStorage.setItem("rolim.onboarding", "v1");
  localStorage.setItem("rolim.firstSeen", "2026-01-01");
  localStorage.setItem("rolim.novidades", "2026-10-funerarias");
  localStorage.setItem("rolim.installDismissed", "1");
  localStorage.setItem("rolim.pushInviteDismissed", "1");
}

/** Espera a tela assentar: dados na tela, entradas animadas e transição concluídas. */
async function settle(page) {
  await page.waitForFunction(() => {
    try {
      if (document.documentElement.matches(":active-view-transition")) return false;
    } catch {
      // navegador sem o seletor: segue
    }
    return (
      !document.querySelector(".shimmer, .boot") &&
      document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getComputedTiming().endTime === Infinity)
    );
  });
  // Pinta os mapas e as fotos que ainda estejam chegando
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(400);
}

async function save(page, name, width) {
  const png = await page.screenshot();
  await sharp(png).resize({ width }).png({ compressionLevel: 9, palette: true, quality: 92 }).toFile(`${OUT}${name}.png`);
  console.log(`  ${name}.png`);
}

async function signIn(page, email, next) {
  await page.goto(`${BASE}/entrar?next=${encodeURIComponent(next)}`);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((url) => url.pathname === next);
  await settle(page);
}

async function newPage(browser, device, { colorScheme = "light", returning = true } = {}) {
  const context = await browser.newContext({ ...device, colorScheme, locale: "pt-BR", timezoneId: "America/Porto_Velho" });
  if (returning) await context.addInitScript(returningUser);
  return { context, page: await context.newPage() };
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
console.log(`Prints em ${OUT}`);

// Primeiro acesso: a apresentação
{
  const { context, page } = await newPage(browser, PHONE, { returning: false });
  await page.goto(`${BASE}/`);
  await page.waitForURL(/boas-vindas/);
  await settle(page);
  await save(page, "apresentacao", 600);
  await context.close();
}

// Telas públicas (sem entrar)
{
  const { context, page } = await newPage(browser, PHONE);
  for (const [name, path] of [
    ["plantao-farmacias", "/plantao/farmacias"],
    ["plantao-funerarias", "/plantao/funerarias"],
    ["avisos", "/comunicados"],
  ]) {
    await page.goto(`${BASE}${path}`);
    await settle(page);
    await save(page, name, 600);
  }
  await context.close();
}

// Cidadã logada (Maria, dados de demonstração)
{
  const { context, page } = await newPage(browser, PHONE);
  await signIn(page, "cidadao@rolim.test", "/");
  await save(page, "inicio", 600);

  await page.getByRole("button", { name: "Solicitar" }).first().click();
  await page.locator("dialog[open]").waitFor();
  await settle(page);
  await save(page, "solicitar", 600);
  await page.keyboard.press("Escape");
  await page.locator("dialog[open]").waitFor({ state: "detached" }).catch(() => undefined);

  await page.goto(`${BASE}/zeladoria/nova`);
  await settle(page);
  await save(page, "problema-na-rua", 600);

  await page.goto(`${BASE}/protocolos?filtro=todos`);
  await settle(page);
  await save(page, "pedidos", 600);

  await page.getByText("Poste apagado em frente à escola", { exact: true }).click();
  await page.waitForURL(/\/protocolos\/.+\/.+/);
  await settle(page);
  await save(page, "pedido", 600);

  await page.goto(`${BASE}/perfil`);
  await settle(page);
  await save(page, "perfil", 600);
  await context.close();
}

// Tema escuro
{
  const { context, page } = await newPage(browser, PHONE, { colorScheme: "dark" });
  await signIn(page, "cidadao@rolim.test", "/");
  await save(page, "inicio-escuro", 600);
  await page.goto(`${BASE}/plantao/farmacias`);
  await settle(page);
  await save(page, "plantao-escuro", 600);
  await context.close();
}

// Tablet: trilho lateral
{
  const { context, page } = await newPage(browser, TABLET);
  await signIn(page, "cidadao@rolim.test", "/");
  await save(page, "tablet-inicio", 1400);
  await context.close();
}

// Painel da prefeitura
{
  const { context, page } = await newPage(browser, DESKTOP);
  await signIn(page, "admin@rolim.test", "/painel/inicio");
  await save(page, "painel-visao-geral", 1600);
  await page.goto(`${BASE}/painel/zeladoria`);
  await settle(page);
  await save(page, "painel-zeladoria", 1600);
  await page.goto(`${BASE}/painel/meus-plantoes`);
  await settle(page);
  await save(page, "painel-plantoes", 1600);
  await context.close();
}

await browser.close();

// Capa: três telas lado a lado sobre o verde do app
const PHONE_W = 380;
const PHONE_H = Math.round((844 / 390) * PHONE_W);
const RADIUS = 36;
const mask = Buffer.from(`<svg width="${PHONE_W}" height="${PHONE_H}"><rect width="${PHONE_W}" height="${PHONE_H}" rx="${RADIUS}" ry="${RADIUS}"/></svg>`);
async function framed(name) {
  return sharp(`${OUT}${name}.png`)
    .resize({ width: PHONE_W, height: PHONE_H })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}
const W = 1600;
const H = 1000;
const background = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d7a49"/><stop offset="1" stop-color="#0a5c37"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <g fill="none" stroke="#ffffff" stroke-opacity=".12" stroke-width="2">
    <path d="M0 760C200 720 600 720 800 760S1400 800 1600 760"/><path d="M0 830C200 790 600 790 800 830S1400 870 1600 830"/>
  </g>
</svg>`);
const phones = await Promise.all(["apresentacao", "inicio", "plantao-farmacias"].map(framed));
const shadow = Buffer.from(`<svg width="${PHONE_W + 80}" height="${PHONE_H + 80}"><filter id="b"><feGaussianBlur stdDeviation="18"/></filter><rect x="40" y="52" width="${PHONE_W}" height="${PHONE_H}" rx="${RADIUS}" fill="#000" fill-opacity=".35" filter="url(#b)"/></svg>`);
const top = Math.round((H - PHONE_H) / 2);
const gap = 70;
const left0 = Math.round((W - (PHONE_W * 3 + gap * 2)) / 2);
const layers = phones.flatMap((input, i) => {
  const left = left0 + i * (PHONE_W + gap);
  const lift = i === 1 ? -24 : 12;
  return [
    { input: shadow, left: left - 40, top: top + lift - 40 },
    { input, left, top: top + lift },
  ];
});
await sharp(background).composite(layers).png({ compressionLevel: 9, palette: true, quality: 92 }).toFile(`${OUT}capa.png`);
console.log("  capa.png");
