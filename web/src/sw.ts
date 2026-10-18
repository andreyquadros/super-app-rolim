/// <reference lib="webworker" />
// Service worker único: cache offline (Workbox) + avisos em segundo plano (FCM).
import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging/sw";
import { ExpirationPlugin } from "workbox-expiration";
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";
import { firebaseConfig, isPushConfigured } from "./config/env";

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// SPA: qualquer navegação abre o app (exceto as rotas reservadas do Firebase)
registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html"), { denylist: [/^\/__\//] }));

// Mapa base: guarda os blocos já vistos para funcionar com sinal fraco
registerRoute(
  ({ url }) => url.hostname.endsWith("tile.openstreetmap.org"),
  new CacheFirst({
    cacheName: "map-tiles",
    plugins: [new ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: 14 * 24 * 3600 })],
  }),
);

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
});

// Com a mensagem "notification" + webpush.fcmOptions.link enviada pelas
// Cloud Functions, o SDK exibe o aviso e abre o link ao tocar.
if (isPushConfigured) {
  getMessaging(initializeApp(firebaseConfig));
}
