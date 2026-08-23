// Table view variants for the Members table — mirrors the Activity Log's
// ACTIVITY_VIEWS pattern (features/activity/utils/activityViews.ts), same
// six-variant catalog since this table's columns are generic too.
export type MembersViewId = "classic" | "compact" | "striped" | "minimal" | "colorful" | "spreadsheet";

export const MEMBERS_VIEWS: { id: MembersViewId; nameKey: string; descKey: string }[] = [
  { id: "classic", nameKey: "members.view.classic.name", descKey: "members.view.classic.desc" },
  { id: "compact", nameKey: "members.view.compact.name", descKey: "members.view.compact.desc" },
  { id: "striped", nameKey: "members.view.striped.name", descKey: "members.view.striped.desc" },
  { id: "minimal", nameKey: "members.view.minimal.name", descKey: "members.view.minimal.desc" },
  { id: "colorful", nameKey: "members.view.colorful.name", descKey: "members.view.colorful.desc" },
  { id: "spreadsheet", nameKey: "members.view.spreadsheet.name", descKey: "members.view.spreadsheet.desc" },
];

export const DEFAULT_MEMBERS_VIEW: MembersViewId = "classic";
