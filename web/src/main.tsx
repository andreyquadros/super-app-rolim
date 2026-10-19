import "@fontsource-variable/public-sans";
import "@fontsource-variable/fraunces";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./theme/global.css";
import "./theme/motion.css";

import { Center, MantineProvider, Stack, Text, Title } from "@mantine/core";
import { lazy, StrictMode, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { isFirebaseConfigured } from "./config/env";
import { recordSessionEntry } from "./features/onboarding/onboardingState";
import "./lib/installPrompt";
import { initNavMotion } from "./lib/navMotion";
import { applyTextSize, getTextSize } from "./lib/preferences";
import { cssVariablesResolver, theme } from "./theme/theme";

const Notifications = lazy(() => import("@mantine/notifications").then((m) => ({ default: m.Notifications })));

/** Monta o contêiner de avisos flutuantes depois que o app abriu (fora do pacote inicial). */
function DeferredNotifications() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 300));
    idle(() => setReady(true));
  }, []);
  if (!ready) return null;
  return (
    <Suspense fallback={null}>
      {/* Embaixo, acima da barra de navegação: não cobre o cabeçalho no celular */}
      <Notifications position="bottom-center" zIndex={1000} />
    </Suspense>
  );
}

/** Baixa as telas das abas quando o aparelho fica ocioso (menos espera ao tocar). */
function preloadMainTabs() {
  // Economia de dados ou aparelho modesto: baixa só quando a pessoa abrir
  if (document.documentElement.dataset.motion === "lite") return;
  const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
  idle(() => {
    const ignore = () => undefined;
    import("./pages/duty/DutyPage").catch(ignore);
    import("./pages/requests/MyRequestsPage").catch(ignore);
    import("./pages/notices/NoticesPage").catch(ignore);
  });
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

async function start() {
  // Antes do roteador: o "voltar" do navegador vira transição "pop" e o
  // tamanho de texto escolhido já vale na primeira pintura
  initNavMotion();
  applyTextSize(getTextSize());
  recordSessionEntry();
  const root = createRoot(document.getElementById("root")!);
  if (!isFirebaseConfigured) {
    root.render(
      <MantineProvider theme={theme}>
        <MissingConfig />
      </MantineProvider>,
    );
    return;
  }
  // Importa Firebase/rotas só após validar a configuração
  const [{ router }, { AuthProvider }] = await Promise.all([import("./router"), import("./auth/AuthProvider")]);
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
  document.body.textContent = `Não foi possível iniciar o aplicativo: ${error instanceof Error ? error.message : String(error)}`;
});
