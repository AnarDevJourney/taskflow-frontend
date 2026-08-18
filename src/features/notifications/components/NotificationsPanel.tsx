import { Empty, Spin } from "antd";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Notification } from "@types/index";
import { useAppSelector } from "@store/index";
import { useNotifications } from "../hooks/useNotifications";
import { notificationIcon } from "../utils/notificationIcon";
import { renderNotificationText } from "../utils/notificationText";
import styles from "./NotificationsPanel.module.css";

dayjs.extend(relativeTime);

interface Props {
  // lets the bell's popover close itself when a notification navigates away
  onNavigate?: () => void;
}

export default function NotificationsPanel({ onNavigate }: Props) {
  const { notifications, isLoading, markAsRead, markAllAsRead } =
    useNotifications();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // the badge count comes from the server (socket / unread-count endpoint),
  // not from this page of results — page 1 does not know about older unread
  // notifications further down the list
  const unreadCount = useAppSelector((s) => s.notifications.unreadCount);

  const handleClick = (notification: Notification) => {
    if (!notification.isRead) markAsRead(notification._id);
    if (notification.link) {
      navigate(notification.link);
      onNavigate?.();
    }
  };

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.headerTitle}>
          {t("notifications.title")}
          {unreadCount > 0 && ` (${unreadCount})`}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            className={styles.markAllBtn}
            onClick={() => {
              navigate("/notifications");
              onNavigate?.();
            }}
          >
            {t("notifications.viewAll")}
          </button>
          {unreadCount > 0 && (
            <button className={styles.markAllBtn} onClick={() => markAllAsRead()}>
              {t("notifications.markAllRead")}
            </button>
          )}
        </div>
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
              description={t("notifications.empty")}
            />
          </div>
        ) : (
          notifications.map((notification: Notification) => {
            const { icon, color } = notificationIcon(notification.type);
            const { title, body } = renderNotificationText(notification, t);

            return (
              <div
                key={notification._id}
                className={`${styles.item} ${!notification.isRead ? styles.unread : ""}`}
                onClick={() => handleClick(notification)}
              >
                <div className={styles.icon} style={{ color }}>
                  {icon}
                </div>
                <div className={styles.content}>
                  <div className={styles.title}>{title}</div>
                  <div className={styles.body}>{body}</div>
                  <div className={styles.time}>
                    {dayjs(notification.createdAt).fromNow()}
                  </div>
                </div>
                {!notification.isRead && <span className={styles.unreadDot} />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
