import { Empty, Spin } from "antd";
import {
  BellOutlined,
  CheckOutlined,
  UserAddOutlined,
  MessageOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Notification, NotificationType } from "@types/index";
import { useNotifications } from "../hooks/useNotifications";
import styles from "./NotificationsPanel.module.css";

dayjs.extend(relativeTime);

const typeIcon: Record<string, React.ReactNode> = {
  [NotificationType.TASK_ASSIGNED]: (
    <UserAddOutlined style={{ color: "#4a6cf7" }} />
  ),
  [NotificationType.COMMENT_ADDED]: (
    <MessageOutlined style={{ color: "#10B981" }} />
  ),
  [NotificationType.COMMENT_MENTION]: (
    <MessageOutlined style={{ color: "#fa8c16" }} />
  ),
  [NotificationType.TASK_DUE_SOON]: (
    <ClockCircleOutlined style={{ color: "#fa8c16" }} />
  ),
  [NotificationType.TASK_OVERDUE]: (
    <ClockCircleOutlined style={{ color: "#f5222d" }} />
  ),
  [NotificationType.TASK_STATUS_CHANGED]: (
    <CheckOutlined style={{ color: "#10B981" }} />
  ),
  [NotificationType.WORKSPACE_INVITE]: (
    <UserAddOutlined style={{ color: "#4a6cf7" }} />
  ),
};

export default function NotificationsPanel() {
  const { notifications, isLoading, markAsRead, markAllAsRead } =
    useNotifications();

  console.log("notifications", notifications);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.headerTitle}>
          Notifications
          {unreadCount > 0 && ` (${unreadCount})`}
        </span>
        {unreadCount > 0 && (
          <button className={styles.markAllBtn} onClick={() => markAllAsRead()}>
            Mark all as read
          </button>
        )}
      </div>

      {/* List */}
      <div className={styles.list}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <Spin />
          </div>
        ) : notifications.length === 0 ? (
          <div className={styles.empty}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No notifications yet"
            />
          </div>
        ) : (
          notifications.map((notification: Notification) => (
            <div
              key={notification._id}
              className={`${styles.item} ${!notification.isRead ? styles.unread : ""}`}
              onClick={() => {
                if (!notification.isRead) markAsRead(notification._id);
              }}
            >
              <div className={styles.icon}>
                {typeIcon[notification.type] ?? (
                  <BellOutlined style={{ color: "#8c8c8c" }} />
                )}
              </div>
              <div className={styles.content}>
                <div className={styles.title}>{notification.title}</div>
                <div className={styles.body}>{notification.body}</div>
                <div className={styles.time}>
                  {dayjs(notification.createdAt).fromNow()}
                </div>
              </div>
              {!notification.isRead && <span className={styles.unreadDot} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
