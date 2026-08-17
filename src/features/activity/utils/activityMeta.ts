import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UndoOutlined,
  LockOutlined,
} from "@ant-design/icons";

// mirrors backend's ACTIVITY_MODULES (activity-module.util.ts) — the
// activity log has no separate `module` field, so both sides group the
// (fairly granular) action enum the same way
export type ActivityModule =
  | "task"
  | "comments"
  | "attachments"
  | "sprint"
  | "checklist"
  | "watchers";

export const ACTIVITY_MODULES: ActivityModule[] = [
  "task",
  "comments",
  "attachments",
  "sprint",
  "checklist",
  "watchers",
];

const ACTION_MODULE_MAP: Record<string, ActivityModule> = {
  task_created: "task",
  task_updated: "task",
  task_deleted: "task",
  task_archived: "task",
  status_changed: "task",
  priority_changed: "task",
  assignee_changed: "task",
  due_date_changed: "task",
  title_changed: "task",
  description_changed: "task",
  labels_changed: "task",
  story_points_changed: "task",

  comment_added: "comments",
  comment_edited: "comments",
  comment_deleted: "comments",

  attachment_added: "attachments",
  attachment_removed: "attachments",

  added_to_sprint: "sprint",
  removed_from_sprint: "sprint",

  checklist_item_added: "checklist",
  checklist_item_completed: "checklist",
  checklist_item_reopened: "checklist",

  watcher_added: "watchers",
  watcher_removed: "watchers",
};

export const ALL_ACTIONS = Object.keys(ACTION_MODULE_MAP);

export function getActivityModule(action: string): ActivityModule | undefined {
  return ACTION_MODULE_MAP[action];
}

export function getActionsForModule(module: ActivityModule): string[] {
  return ALL_ACTIONS.filter((action) => ACTION_MODULE_MAP[action] === module);
}

// ─── Action "category" → color + icon, per the reference design ─────────
// (create=green, update=orange, delete=red, restore=blue, login=gray)
export type ActionCategory = "create" | "update" | "delete" | "restore" | "login";

const CATEGORY_BY_SUFFIX: [pattern: RegExp, category: ActionCategory][] = [
  [/_created$|_added$/, "create"],
  [/_deleted$|_removed$/, "delete"],
  [/_archived$/, "restore"],
  [/_completed$|_reopened$|_changed$|_updated$|_edited$/, "update"],
  [/^login$/, "login"],
];

export function getActionCategory(action: string): ActionCategory {
  for (const [pattern, category] of CATEGORY_BY_SUFFIX) {
    if (pattern.test(action)) return category;
  }
  return "update";
}

export const ACTION_CATEGORY_COLORS: Record<ActionCategory, string> = {
  create: "#10B981",
  update: "#F59E0B",
  delete: "#f5222d",
  restore: "#4a6cf7",
  login: "#8c8c8c",
};

export const ACTION_CATEGORY_ICONS: Record<ActionCategory, typeof PlusOutlined> = {
  create: PlusOutlined,
  update: EditOutlined,
  delete: DeleteOutlined,
  restore: UndoOutlined,
  login: LockOutlined,
};
