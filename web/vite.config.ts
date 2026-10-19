/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const THEME_COLOR = "#0d7a49";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: { port: 5180, strictPort: true },
  preview: { port: 4180, strictPort: true },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 700,
    // Usado por scripts/check-bundle.mjs para medir o JavaScript inicial
    manifest: true,
  },
  plugins: [
    react(),
    VitePWA({
      // Service worker próprio: cache offline (Workbox) + push (FCM) num só arquivo.
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "prompt",
      injectRegister: false,
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2,webmanifest}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      devOptions: { enabled: true, type: "module", navigateFallback: "index.html" },
      includeAssets: ["favicon.ico", "apple-touch-icon-180x180.png", "logo.svg"],
      manifest: {
        id: "/",
        name: "Super App Rolim de Moura",
        short_name: "Rolim de Moura",
        description:
          "Zeladoria, ouvidoria, farmácias de plantão e comunicados da Prefeitura Municipal de Rolim de Moura.",
        lang: "pt-BR",
        dir: "ltr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: THEME_COLOR,
        background_color: "#f6f4ee",
        categories: ["government", "utilities"],
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          { name: "Nova solicitação de zeladoria", short_name: "Zeladoria", url: "/zeladoria/nova" },
          { name: "Farmácias de plantão", short_name: "Farmácias", url: "/farmacias" },
          { name: "Meus protocolos", short_name: "Protocolos", url: "/protocolos" },
        ],
      },
    }),
  ],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
