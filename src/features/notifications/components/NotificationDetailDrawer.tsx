import { Avatar, Drawer, Tag } from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { Notification } from "@types/index";
import { notificationIcon } from "../utils/notificationIcon";
import { renderNotificationText } from "../utils/notificationText";
import styles from "./NotificationDetailDrawer.module.css";

interface NotificationDetailDrawerProps {
  notification: Notification | null;
  onClose: () => void;
}

// short, readable id derived from the real Mongo _id — same convention as
// ActivityDetailDrawer's formatLogId
function formatNotificationId(id: string): string {
  return `NTF-${id.slice(-6).toUpperCase()}`;
}

export default function NotificationDetailDrawer({
  notification,
  onClose,
}: NotificationDetailDrawerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  if (!notification) return <Drawer open={false} onClose={onClose} />;

  const { icon, color } = notificationIcon(notification.type);
  const { title, body } = renderNotificationText(notification, t);

  return (
    <Drawer
      open={!!notification}
      onClose={onClose}
      title={null}
      width={480}
      closable={false}
      styles={{ body: { padding: 0 } }}
    >
      <div className={styles.header}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="close">
          ✕
        </button>
        <h2 className={styles.title}>{t("notificationsPage.detailTitle")}</h2>
        <div className={styles.logId}>{formatNotificationId(notification._id)}</div>
      </div>

      <div className={styles.section}>
        <div className={styles.summaryBadge} style={{ background: `${color}1a`, color }}>
          {icon}
          <span>{t(`notificationsPage.type.${notification.type}`, notification.type)}</span>
        </div>
        <div className={styles.timestamp}>{dayjs(notification.createdAt).format("DD MMMM YYYY, HH:mm")}</div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>{t("notificationsPage.detailMessage")}</div>
        <div className={styles.metaCard} style={{ marginTop: 12 }}>
          <div className={styles.metaLabel}>{title}</div>
          <div className={styles.metaText}>{body}</div>
        </div>
      </div>

      {notification.actorId && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>{t("notificationsPage.detailActor")}</div>
          <div className={styles.actorRow}>
            <Avatar size={48} style={{ background: "#4a6cf7", fontSize: 18 }}>
              {notification.actorId.name?.[0]?.toUpperCase()}
            </Avatar>
            <div>
              <div className={styles.actorName}>{notification.actorId.name}</div>
              <div className={styles.actorEmail}>{notification.actorId.email}</div>
            </div>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionTitle}>{t("notificationsPage.detailStatus")}</div>
        <div className={styles.contextCard}>
          <div className={styles.contextItem}>
            <span className={styles.contextLabel}>{t("notificationsPage.column.status")}</span>
            <span className={styles.contextValue}>
              <Tag color={notification.isRead ? "default" : "blue"} style={{ margin: 0 }}>
                {t(notification.isRead ? "notificationsPage.read" : "notificationsPage.unread")}
              </Tag>
            </span>
          </div>
          {notification.readAt && (
            <div className={styles.contextItem}>
              <span className={styles.contextLabel}>{t("notificationsPage.detailReadAt")}</span>
              <span className={styles.contextValue}>{dayjs(notification.readAt).format("DD MMM YYYY, HH:mm")}</span>
            </div>
          )}
        </div>
      </div>

      {notification.link && (
        <div className={styles.section}>
          <button
            className={styles.linkBtn}
            onClick={() => {
              navigate(notification.link as string);
              onClose();
            }}
          >
            {t("notificationsPage.detailOpenLink")}
          </button>
        </div>
      )}
    </Drawer>
  );
}
