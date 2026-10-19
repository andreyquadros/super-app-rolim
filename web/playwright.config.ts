import { defineConfig, devices } from "@playwright/test";

// Testes E2E do PWA contra o build de produção + Firebase Emulator Suite.
// Rode pela raiz: npm run test:e2e (sobe emuladores, cria dados e testa).
const BASE_URL = "http://localhost:4180";

export default defineConfig({
  testDir: "e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    serviceWorkers: "allow",
    trace: "retain-on-failure",
    // Pessoa que já conhece o app: sem apresentação nem "Novidade"
    // (e2e/onboarding.spec.ts zera este estado para testar o primeiro acesso)
    storageState: {
      cookies: [],
      origins: [
        {
          origin: BASE_URL,
          localStorage: [
            { name: "rolim.onboarding", value: "v1" },
            { name: "rolim.firstSeen", value: "2026-01-01" },
            { name: "rolim.novidades", value: "2026-10-funerarias" },
          ],
        },
      ],
    },
  },
  projects: [
    { name: "celular", testIgnore: /visual\.spec\.ts/, use: { ...devices["Pixel 7"] } },
    { name: "telas", testMatch: /visual\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
    // Quem pede "reduzir movimento" no sistema usa o app do mesmo jeito
    { name: "movimento-reduzido", testMatch: /plantao\.spec\.ts/, use: { ...devices["Pixel 7"], contextOptions: { reducedMotion: "reduce" } } },
    // Safari do iPhone (WebKit): folhas <dialog>, barra verde e plantão
    { name: "iphone", testMatch: /(plantao|visual)\.spec\.ts/, use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: "npx vite build --mode e2e && npx vite preview --mode e2e",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
