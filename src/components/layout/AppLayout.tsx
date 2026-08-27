import { useState, useEffect, useRef, ReactElement } from "react";
import { Outlet, useNavigate, useLocation, useParams, Link } from "react-router-dom";
import {
  Avatar,
  Badge,
  Button,
  Dropdown,
  Menu,
  Skeleton,
  Tooltip,
  Popover,
} from "antd";
import {
  AppstoreOutlined,
  ProjectOutlined,
  CheckSquareOutlined,
  BellOutlined,
  LogoutOutlined,
  UserOutlined,
  DownOutlined,
  PlusOutlined,
  SearchOutlined,
  TeamOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HistoryOutlined,
  SunOutlined,
  MoonOutlined,
  DashboardOutlined,
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useCurrentUser } from "@features/auth/hooks/useCurrentUser";
import { useWorkspaces } from "@features/workspaces/hooks/useWorkspaces";
import { authService } from "@features/auth/services/authService";
import { useAppDispatch, useAppSelector } from "@store/index";
import { setActiveWorkspace } from "@store/uiSlice";
import { queryClient } from "@lib/queryClient";
import styles from "./AppLayout.module.css";
import NotificationsPanel from "@features/notifications/components/NotificationsPanel";
import { useNotificationSocket } from "@features/notifications/hooks/useNotificationSocket";
import SearchOverlay from "@features/search/components/SearchOverlay";
import LanguageSwitcher from "@components/ui/LanguageSwitcher";
import { useTheme } from "@lib/theme/ThemeProvider";
import SidebarModulesModal from "./SidebarModulesModal";
import {
  useSidebarSettings,
  useSaveSidebarSettings,
} from "@features/sidebarSettings/hooks/useSidebarSettings";
import { SidebarModuleSetting } from "@features/sidebarSettings/services/sidebarSettingsService";

// the sidebar's nav modules — order here is the fallback/default order,
// mirrored by DEFAULT_SIDEBAR_MODULES below (ids must match menuItems' keys' identity)
type SidebarModuleId = "workspaces" | "dashboard" | "projects" | "myTasks" | "members" | "activity" | "notifications";

const DEFAULT_SIDEBAR_MODULES: SidebarModuleSetting[] = [
  { id: "workspaces", visible: true },
  { id: "dashboard", visible: true },
  { id: "projects", visible: true },
  { id: "myTasks", visible: true },
  { id: "members", visible: true },
  { id: "activity", visible: true },
  { id: "notifications", visible: true },
];

// merges saved settings with the default list so newly-added modules (not
// yet in an old saved document) still show up, appended at the end
function normalizeSidebarModules(saved: SidebarModuleSetting[] | undefined): SidebarModuleSetting[] {
  if (!saved || saved.length === 0) return DEFAULT_SIDEBAR_MODULES;
  const known = new Set(saved.map((m) => m.id));
  const missing = DEFAULT_SIDEBAR_MODULES.filter((m) => !known.has(m.id));
  return [...saved, ...missing];
}

