// Table view variants for the Activity Log table — mirrors My Tasks'
// TABLE_VIEWS pattern (features/tasks/components/TaskListViews.tsx), just
// a smaller catalog since the audit-log table's columns are generic
// (user/module/action/context/date) rather than task-specific.
export type ActivityViewId = "classic" | "compact" | "striped" | "minimal" | "colorful" | "spreadsheet";

export const ACTIVITY_VIEWS: { id: ActivityViewId; nameKey: string; descKey: string }[] = [
  { id: "classic", nameKey: "activityLogPage.view.classic.name", descKey: "activityLogPage.view.classic.desc" },
  { id: "compact", nameKey: "activityLogPage.view.compact.name", descKey: "activityLogPage.view.compact.desc" },
  { id: "striped", nameKey: "activityLogPage.view.striped.name", descKey: "activityLogPage.view.striped.desc" },
  { id: "minimal", nameKey: "activityLogPage.view.minimal.name", descKey: "activityLogPage.view.minimal.desc" },
  { id: "colorful", nameKey: "activityLogPage.view.colorful.name", descKey: "activityLogPage.view.colorful.desc" },
  { id: "spreadsheet", nameKey: "activityLogPage.view.spreadsheet.name", descKey: "activityLogPage.view.spreadsheet.desc" },
];

export const DEFAULT_ACTIVITY_VIEW: ActivityViewId = "classic";
