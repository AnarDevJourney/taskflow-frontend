// ─────────────────────────────────────────────────────────────────
// API response envelope — matches backend TransformInterceptor
// ─────────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    statusCode: number;
    message: string | string[];
    timestamp: string;
    path: string;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

// ─────────────────────────────────────────────────────────────────
// Enums — mirror backend enums exactly
// ─────────────────────────────────────────────────────────────────
export enum WorkspaceRole {
  OWNER = "owner",
  ADMIN = "admin",
  MEMBER = "member",
  VIEWER = "viewer",
  GUEST = "guest",
}

export enum Priority {
  CRITICAL = "critical",
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

export enum TaskLinkType {
  BLOCKS = "blocks",
  BLOCKED_BY = "blocked_by",
  RELATES_TO = "relates_to",
  DUPLICATES = "duplicates",
}

export enum SprintStatus {
  PLANNED = "planned",
  ACTIVE = "active",
  COMPLETED = "completed",
}

export enum NotificationType {
  TASK_ASSIGNED = "task_assigned",
  TASK_DUE_SOON = "task_due_soon",
  TASK_OVERDUE = "task_overdue",
  TASK_STATUS_CHANGED = "task_status_changed",
  COMMENT_ADDED = "comment_added",
  COMMENT_MENTION = "comment_mention",
  SPRINT_STARTED = "sprint_started",
  SPRINT_COMPLETED = "sprint_completed",
  WORKSPACE_INVITE = "workspace_invite",
}

// ─────────────────────────────────────────────────────────────────
// Entities
// ─────────────────────────────────────────────────────────────────
export interface User {
  _id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  userId: User;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface Workspace {
  _id: string;
  name: string;
  slug: string;
  description: string | null;
  ownerId: string;
  members: WorkspaceMember[];
  logoUrl: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StatusConfig {
  name: string;
  color: string;
  order: number;
  wipLimit: number | null;
}

export interface ProjectMember {
  userId: User;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface Project {
  _id: string;
  workspaceId: string;
  name: string;
  key: string;
  description: string | null;
  ownerId: string;
  members: ProjectMember[];
  statuses: StatusConfig[];
  sprintMode: boolean;
  color: string;
  icon: string | null;
  taskCounter: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface Attachment {
  // subdocument id — the handle used by GET /files/signed-url and DELETE /files/:id
  id: string;
  filename: string;
  originalName: string;
  key: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface TaskLink {
  taskId: string;
  type: TaskLinkType;
}

export interface Task {
  _id: string;
  projectId: string;
  workspaceId: string;
  taskNumber: number;
  title: string;
  description: string | null;
  status: string;
  priority: Priority;
  assigneeId: User | null;
  reporterId: User;
  dueDate: string | null;
  labels: string[];
  storyPoints: number | null;
  order: number;
  sprintId: string | null;
  watchers: User[];
  attachments: Attachment[];
  checklist: ChecklistItem[];
  links: TaskLink[];
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  taskId: string;
  projectId: string;
  workspaceId: string;
  authorId: User;
  body: string;
  mentions: User[];
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Sprint {
  _id: string;
  projectId: string;
  workspaceId: string;
  name: string;
  goal: string | null;
  status: SprintStatus;
  startDate: string;
  endDate: string;
  completedAt: string | null;
  totalPoints: number | null;
  completedPoints: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  _id: string;
  recipientId: string;
  actorId: User | null;
  type: NotificationType;
  // i18n message keys + interpolation params — see `notifications.messages.*`
  // in the locale files, and `renderNotificationText` for how these are
  // translated into the current UI language
  titleKey: string;
  titleParams: Record<string, string | number>;
  bodyKey: string;
  bodyParams: Record<string, string | number>;
  link: string | null;
  taskId: string | null;
  projectId: string | null;
  workspaceId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface ActivityLog {
  _id: string;
  taskId: { _id: string; title: string } | string;
  projectId: { _id: string; name: string } | string;
  workspaceId: string;
  actorId: User;
  action: string;
  module: string;
  field: string | null;
  oldValue: any;
  newValue: any;
  meta: string | null;
  ip: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────
// Dashboard — mirrors the backend's DashboardOverview, returned whole
// by GET /workspaces/:workspaceId/dashboard/overview
// ─────────────────────────────────────────────────────────────────

/** The three comparable buckets the backend normalizes free-form statuses into. */
export type TaskStatusBucket = "todo" | "in_progress" | "done";

export interface DashboardKpi {
  current: number;
  previous: number;
  /** null when the previous period had no baseline — the card hides its chip */
  changePercent: number | null;
}

export interface DashboardKpis {
  activeTasks: DashboardKpi;
  overdueTasks: DashboardKpi;
  completedThisMonth: DashboardKpi;
  unreadNotifications: DashboardKpi;
}

export interface DashboardStatusSlice {
  status: TaskStatusBucket;
  count: number;
}

export interface DashboardPrioritySlice {
  priority: Priority;
  count: number;
}

/** One day of the productivity trend line. */
export interface DashboardTrendPoint {
  /** local calendar day, `YYYY-MM-DD` — the client formats the axis label */
  date: string;
  count: number;
}

/** One bar of the workload chart — a person and their open task count. */
export interface DashboardWorkloadEntry {
  userId: string;
  /** null if the assignee's user row no longer exists */
  name: string | null;
  avatarUrl: string | null;
  count: number;
}

/** One cell of the contribution grid. */
export interface DashboardHeatmapDay {
  /** local calendar day, `YYYY-MM-DD` */
  date: string;
  count: number;
}

export interface DashboardActivityHeatmap {
  /** 53 weeks x 7 days, oldest first, Monday-first, zero-filled */
  days: DashboardHeatmapDay[];
  /** today in the server's calendar — cells past this one are in the future */
  today: string;
}

export interface DashboardTaskProject {
  _id: string;
  name: string;
  color: string;
  /** this project's "done" column name — what the My Tasks checkbox PATCHes to */
  doneStatus: string | null;
}

export interface DashboardTask {
  _id: string;
  taskNumber: number;
  title: string;
  status: string;
  statusBucket: TaskStatusBucket;
  priority: Priority;
  dueDate: string | null;
  projectId: string;
  project: DashboardTaskProject | null;
}

export interface DashboardActivity {
  _id: string;
  action: string;
  module: string;
  field: string | null;
  createdAt: string;
  actor: { _id: string; name: string; avatarUrl: string | null } | null;
  task: { _id: string; title: string; taskNumber: number } | null;
  project: { _id: string; name: string } | null;
}

export interface DashboardSprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  total: number;
  completed: number;
  inProgress: number;
  todo: number;
  progress: number;
}

export interface DashboardOverview {
  kpis: DashboardKpis;
  taskStatus: DashboardStatusSlice[];
  priorityDistribution: DashboardPrioritySlice[];
  /** tasks completed per day over the last 7 days, oldest first, zero-filled */
  productivityTrend: DashboardTrendPoint[];
  /** open tasks per assignee, busiest first, capped at the top few */
  workloadByAssignee: DashboardWorkloadEntry[];
  myTasks: DashboardTask[];
  myTasksTotal: number;
  recentActivities: DashboardActivity[];
  /** activity-log density per day, for the contribution grid */
  activityHeatmap: DashboardActivityHeatmap;
  upcomingDeadlines: DashboardTask[];
  sprint: DashboardSprint | null;
}
