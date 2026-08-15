import dayjs from "dayjs";
import { Priority, Task } from "@types/index";

export const priorityColors: Record<Priority, string> = {
  [Priority.CRITICAL]: "#f5222d",
  [Priority.HIGH]: "#fa8c16",
  [Priority.MEDIUM]: "#4a6cf7",
  [Priority.LOW]: "#8c8c8c",
};

export type DueGroupKey = "overdue" | "today" | "this_week" | "later" | "no_date";

export const dueDateGroups: { key: DueGroupKey; labelKey: string; color: string }[] = [
  { key: "overdue", labelKey: "myTasksPage.groupOverdue", color: "#f5222d" },
  { key: "today", labelKey: "myTasksPage.groupToday", color: "#fa8c16" },
  { key: "this_week", labelKey: "myTasksPage.groupThisWeek", color: "#4a6cf7" },
  { key: "later", labelKey: "myTasksPage.groupLater", color: "#10B981" },
  { key: "no_date", labelKey: "myTasksPage.groupNoDueDate", color: "#8c8c8c" },
];

export function getDueDateGroup(task: Task): DueGroupKey {
  if (!task.dueDate) return "no_date";
  const due = dayjs(task.dueDate);
  const today = dayjs().startOf("day");

  if (due.isBefore(today)) return "overdue";
  if (due.isSame(today, "day")) return "today";
  if (due.isBefore(today.add(7, "day"))) return "this_week";
  return "later";
}

export function groupByDueDate(tasks: Task[]): Record<DueGroupKey, Task[]> {
  return dueDateGroups.reduce<Record<DueGroupKey, Task[]>>(
    (acc, g) => {
      acc[g.key] = tasks.filter((t) => getDueDateGroup(t) === g.key);
      return acc;
    },
    { overdue: [], today: [], this_week: [], later: [], no_date: [] },
  );
}

export function groupByStatus(tasks: Task[]): { status: string; tasks: Task[] }[] {
  const map = new Map<string, Task[]>();
  for (const task of tasks) {
    const list = map.get(task.status) ?? [];
    list.push(task);
    map.set(task.status, list);
  }
  return Array.from(map.entries()).map(([status, list]) => ({ status, tasks: list }));
}
