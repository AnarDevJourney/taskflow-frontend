import { useTranslation } from "react-i18next";
import { Notification } from "@types/index";
import { notificationIcon } from "../utils/notificationIcon";
import { renderNotificationText } from "../utils/notificationText";
import styles from "./NotificationToast.module.css";

interface Props {
  notification: Notification;
  // shown only when the notification carries a deep link
  actionLabel?: string;
}

// The body of the top-of-screen toast. Rendered into AntD's `notification`
// card by useNotificationToast — see that hook for placement/duration.
export default function NotificationToast({ notification, actionLabel }: Props) {
  const { t } = useTranslation();
  const { icon, color } = notificationIcon(notification.type);
  const { title, body } = renderNotificationText(notification, t);

  return (
    <div className={styles.toast}>
      <div
        className={styles.icon}
        style={{ background: `${color}1a`, color }}
      >
        {icon}
      </div>
      <div className={styles.content}>
        <div className={styles.title}>{title}</div>
        <div className={styles.body}>{body}</div>
        {notification.link && actionLabel && (
          <div className={styles.hint}>{actionLabel}</div>
        )}
      </div>
    </div>
  );
}
