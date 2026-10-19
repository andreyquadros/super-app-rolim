import type { ComponentType, ReactNode } from "react";
import { createBrowserRouter, Navigate, Outlet, redirect, ScrollRestoration, useNavigation, type RouteObject } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { RequireCitizen, RequireStaff, RequireUser } from "@/auth/guards";
import { ForegroundPush, OfflineBanner, UpdatePrompt } from "@/components/AppStatus";
import { LoadingScreen } from "@/components/LoadingScreen";
import { RouteError } from "@/components/RouteError";
import { DUTY_COPY, DUTY_META, dutyTypeFromSlug } from "@/domain/duty";
import { shouldShowOnboarding } from "@/features/onboarding/onboardingState";
import { CitizenLayout } from "@/layouts/CitizenLayout";
import type { RouteHandle } from "@/layouts/routeHandle";
import { lastDutyPath } from "@/lib/dutyMemory";
import HomePage from "@/pages/HomePage";

type Loader = () => Promise<{ default: ComponentType }>;

/** Rota carregada sob demanda (code splitting por página). */
function page(load: Loader): Pick<RouteObject, "lazy"> {
  return { lazy: async () => ({ Component: (await load()).default }) };
}

function Root() {
  const navigation = useNavigation();
  return (
    <>
      {/* Cada tela guarda a própria rolagem (voltar a uma aba volta ao mesmo ponto) */}
      <ScrollRestoration getKey={(location) => location.pathname} />
      {navigation.state === "loading" && <div className="route-progress" aria-hidden />}
      <OfflineBanner />
      <Outlet />
      <UpdatePrompt />
      <ForegroundPush />
    </>
  );
}

/** /painel → primeira área disponível para o perfil. */
function AdminIndex() {
  const { isManager } = useAuth();
  return <Navigate to={isManager ? "/painel/inicio" : "/painel/meus-plantoes"} replace />;
}

const citizen = (element: ReactNode) => <RequireCitizen>{element}</RequireCitizen>;

const handle = (value: RouteHandle): { handle: RouteHandle } => ({ handle: value });
const HOME = { to: "/", label: "Início" };
const flow = (title: string, back = HOME) => handle({ chrome: "flow", title, back });
const root = (title: string) => handle({ chrome: "root", title });

/** "/plantao" abre no último tipo visto nesta sessão. */
function DutyIndex() {
  return <Navigate to={lastDutyPath()} replace />;
}

