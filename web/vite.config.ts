/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import type { OutputChunk } from "rollup";
import { defineConfig, type HtmlTagDescriptor, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const THEME_COLOR = "#0d7a49";

/** Importados pelo main.tsx logo ao abrir (os mesmos de scripts/check-bundle.mjs) */
const STARTUP_MODULES = [/\/src\/router\.tsx$/, /\/src\/auth\/AuthProvider\.tsx$/];

/**
 * Primeira visita em rede lenta:
 * - o CSS do app não bloqueia mais a abertura verde: vira preload e o main.tsx
 *   o aplica antes de montar o React (nada aparece sem estilo);
 * - os pedaços que o main.tsx importa ao abrir (rotas e Firebase) começam a
 *   baixar junto com a entrada, e não só depois que ela é executada.
 */
function startupAssets(): Plugin {
  return {
    name: "rolim-startup-assets",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html, { bundle, chunk: entry }) {
        if (!bundle || !entry) return html;
        const chunks = new Map(
          Object.values(bundle)
            .filter((c): c is OutputChunk => c.type === "chunk")
            .map((c) => [c.fileName, c]),
        );
        const startup = new Set<string>();
        const visit = (file: string) => {
          if (file === entry.fileName || startup.has(file) || !chunks.has(file)) return;
          startup.add(file);
          chunks.get(file)!.imports.forEach(visit);
        };
        for (const file of entry.dynamicImports) {
          if (chunks.get(file)?.moduleIds.some((id) => STARTUP_MODULES.some((re) => re.test(id)))) visit(file);
        }

        const tags: HtmlTagDescriptor[] = [];
        for (const file of startup) {
          tags.push({ tag: "link", attrs: { rel: "modulepreload", crossorigin: true, href: `/${file}` }, injectTo: "head" });
          for (const css of chunks.get(file)!.viteMetadata?.importedCss ?? []) {
            tags.push({ tag: "link", attrs: { rel: "preload", as: "style", crossorigin: true, href: `/${css}` }, injectTo: "head" });
          }
        }

        let appCss = 0;
        const out = html.replace(/<link rel="stylesheet" crossorigin href="(\/assets\/index-[\w-]+\.css)">/g, (_, href: string) => {
          appCss += 1;
          return `<link rel="preload" as="style" crossorigin href="${href}" data-app-css>`;
        });
        if (appCss !== 1) throw new Error(`startupAssets: esperava 1 CSS de entrada no index.html, achou ${appCss}`);
        return { html: out, tags };
      },
    },
  };
}

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
    startupAssets(),
    VitePWA({
      // Service worker próprio: cache offline (Workbox) + push (FCM) num só arquivo.
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "prompt",
      injectRegister: false,
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,png,jpg,webp,ico,woff2,webmanifest}"],
        // Imagem de compartilhamento não precisa ir para o cache offline
        globIgnores: ["og-image.png", "loja/**", "apple-splash-*"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      devOptions: { enabled: true, type: "module", navigateFallback: "index.html" },
      includeAssets: ["favicon.ico", "apple-touch-icon-180x180.png", "logo.svg", "logo-mono.svg"],
      manifest: {
        id: "/",
        name: "SUPER APP Rolim de Moura",
        short_name: "SUPER APP",
        description:
          "Problemas na rua, ouvidoria, farmácias e funerárias de plantão e avisos. Uma iniciativa da Prefeitura de Rolim de Moura junto com o Projeto Cidades Inteligentes.",
        lang: "pt-BR",
        dir: "ltr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: THEME_COLOR,
        background_color: THEME_COLOR,
        launch_handler: { client_mode: "navigate-existing" },
        categories: ["government", "utilities"],
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          { name: "Problema na rua", short_name: "Problema na rua", url: "/zeladoria/nova" },
          { name: "Farmácia de plantão", short_name: "Farmácias", url: "/plantao/farmacias" },
          { name: "Funerária de plantão", short_name: "Funerárias", url: "/plantao/funerarias" },
          { name: "Meus pedidos", short_name: "Pedidos", url: "/protocolos" },
        ],
      },
    }),
  ],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
