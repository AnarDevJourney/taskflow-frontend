// Column customization model for the Notifications table — same shape as
// Activity Log's ColumnId/ColumnSetting (features/activity/utils/activityColumns.ts),
// just this table's own set of columns. The trailing "view details" (eye
// icon) column is NOT part of this — it's a fixed action column, always
// rendered last, not something the user shows/hides/reorders.
export type ColumnId = "status" | "type" | "message" | "actor" | "date";

export interface ColumnSetting {
  id: ColumnId;
  visible: boolean;
  width?: number | null;
}

export const DEFAULT_COLUMNS: ColumnSetting[] = [
  { id: "status", visible: true },
  { id: "type", visible: true },
  { id: "message", visible: true },
  { id: "actor", visible: true },
  { id: "date", visible: true },
];

export const COLUMN_LABEL_KEYS: Record<ColumnId, string> = {
  status: "notificationsPage.column.status",
  type: "notificationsPage.column.type",
  message: "notificationsPage.column.message",
  actor: "notificationsPage.column.actor",
  date: "notificationsPage.column.date",
};

const COLUMN_WIDTHS: Record<ColumnId, string> = {
  status: "110px",
  type: "160px",
  message: "1fr",
  actor: "200px",
  date: "170px",
};

// numeric fallback used as the resize handle's starting width for columns
// that haven't been manually resized yet (message has no pixel default
// above since it's fluid — 1fr — until the user drags it)
export const DEFAULT_COLUMN_WIDTH_PX: Record<ColumnId, number> = {
  status: 110,
  type: 160,
  message: 320,
  actor: 200,
  date: 170,
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