export const router = createBrowserRouter([
  {
    element: <Root />,
    errorElement: <RouteError />,
    // Exibido enquanto a primeira tela (carregada sob demanda) chega
    hydrateFallbackElement: <LoadingScreen />,
    children: [
      // Apresentação dos primeiros acessos: tela cheia, fora da casca do app
      { path: "boas-vindas", ...page(() => import("@/features/onboarding/OnboardingPage")) },
      {
        element: <CitizenLayout />,
        children: [
          {
            index: true,
            element: <HomePage />,
            ...handle({ chrome: "home" }),
            // Primeiro acesso pela tela inicial: apresentação antes (sem piscar a Início)
            loader: ({ request }) => (shouldShowOnboarding(new URL(request.url)) ? redirect("/boas-vindas") : null),
          },
          { path: "entrar", ...page(() => import("@/pages/auth/LoginPage")), ...flow("Entrar") },
          { path: "cadastro", ...page(() => import("@/pages/auth/RegisterPage")), ...flow("Criar conta") },
          {
            path: "recuperar-senha",
            ...page(() => import("@/pages/auth/ResetPasswordPage")),
            ...flow("Recuperar senha", { to: "/entrar", label: "Entrar" }),
          },
          {
            path: "completar-cadastro",
            element: (
              <RequireUser>
                <Outlet />
              </RequireUser>
            ),
            children: [{ index: true, ...page(() => import("@/pages/auth/CompleteProfilePage")), ...flow("Completar cadastro") }],
          },
          { path: "plantao", element: <DutyIndex /> },
          {
            path: "plantao/:tipo",
            ...page(() => import("@/pages/duty/DutyPage")),
            ...handle({
              chrome: "root",
              title: (params) => {
                const type = dutyTypeFromSlug(params.tipo);
                return type ? DUTY_COPY[type].title : "Página não encontrada";
              },
            }),
          },
          { path: "farmacias", element: <Navigate to={DUTY_META.PHARMACY.path} replace /> },
          { path: "funerarias", element: <Navigate to={DUTY_META.FUNERAL.path} replace /> },
          { path: "comunicados", ...page(() => import("@/pages/notices/NoticesPage")), ...root("Avisos") },
          {
            path: "privacidade",
            ...page(() => import("@/pages/PrivacyPage")),
            ...handle({ chrome: "push", title: "Privacidade", back: { to: "/", label: "Voltar" } }),
          },
          {
            element: citizen(<Outlet />),
            children: [
              { path: "zeladoria/nova", ...page(() => import("@/pages/issues/NewIssuePage")), ...flow("Problema na rua") },
              { path: "ouvidoria/nova", ...page(() => import("@/pages/ombudsman/NewOmbudsmanPage")), ...flow("Ouvidoria") },
              { path: "protocolos", ...page(() => import("@/pages/requests/MyRequestsPage")), ...root("Meus pedidos") },
              {
                path: "protocolos/:kind/:id",
                ...page(() => import("@/pages/requests/RequestDetailPage")),
                ...handle({ chrome: "push", title: "Pedido", back: { to: "/protocolos", label: "Pedidos" } }),
              },
            ],
          },
          {
            path: "perfil",
            element: (
              <RequireUser>
                <Outlet />
              </RequireUser>
            ),
            children: [
              { index: true, ...page(() => import("@/pages/profile/ProfilePage")), ...root("Perfil") },
              {
                path: "dados",
                ...page(() => import("@/pages/profile/ProfileDataPage")),
                ...handle({ chrome: "push", title: "Meus dados", back: { to: "/perfil", label: "Perfil" } }),
              },
            ],
          },
          {
            path: "*",
            ...page(() => import("@/pages/StatusPages")),
            ...handle({ chrome: "push", title: "Página não encontrada", back: HOME }),
          },
        ],
      },
      {
        path: "painel",
        lazy: async () => {
          const { AdminLayout } = await import("@/layouts/AdminLayout");
          return {
            Component: () => (
              <RequireStaff access="staff">
                <AdminLayout />
              </RequireStaff>
            ),
          };
        },
        children: [
          { index: true, element: <AdminIndex /> },
          {
            element: (
              <RequireStaff access="manager">
                <Outlet />
              </RequireStaff>
            ),
            children: [
              { path: "inicio", ...page(() => import("@/pages/admin/DashboardPage")) },
              { path: "zeladoria", ...page(() => import("@/pages/admin/IssuesAdminPage")) },
              { path: "ouvidoria", ...page(() => import("@/pages/admin/OmbudsmanAdminPage")) },
              { path: "comunicados", ...page(() => import("@/pages/admin/NotificationsAdminPage")) },
            ],
          },
          {
            path: "equipe",
            element: (
              <RequireStaff access="root">
                <Outlet />
              </RequireStaff>
            ),
            children: [{ index: true, ...page(() => import("@/pages/admin/StaffAdminPage")) }],
          },
          {
            path: "unidades",
            element: (
              <RequireStaff access="root">
                <Outlet />
              </RequireStaff>
            ),
            children: [{ index: true, ...page(() => import("@/pages/admin/BuildingsAdminPage")) }],
          },
          {
            path: "meus-plantoes",
            element: (
              <RequireStaff access="duty">
                <Outlet />
              </RequireStaff>
            ),
            children: [{ index: true, ...page(() => import("@/pages/admin/MyDutyUnitsPage")) }],
          },
          { path: "minhas-farmacias", element: <Navigate to="/painel/meus-plantoes" replace /> },
        ],
      },
    ],
  },
]);
