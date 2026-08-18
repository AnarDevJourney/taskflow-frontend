import type { ReactNode } from "react";
import {
  BellOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  MessageOutlined,
  RocketOutlined,
  SwapOutlined,
  TeamOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { NotificationType } from "@types/index";

// icon + accent colour per notification type, shared by the bell panel and
// the pop-up toast so the same event always looks the same
const ICONS: Record<NotificationType, { icon: ReactNode; color: string }> = {
  [NotificationType.TASK_ASSIGNED]: {
    icon: <UserAddOutlined />,
    color: "#4a6cf7",
  },
  [NotificationType.TASK_DUE_SOON]: {
    icon: <ClockCircleOutlined />,
    color: "#fa8c16",
  },
  [NotificationType.TASK_OVERDUE]: {
    icon: <ExclamationCircleOutlined />,
    color: "#f5222d",
  },
  [NotificationType.TASK_STATUS_CHANGED]: {
    icon: <SwapOutlined />,
    color: "#10B981",
  },
  [NotificationType.COMMENT_ADDED]: {
    icon: <MessageOutlined />,
    color: "#10B981",
  },
  [NotificationType.COMMENT_MENTION]: {
    icon: <MessageOutlined />,
    color: "#fa8c16",
  },
  [NotificationType.SPRINT_STARTED]: {
    icon: <RocketOutlined />,
    color: "#4a6cf7",
  },
  [NotificationType.SPRINT_COMPLETED]: {
    icon: <CheckCircleOutlined />,
    color: "#10B981",
  },
  [NotificationType.WORKSPACE_INVITE]: {
    icon: <TeamOutlined />,
    color: "#4a6cf7",
  },
};

const FALLBACK = { icon: <BellOutlined />, color: "#8c8c8c" };

export const notificationIcon = (type: NotificationType) =>
  ICONS[type] ?? FALLBACK;
