import { TFunction } from "i18next";
import { Notification } from "@types/index";

// Translates a notification's titleKey/bodyKey + params into the current
// UI language via `notifications.messages.<key>.title` / `.body` — mirrors
// the backend's `titleKey`/`bodyKey` contract (see NotificationsService).
export function renderNotificationText(
  notification: Pick<Notification, "titleKey" | "titleParams" | "bodyKey" | "bodyParams">,
  t: TFunction,
): { title: string; body: string } {
  return {
    title: t(`notifications.messages.${notification.titleKey}.title`, notification.titleParams),
    body: t(`notifications.messages.${notification.bodyKey}.body`, notification.bodyParams),
  };
}
