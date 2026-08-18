// Table view variants for the Notifications table — mirrors Activity Log's
// ACTIVITY_VIEWS pattern (features/activity/utils/activityViews.ts), same
// 6-variant catalog since this is the same generic row-table shape.
export type NotificationViewId = "classic" | "compact" | "striped" | "minimal" | "colorful" | "spreadsheet";

export const NOTIFICATION_VIEWS: { id: NotificationViewId; nameKey: string; descKey: string }[] = [
  { id: "classic", nameKey: "notificationsPage.view.classic.name", descKey: "notificationsPage.view.classic.desc" },
  { id: "compact", nameKey: "notificationsPage.view.compact.name", descKey: "notificationsPage.view.compact.desc" },
  { id: "striped", nameKey: "notificationsPage.view.striped.name", descKey: "notificationsPage.view.striped.desc" },
  { id: "minimal", nameKey: "notificationsPage.view.minimal.name", descKey: "notificationsPage.view.minimal.desc" },
  { id: "colorful", nameKey: "notificationsPage.view.colorful.name", descKey: "notificationsPage.view.colorful.desc" },
  { id: "spreadsheet", nameKey: "notificationsPage.view.spreadsheet.name", descKey: "notificationsPage.view.spreadsheet.desc" },
];

export const DEFAULT_NOTIFICATION_VIEW: NotificationViewId = "classic";
