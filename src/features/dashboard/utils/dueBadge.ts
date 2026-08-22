import dayjs from "dayjs";
import type { TFunction } from "i18next";

export type DueTone = "overdue" | "today" | "soon" | "later";

export interface DueBadge {
  label: string;
  tone: DueTone;
}

/**
 * Turns a due date into the short relative badge the deadline widgets show —
 * "Today", "Tomorrow", "in 3 days", or "2 days overdue".
 *
 * Deliberately day-granular and calendar-based (`startOf("day")` on both
 * sides): a task due at 09:00 tomorrow should read "Tomorrow", not "in 15
 * hours", which is what a raw duration would give.
 */
export function getDueBadge(
  dueDate: string | null,
  t: TFunction,
): DueBadge | null {
  if (!dueDate) return null;

  const due = dayjs(dueDate).startOf("day");
  const today = dayjs().startOf("day");
  const days = due.diff(today, "day");

  if (days < 0) {
    return {
      label: t("dashboardPage.due.overdue", { days: Math.abs(days) }),
      tone: "overdue",
    };
  }
  if (days === 0) return { label: t("dashboardPage.due.today"), tone: "today" };
  if (days === 1) return { label: t("dashboardPage.due.tomorrow"), tone: "soon" };

  return { label: t("dashboardPage.due.inDays", { days }), tone: "later" };
}