export default function AppLayout() {
  useNotificationSocket();
  const { t } = useTranslation();
  const { resolvedTheme, setTheme } = useTheme();

  // quick light↔dark toggle — an explicit choice, distinct from "System" on
  // the Settings page (this always sets a concrete theme, never "system")
  const toggleTheme = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { workspaceId: routeWorkspaceId } = useParams<{ workspaceId?: string }>();
  const { data: user } = useCurrentUser();
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const unreadCount = useAppSelector((s) => s.notifications.unreadCount);
  const storedWorkspaceId = useAppSelector((s) => s.ui.activeWorkspaceId);

  const [searchOpen, setSearchOpen] = useState(false);
  // controlled so clicking a notification can both navigate and close the bell
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [modulesModalOpen, setModulesModalOpen] = useState(false);
  const [sidebarModules, setSidebarModules] = useState<SidebarModuleSetting[]>(DEFAULT_SIDEBAR_MODULES);
  const [collapsed, setCollapsed] = useState(false);

  const { data: savedSidebarSettings, isFetched: sidebarSettingsFetched } = useSidebarSettings();
  const { mutate: saveSidebarSettings } = useSaveSidebarSettings();
  const appliedSidebarSettings = useRef(false);

  // apply the saved sidebar settings exactly once, when they first arrive —
  // same guard pattern MyTasksPage uses for table-settings, so the initial
  // defaults don't get saved over the user's real settings before they load
  useEffect(() => {
    if (!sidebarSettingsFetched || appliedSidebarSettings.current) return;
    appliedSidebarSettings.current = true;
    if (savedSidebarSettings?.modules) {
      setSidebarModules(normalizeSidebarModules(savedSidebarSettings.modules));
    }
    if (savedSidebarSettings?.collapsed !== undefined) {
      setCollapsed(savedSidebarSettings.collapsed);
    }
  }, [sidebarSettingsFetched, savedSidebarSettings]);

  const handleCloseModulesModal = () => {
    setModulesModalOpen(false);
    saveSidebarSettings({ modules: sidebarModules }); // batched — one request on close, not per-toggle/drag
  };

  const handleToggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    saveSidebarSettings({ collapsed: next });
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // remember whichever workspace the URL points to, so it stays "active"
  // even after navigating to a route without a :workspaceId (e.g. /workspaces)
  useEffect(() => {
    if (routeWorkspaceId) dispatch(setActiveWorkspace(routeWorkspaceId));
  }, [routeWorkspaceId, dispatch]);

  const activeWorkspace =
    workspaces?.find((ws) => ws._id === routeWorkspaceId) ??
    workspaces?.find((ws) => ws._id === storedWorkspaceId) ??
    workspaces?.[0];

  const { mutate: logout } = useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      queryClient.clear();
      navigate("/login", { replace: true });
    },
  });

  const menuItemsByModule: Record<SidebarModuleId, { key: string; icon: ReactElement; label: string }> = {
    workspaces: {
      key: "/workspaces",
      icon: <AppstoreOutlined />,
      label: t("appLayout.nav.workspaces"),
    },
    dashboard: {
      key: `/workspaces/${activeWorkspace?._id}/dashboard`,
      icon: <DashboardOutlined />,
      label: t("appLayout.nav.dashboard"),
    },
    projects: {
      key: `/workspaces/${activeWorkspace?._id}/projects`,
      icon: <ProjectOutlined />,
      label: t("appLayout.nav.projects"),
    },
    myTasks: {
      key: `/workspaces/${activeWorkspace?._id}/my-tasks`,
      icon: <CheckSquareOutlined />,
      label: t("appLayout.nav.myTasks"),
    },
    members: {
      key: `/workspaces/${activeWorkspace?._id}/members`,
      icon: <TeamOutlined />,
      label: t("appLayout.nav.members"),
    },
    activity: {
      key: `/workspaces/${activeWorkspace?._id}/activity`,
      icon: <HistoryOutlined />,
      label: t("appLayout.nav.activity"),
    },
    notifications: {
      key: "/notifications",
      icon: <BellOutlined />,
      label: t("appLayout.nav.notifications"),
    },
  };

  const moduleLabels: Record<string, string> = Object.fromEntries(
    Object.entries(menuItemsByModule).map(([id, item]) => [id, item.label]),
  );

  // sidebarModules' order + visible flag drives both the modal's list and
  // the actual rendered nav — array order IS the render order
  const menuItems = sidebarModules
    .filter((m) => m.visible)
    .map((m) => menuItemsByModule[m.id as SidebarModuleId])
    .filter(Boolean);

  const selectedKey =
    menuItems
      .filter((item) => location.pathname.startsWith(item.key))
      .sort((a, b) => b.key.length - a.key.length)[0]?.key ?? "";

  const userMenuItems = [
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: t("appLayout.settings"),
      onClick: () => navigate("/settings"),
    },
    { type: "divider" as const },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: t("appLayout.signOut"),
      danger: true,
      onClick: () => logout(),
    },
  ];

  const getPageTitle = () => {
    if (location.pathname === "/notifications") return t("appLayout.pageTitle.notifications");
    if (location.pathname === "/settings") return t("appLayout.pageTitle.settings");
    if (location.pathname.includes("/settings"))
      return t("appLayout.pageTitle.projectSettings");
    if (
      location.pathname.includes("/projects") &&
      location.pathname.includes("/board")
    )
      return t("appLayout.pageTitle.board");
    if (location.pathname.includes("/projects"))
      return t("appLayout.pageTitle.projects");
    if (location.pathname.includes("/dashboard"))
      return t("appLayout.pageTitle.dashboard");
    if (location.pathname.includes("/my-tasks"))
      return t("appLayout.pageTitle.myTasks");
    if (location.pathname.includes("/members"))
      return t("appLayout.pageTitle.members");
    if (location.pathname.includes("/activity"))
      return t("appLayout.pageTitle.activity");
    if (location.pathname === "/workspaces")
      return t("appLayout.pageTitle.workspaces");
    return t("appLayout.pageTitle.default");
  };

  return (
    <div className={styles.layout}>
      {/* ─── Sidebar ─────────────────────────────────────────── */}
      <aside className={`${styles.sider} ${collapsed ? styles.siderCollapsed : ""}`}>
        <div className={styles.siderInner}>
          {/* Logo */}
          <Link to="/workspaces" className={styles.logo}>
            <div className={styles.logoIcon}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
            </div>
            {!collapsed && <span className={styles.logoText}>{t("appLayout.logoText")}</span>}
          </Link>

          {/* Workspace switcher */}
          {!collapsed && (
            <div className={styles.workspaceSwitcher}>
              {workspacesLoading ? (
                <Skeleton.Input active size="small" style={{ width: "100%" }} />
              ) : (
                <Dropdown
                  menu={{
                    items: [
                      ...(workspaces?.map((ws) => ({
                        key: ws._id,
                        label: ws.name,
                        onClick: () => navigate(`/workspaces/${ws._id}/projects`),
                      })) ?? []),
                      { type: "divider" as const },
                      {
                        key: "all-workspaces",
                        icon: <AppstoreOutlined />,
                        label: t("appLayout.allWorkspaces"),
                        onClick: () => navigate("/workspaces"),
                      },
                    ],
                  }}
                  trigger={["click"]}
                >
                  <button className={styles.workspaceBtn}>
                    <Avatar
                      size={22}
                      src={activeWorkspace?.logoUrl ?? undefined}
                      style={{ background: "#4a6cf7", fontSize: 12 }}
                    >
                      {activeWorkspace?.name?.[0]?.toUpperCase()}
                    </Avatar>
                    <span className={styles.workspaceName}>
                      {activeWorkspace?.name ?? t("appLayout.selectWorkspace")}
                    </span>
                    <DownOutlined style={{ fontSize: 10, color: "#8c8c8c" }} />
                  </button>
                </Dropdown>
              )}
            </div>
          )}

          {/* Navigation */}
          <nav className={styles.nav}>
            {!collapsed && <div className={styles.navSection}>{t("appLayout.navigation")}</div>}
            <Menu
              mode="inline"
              inlineCollapsed={collapsed}
              selectedKeys={[selectedKey]}
              items={menuItems}
              onClick={({ key }) => navigate(key)}
              style={{ border: "none" }}
            />
          </nav>

          {/* Sidebar controls: customize modules + collapse toggle */}
          <div className={styles.siderControls}>
            <Tooltip title={t("appLayout.customizeSidebarTooltip")} placement="right">
              <Button
                icon={<SettingOutlined />}
                type="text"
                shape="circle"
                onClick={() => setModulesModalOpen(true)}
              />
            </Tooltip>
            <Tooltip
              title={t(collapsed ? "appLayout.expandSidebarTooltip" : "appLayout.collapseSidebarTooltip")}
              placement="right"
            >
              <Button
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                type="text"
                shape="circle"
                onClick={handleToggleCollapsed}
              />
            </Tooltip>
          </div>

          {/* User section */}
          <div className={styles.userSection}>
            <Dropdown
              menu={{ items: userMenuItems }}
              trigger={["click"]}
              placement="topLeft"
            >
              <button className={styles.userBtn}>
                <Avatar
                  size={36}
                  src={user?.avatarUrl ?? undefined}
                  style={{ background: "#4a6cf7", flexShrink: 0 }}
                  icon={<UserOutlined />}
                >
                  {user?.name?.[0]?.toUpperCase()}
                </Avatar>
                {!collapsed && (
                  <div className={styles.userInfo}>
                    <div className={styles.userName}>{user?.name}</div>
                    <div className={styles.userEmail}>{user?.email}</div>
                  </div>
                )}
              </button>
            </Dropdown>
          </div>
        </div>
      </aside>

      <SidebarModulesModal
        open={modulesModalOpen}
        modules={sidebarModules}
        labels={moduleLabels}
        onChange={setSidebarModules}
        onClose={handleCloseModulesModal}
      />

      {/* ─── Main content ────────────────────────────────────── */}
      <div className={`${styles.content} ${collapsed ? styles.contentCollapsed : ""}`}>
        {/* Topbar */}
        <header className={styles.topbar}>
          <div className={styles.pageTitle}>{getPageTitle()}</div>
          <div className={styles.topbarActions}>
            <Tooltip
              title={t(resolvedTheme === "dark" ? "appLayout.lightModeTooltip" : "appLayout.darkModeTooltip")}
            >
              <Button
                icon={resolvedTheme === "dark" ? <SunOutlined /> : <MoonOutlined />}
                type="text"
                shape="circle"
                onClick={toggleTheme}
              />
            </Tooltip>
            <LanguageSwitcher size="small" />
            <Tooltip title={t("appLayout.searchTooltip")}>
              <Button
                icon={<SearchOutlined />}
                type="text"
                shape="circle"
                onClick={() => setSearchOpen(true)}
              />
            </Tooltip>
            <Tooltip title={t("appLayout.notificationsTooltip")}>
              <Popover
                content={
                  <NotificationsPanel
                    onNavigate={() => setNotificationsOpen(false)}
                  />
                }
                trigger="click"
                placement="bottomRight"
                arrow={false}
                open={notificationsOpen}
                onOpenChange={setNotificationsOpen}
                styles={{ body: { padding: 0 } }}
              >
                <Badge count={unreadCount} size="small">
                  <Button icon={<BellOutlined />} type="text" shape="circle" />
                </Badge>
              </Popover>
            </Tooltip>
          </div>
        </header>

        {/* Page content */}
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  );
}
