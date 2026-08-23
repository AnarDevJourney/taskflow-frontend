// Column customization model for the Members table — same shape as the
// Activity Log's ColumnId/ColumnSetting (features/activity/utils/activityColumns.ts).
// The trailing "remove member" column is NOT part of this — it's a fixed
// action column, always rendered last, not something the user shows/hides/reorders.
export type ColumnId = "name" | "email" | "role" | "joinedAt";

export interface ColumnSetting {
  id: ColumnId;
  visible: boolean;
  width?: number | null;
}

export const DEFAULT_COLUMNS: ColumnSetting[] = [
  { id: "name", visible: true },
  { id: "email", visible: true },
  { id: "role", visible: true },
  { id: "joinedAt", visible: true },
];

export const COLUMN_LABEL_KEYS: Record<ColumnId, string> = {
  name: "members.column.name",
  email: "members.column.email",
  role: "members.column.role",
  joinedAt: "members.column.joinedAt",
};

const COLUMN_WIDTHS: Record<ColumnId, string> = {
  name: "220px",
  email: "1fr",
  role: "160px",
  joinedAt: "170px",
};

// numeric fallback used as the resize handle's starting width for columns
// that haven't been manually resized yet (email has no pixel default above
// since it's fluid — 1fr — until the user drags it)
export const DEFAULT_COLUMN_WIDTH_PX: Record<ColumnId, number> = {
  name: 220,
  email: 260,
  role: 160,
  joinedAt: 170,
};

export const MIN_COLUMN_WIDTH_PX = 60;

export function columnWidthCss(c: ColumnSetting): string {
  return c.width ? `${c.width}px` : COLUMN_WIDTHS[c.id];
}

// merge a saved column list with DEFAULT_COLUMNS so a newly added column
// (e.g. a future release) still shows up for users with an old saved order
export function normalizeColumns(
  saved: { id: string; visible: boolean; width?: number | null }[] | undefined | null,
): ColumnSetting[] {
  if (!saved || saved.length === 0) return DEFAULT_COLUMNS;
  const known = new Set(DEFAULT_COLUMNS.map((c) => c.id as string));
  const savedIds = new Set(saved.map((c) => c.id));
  const merged = saved.filter((c) => known.has(c.id)) as ColumnSetting[];
  for (const col of DEFAULT_COLUMNS) {
    if (!savedIds.has(col.id)) merged.push(col);
  }
  return merged;
}
