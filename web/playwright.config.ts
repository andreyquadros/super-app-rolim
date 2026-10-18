import { defineConfig, devices } from "@playwright/test";

// Testes E2E do PWA contra o build de produção + Firebase Emulator Suite.
// Rode pela raiz: npm run test:e2e (sobe emuladores, cria dados e testa).
export default defineConfig({
  testDir: "e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4180",
    serviceWorkers: "allow",
    trace: "retain-on-failure",
  },
  projects: [{ name: "celular", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: "npx vite build --mode e2e && npx vite preview --mode e2e",
    url: "http://localhost:4180",
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
