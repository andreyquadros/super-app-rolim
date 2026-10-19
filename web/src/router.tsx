import type { ComponentType, ReactNode } from "react";
import { createBrowserRouter, Navigate, Outlet, useNavigation, type RouteObject } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { RequireCitizen, RequireStaff, RequireUser } from "@/auth/guards";
import { ForegroundPush, OfflineBanner, UpdatePrompt } from "@/components/AppStatus";
import { LoadingScreen } from "@/components/LoadingScreen";
import { RouteError } from "@/components/RouteError";
import { CitizenLayout } from "@/layouts/CitizenLayout";
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
  return <Navigate to={isManager ? "/painel/inicio" : "/painel/minhas-farmacias"} replace />;
}

const citizen = (element: ReactNode) => <RequireCitizen>{element}</RequireCitizen>;

export const router = createBrowserRouter([
  {
    element: <Root />,
    errorElement: <RouteError />,
    // Exibido enquanto a primeira tela (carregada sob demanda) chega
    hydrateFallbackElement: <LoadingScreen />,
    children: [
      {
        element: <CitizenLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: "entrar", ...page(() => import("@/pages/auth/LoginPage")) },
          { path: "cadastro", ...page(() => import("@/pages/auth/RegisterPage")) },
          { path: "recuperar-senha", ...page(() => import("@/pages/auth/ResetPasswordPage")) },
          {
            path: "completar-cadastro",
            element: (
              <RequireUser>
                <Outlet />
              </RequireUser>
            ),
            children: [{ index: true, ...page(() => import("@/pages/auth/CompleteProfilePage")) }],
          },
          { path: "farmacias", ...page(() => import("@/pages/pharmacies/PharmaciesPage")) },
          { path: "comunicados", ...page(() => import("@/pages/notices/NoticesPage")) },
          { path: "privacidade", ...page(() => import("@/pages/PrivacyPage")) },
          {
            element: citizen(<Outlet />),
            children: [
              { path: "zeladoria/nova", ...page(() => import("@/pages/issues/NewIssuePage")) },
              { path: "ouvidoria/nova", ...page(() => import("@/pages/ombudsman/NewOmbudsmanPage")) },
              { path: "protocolos", ...page(() => import("@/pages/requests/MyRequestsPage")) },
              { path: "protocolos/:kind/:id", ...page(() => import("@/pages/requests/RequestDetailPage")) },
            ],
          },
          {
            path: "perfil",
            element: (
              <RequireUser>
                <Outlet />
              </RequireUser>
            ),
            children: [{ index: true, ...page(() => import("@/pages/profile/ProfilePage")) }],
          },
          { path: "*", ...page(() => import("@/pages/StatusPages")) },
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
            path: "minhas-farmacias",
            element: (
              <RequireStaff access="pharmacist">
                <Outlet />
              </RequireStaff>
            ),
            children: [{ index: true, ...page(() => import("@/pages/admin/MyPharmaciesPage")) }],
          },
        ],
      },
    ],
  },
]);
