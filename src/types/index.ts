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
  filename: string;
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
  title: string;
  body: string;
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
  taskId: string;
  projectId: string;
  workspaceId: string;
  actorId: User;
  action: string;
  field: string | null;
  oldValue: any;
  newValue: any;
  meta: string | null;
  createdAt: string;
}
