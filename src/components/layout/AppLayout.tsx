import { useState } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { Avatar, Badge, Button, Dropdown, Menu, Skeleton, Tooltip } from "antd";
import {
  ProjectOutlined,
  CheckSquareOutlined,
  BellOutlined,
  LogoutOutlined,
  UserOutlined,
  DownOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { useCurrentUser } from "@features/auth/hooks/useCurrentUser";
import { useWorkspaces } from "@features/workspaces/hooks/useWorkspaces";
import { authService } from "@features/auth/services/authService";
import { useAppSelector } from "@store/index";
import { queryClient } from "@lib/queryClient";
import styles from "./AppLayout.module.css";

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: user } = useCurrentUser();
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const unreadCount = useAppSelector((s) => s.notifications.unreadCount);

  // use first workspace by default
  const activeWorkspace = workspaces?.[0];

  const { mutate: logout } = useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      queryClient.clear();
      navigate("/login", { replace: true });
    },
  });

  const menuItems = [
    {
      key: `/workspaces/${activeWorkspace?._id}/projects`,
      icon: <ProjectOutlined />,
      label: "Projects",
    },
    {
      key: `/workspaces/${activeWorkspace?._id}/my-tasks`,
      icon: <CheckSquareOutlined />,
      label: "My Tasks",
    },
  ];

  const selectedKey =
    menuItems.find((item) => location.pathname.startsWith(item.key))?.key ?? "";

  const userMenuItems = [
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Sign out",
      danger: true,
      onClick: () => logout(),
    },
  ];

  const getPageTitle = () => {
    if (
      location.pathname.includes("/projects") &&
      location.pathname.includes("/board")
    )
      return "Board";
    if (location.pathname.includes("/projects")) return "Projects";
    if (location.pathname.includes("/my-tasks")) return "My Tasks";
    return "TaskFlow";
  };

  return (
    <div className={styles.layout}>
      {/* ─── Sidebar ─────────────────────────────────────────── */}
      <aside className={styles.sider}>
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
            <span className={styles.logoText}>TaskFlow</span>
          </Link>

          {/* Workspace switcher */}
          <div className={styles.workspaceSwitcher}>
            {workspacesLoading ? (
              <Skeleton.Input active size="small" style={{ width: "100%" }} />
            ) : (
              <Dropdown
                menu={{
                  items:
                    workspaces?.map((ws) => ({
                      key: ws._id,
                      label: ws.name,
                      onClick: () => navigate(`/workspaces/${ws._id}/projects`),
                    })) ?? [],
                }}
                trigger={["click"]}
              >
                <button className={styles.workspaceBtn}>
                  <Avatar
                    size={20}
                    style={{ background: "#4a6cf7", fontSize: 11 }}
                  >
                    {activeWorkspace?.name?.[0]?.toUpperCase()}
                  </Avatar>
                  <span className={styles.workspaceName}>
                    {activeWorkspace?.name ?? "Select workspace"}
                  </span>
                  <DownOutlined style={{ fontSize: 10, color: "#8c8c8c" }} />
                </button>
              </Dropdown>
            )}
          </div>

          {/* Navigation */}
          <nav className={styles.nav}>
            <div className={styles.navSection}>Navigation</div>
            <Menu
              mode="inline"
              selectedKeys={[selectedKey]}
              items={menuItems}
              onClick={({ key }) => navigate(key)}
              style={{ border: "none" }}
            />
          </nav>

          {/* User section */}
          <div className={styles.userSection}>
            <Dropdown
              menu={{ items: userMenuItems }}
              trigger={["click"]}
              placement="topLeft"
            >
              <button className={styles.userBtn}>
                <Avatar
                  size={32}
                  style={{ background: "#4a6cf7", flexShrink: 0 }}
                  icon={<UserOutlined />}
                >
                  {user?.name?.[0]?.toUpperCase()}
                </Avatar>
                <div className={styles.userInfo}>
                  <div className={styles.userName}>{user?.name}</div>
                  <div className={styles.userEmail}>{user?.email}</div>
                </div>
              </button>
            </Dropdown>
          </div>
        </div>
      </aside>

      {/* ─── Main content ────────────────────────────────────── */}
      <div className={styles.content}>
        {/* Topbar */}
        <header className={styles.topbar}>
          <div className={styles.pageTitle}>{getPageTitle()}</div>
          <div className={styles.topbarActions}>
            <Tooltip title="Search (coming soon)">
              <Button icon={<SearchOutlined />} type="text" shape="circle" />
            </Tooltip>
            <Tooltip title="Notifications">
              <Badge count={unreadCount} size="small">
                <Button icon={<BellOutlined />} type="text" shape="circle" />
              </Badge>
            </Tooltip>
          </div>
        </header>

        {/* Page content */}
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
