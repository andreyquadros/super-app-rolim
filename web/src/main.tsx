import "@fontsource-variable/public-sans";
import "@fontsource-variable/fraunces";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./theme/global.css";
import "./theme/motion.css";

import { Center, MantineProvider, Stack, Text, Title } from "@mantine/core";
import type { NotificationsProps } from "@mantine/notifications";
import { StrictMode, useEffect, useState, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { BootError } from "./components/LoadingScreen";
import { isFirebaseConfigured } from "./config/env";
import { recordSessionEntry } from "./features/onboarding/onboardingState";
import "./lib/installPrompt";
import { initNavMotion } from "./lib/navMotion";
import { applyTextSize, getTextSize } from "./lib/preferences";
import { cssVariablesResolver, theme } from "./theme/theme";

/**
 * Monta o contêiner de avisos flutuantes depois que o app abriu (fora do pacote
 * inicial). Sem React.lazy: se a conexão cair antes de o pedaço chegar, o erro
 * derrubaria o app inteiro; aqui ele só tenta de novo quando a conexão voltar.
 */
function DeferredNotifications() {
  const [Notifications, setNotifications] = useState<ComponentType<NotificationsProps> | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      import("@mantine/notifications").then(
        (m) => !cancelled && setNotifications(() => m.Notifications),
        () => !cancelled && window.addEventListener("online", load, { once: true }),
      );
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 300));
    idle(load);
    return () => {
      cancelled = true;
      window.removeEventListener("online", load);
    };
  }, []);
  // Embaixo, acima da barra de navegação: não cobre o cabeçalho no celular
  return Notifications && <Notifications position="bottom-center" zIndex={1000} />;
}

/** Baixa as telas das abas quando o aparelho fica ocioso (menos espera ao tocar). */
function preloadMainTabs() {
  // Economia de dados ou aparelho modesto: baixa só quando a pessoa abrir
  if (document.documentElement.dataset.motion === "lite") return;
  const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
  const preload = () =>
    idle(() => {
      const ignore = () => undefined;
      import("./pages/duty/DutyPage").catch(ignore);
      import("./pages/requests/MyRequestsPage").catch(ignore);
      import("./pages/notices/NoticesPage").catch(ignore);
    });
  // Só depois do load: em rede lenta não disputa banda com a primeira tela
  if (document.readyState === "complete") preload();
  else window.addEventListener("load", preload, { once: true });
}

/**
 * Aplica o CSS do app, que o index.html só pré-carrega (ver startupAssets no
 * vite.config.ts) para a abertura verde aparecer sem esperar por ele. Entra no
 * lugar do preload, antes do CSS das telas que o Vite acrescenta no fim do
 * <head>, e o React só monta depois que ele carrega: nada aparece sem estilo.
 */
function applyAppStyles(): Promise<void> {
  const preload = document.querySelector<HTMLLinkElement>("link[data-app-css]");
  // Em desenvolvimento o Vite injeta o CSS pelo próprio JavaScript
  if (!preload) return Promise.resolve();
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.crossOrigin = "";
  // O mesmo href relativo do index.html: o Vite procura link[href="/assets/…"]
  // antes de inserir o CSS de um import(); com a URL absoluta, inseria de novo
  link.setAttribute("href", preload.getAttribute("href") ?? preload.href);
  const loaded = new Promise<void>((resolve, reject) => {
    link.addEventListener("load", () => resolve(), { once: true });
    link.addEventListener("error", () => reject(new Error(`CSS do app não carregou: ${link.href}`)), { once: true });
  });
  preload.after(link);
  return loaded;
}

function MissingConfig() {
  return (
    <Center mih="100dvh" p="md">
      <Stack maw={480}>
        <Title order={1}>Configuração pendente</Title>
        <Text>
          Preencha o arquivo <code>web/.env.production</code> com os dados do projeto Firebase (veja <code>web/.env.example</code> e{" "}
          <code>docs/IMPLANTACAO.md</code>) e gere o app novamente.
        </Text>
      </Stack>
    </Center>
  );
}

const CHUNK_RELOAD_KEY = "rolim.chunkReload";
/** Uma recarga automática por vez: se falhar de novo logo depois, mostra o erro */
const CHUNK_RELOAD_WINDOW_MS = 30_000;

/**
 * Versão nova no ar e o aparelho pediu um pedaço da antiga: recarrega uma vez
 * (sessionStorage evita recarregar sem parar quando a rede está fora).
 */
function recoverFromStaleChunks() {
  window.addEventListener("vite:preloadError", (event) => {
    // Sem internet a falha é da rede, não de versão velha: recarregar
    // derrubaria o app (e o aviso "Sem internet") no meio do uso
    if (!navigator.onLine) return;
    try {
      const last = Number(window.sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? 0);
      if (Date.now() - last < CHUNK_RELOAD_WINDOW_MS) return;
      window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
    } catch {
      // sem sessionStorage não há como evitar o laço: deixa o erro aparecer
      return;
    }
    event.preventDefault();
    window.location.reload();
  });
}

const root = createRoot(document.getElementById("root")!);

async function start() {
  const styles = applyAppStyles();
  // Antes do roteador: o "voltar" do navegador vira transição "pop" e o
  // tamanho de texto escolhido já vale na primeira pintura
  initNavMotion();
  applyTextSize(getTextSize());
  recordSessionEntry();
  recoverFromStaleChunks();
  if (!isFirebaseConfigured) {
    await styles;
    root.render(
      <MantineProvider theme={theme}>
        <MissingConfig />
      </MantineProvider>,
    );
    return;
  }
  // Importa Firebase/rotas só após validar a configuração (no build, os
  // pedaços já vêm baixando desde o index.html: modulepreload)
  const [{ router }, { AuthProvider }] = await Promise.all([import("./router"), import("./auth/AuthProvider"), styles]);
  root.render(
    <StrictMode>
      <MantineProvider theme={theme} defaultColorScheme="auto" cssVariablesResolver={cssVariablesResolver}>
        <DeferredNotifications />
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </MantineProvider>
    </StrictMode>,
  );
  preloadMainTabs();
}

start().catch((error: unknown) => {
  // Detalhe técnico só no console; a pessoa vê a abertura com "Tentar de novo"
  console.error("Falha ao iniciar o app", error);
  root.render(<BootError />);
});
