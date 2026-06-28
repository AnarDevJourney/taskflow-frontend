import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Spin } from "antd";
import AuthGuard from "@components/layout/AuthGuard";

const LoginPage = lazy(() => import("@features/auth/pages/LoginPage"));
const RegisterPage = lazy(() => import("@features/auth/pages/RegisterPage"));
const ForgotPasswordPage = lazy(
  () => import("@features/auth/pages/ForgotPasswordPage"),
);
const ResetPasswordPage = lazy(
  () => import("@features/auth/pages/ResetPasswordPage"),
);
const AppLayout = lazy(() => import("@components/layout/AppLayout"));
const WorkspacesPage = lazy(
  () => import("@features/workspaces/pages/WorkspacesPage"),
);
const ProjectsPage = lazy(
  () => import("@features/projects/pages/ProjectsPage"),
);
const BoardPage = lazy(() => import("@features/tasks/pages/BoardPage"));
const MyTasksPage = lazy(() => import("@features/tasks/pages/MyTasksPage"));

const PageLoader = () => (
  <div
    style={{
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Spin size="large" />
  </div>
);

const s = (C: React.ComponentType) => (
  <Suspense fallback={<PageLoader />}>
    <C />
  </Suspense>
);

export const router = createBrowserRouter([
  // ─── Public ─────────────────────────────────────────────────────
  { path: "/login", element: s(LoginPage) },
  { path: "/register", element: s(RegisterPage) },
  { path: "/forgot-password", element: s(ForgotPasswordPage) },
  { path: "/reset-password", element: s(ResetPasswordPage) },

  // ─── Protected ──────────────────────────────────────────────────
  {
    path: "/",
    element: <AuthGuard>{s(AppLayout)}</AuthGuard>,
    children: [
      { index: true, element: <Navigate to="/workspaces" replace /> },
      { path: "workspaces", element: s(WorkspacesPage) },
      { path: "workspaces/:workspaceId/projects", element: s(ProjectsPage) },
      {
        path: "workspaces/:workspaceId/projects/:projectId/board",
        element: s(BoardPage),
      },
      {
        path: "workspaces/:workspaceId/my-tasks",
        element: s(MyTasksPage),
      },
    ],
  },

  { path: "*", element: <Navigate to="/" replace /> },
]);
