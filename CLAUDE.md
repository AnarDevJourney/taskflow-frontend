# TaskFlow — Frontend (React + TypeScript)

## Project Overview

Internal task management application frontend. React 18 + TypeScript + Vite.
Consumes the TaskFlow NestJS REST API. Real-time notifications via Socket.io.

---

## Tech Stack

| Layer         | Technology                           | Purpose                                         |
| ------------- | ------------------------------------ | ----------------------------------------------- |
| Framework     | React 18 + TypeScript + Vite         | Core framework                                  |
| UI Components | Ant Design 5.x                       | All UI components                               |
| Styling       | CSS Modules                          | Page and component styles                       |
| Server state  | React Query (TanStack)               | API data fetching, caching, mutations           |
| UI state      | Redux Toolkit                        | Theme, sidebar, notifications, active workspace |
| Forms         | React Hook Form (or Ant Design Form) | Form state and validation                       |
| HTTP          | Axios                                | API calls with cookie credentials               |
| Routing       | React Router v6                      | Client-side routing                             |
| Drag & Drop   | @dnd-kit/core + @dnd-kit/sortable    | Kanban board drag and drop, column reordering   |
| Resize        | react-resizable                      | My Tasks column-width resize handles            |
| Real-time     | Socket.io-client                     | WebSocket notifications                         |
| Dates         | dayjs                                | Date formatting and manipulation                |

---

## Folder Structure

```
src/
├── main.tsx                    # entry point
├── App.tsx                     # root — ConfigProvider, QueryClientProvider, Redux Provider, Router
├── types/
│   └── index.ts                # ALL shared TypeScript types and enums — mirrors backend exactly
├── lib/
│   ├── axios.ts                # Axios instance with withCredentials + 401 refresh interceptor
│   ├── queryClient.ts          # React Query client with retry and stale time config
│   └── theme/                  # System/Light/Dark theme — see Design System's Theme system section
│       ├── constants.ts        # Theme type, THEME_STORAGE_KEY, resolveTheme()
│       └── ThemeProvider.tsx   # context + useTheme() hook, syncs <html data-theme> and localStorage
├── store/
│   ├── index.ts                # Redux store + useAppDispatch + useAppSelector typed hooks
│   ├── uiSlice.ts              # sidebarCollapsed, activeWorkspaceId, activeProjectId
│   └── notificationsSlice.ts   # notifications array, unreadCount, isOpen panel
├── styles/
│   ├── theme.ts                # Ant Design light theme config + design tokens
│   └── global.css              # reset, scrollbar, body font
├── router/
│   └── index.tsx               # all routes — public (login/register/forgot/reset) + protected
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx       # sidebar + topbar + <Outlet /> — wraps all protected pages. Sidebar nav module visibility/order + collapsed/expanded state are backend-persisted per user via `sidebarSettings` (see below), applied once on load via the same `useRef` guard pattern as MyTasksPage's table settings
│   │   ├── AppLayout.module.css
│   │   ├── SidebarModulesModal.tsx + .module.css   # sidebar customization modal — checkbox per nav module (visible/hidden) + @dnd-kit drag handle to reorder, mirrors TableColumnsModal's pattern; saves once on modal close
│   │   └── AuthGuard.tsx       # redirects to /login if not authenticated
│   └── ui/                     # shared reusable UI components (avatars, badges, etc.)
│       ├── SimplePagination.tsx + .module.css   # first/prev/[page-1, page, page+1]/next/last pagination control (not antd's Pagination). Cross-feature — used by MyTasksPage and ActivityLogPage; moved here from features/tasks/components/ once a second feature needed it
│       └── ColumnsModal.tsx + .module.css       # generic checkbox + @dnd-kit drag-reorder list — `<ColumnsModal<T extends {id,visible,width?}>>` takes a `labels` record instead of baking in i18n keys, so any table's column set can reuse it. Used by ActivityLogPage; My Tasks still has its own TaskListViews-coupled TableColumnsModal (not yet migrated to this shared one)
└── features/
    ├── auth/
    │   ├── services/authService.ts       # login, logout, me, register, forgotPassword, resetPassword, validateInvite
    │   ├── hooks/useCurrentUser.ts       # useQuery for /auth/me — used across the whole app
    │   └── pages/
    │       ├── LoginPage.tsx + LoginPage.module.css
    │       ├── RegisterPage.tsx
    │       ├── ForgotPasswordPage.tsx
    │       ├── ResetPasswordPage.tsx
    │       └── AuthPage.module.css       # shared CSS for all auth pages
    ├── workspaces/
    │   ├── services/workspaceService.ts  # getMyWorkspaces, create, getOne, update, archive, getArchivedWorkspaces, restore, getMembers, inviteMember, removeMember, updateMemberRole
    │   ├── hooks/useWorkspaces.ts
    │   └── pages/
    │       ├── WorkspacesPage.tsx + WorkspacesPage.module.css   # grid of workspace cards, create/edit/archive/restore modals
    │       ├── WorkspaceMembersPage.tsx + .module.css           # member list, invite, remove, per-member role Select
    │       └── (workspace "active" selection is Redux `ui.activeWorkspaceId`, persisted to localStorage — see Redux Store Rules)
    ├── projects/
    │   ├── services/projectService.ts    # getAll, getOne, create
    │   ├── hooks/useProjects.ts          # useProjects (list) + useProject (single — includes statuses)
    │   └── pages/
    │       ├── ProjectsPage.tsx + ProjectsPage.module.css
    ├── tasks/
    │   ├── services/taskService.ts       # getAll, create, update, reorder, remove, addChecklistItem, toggleChecklistItem
    │   ├── services/taskService.ts       # ...getMyTasks(workspaceId, query) — paginated, hits GET /workspaces/:id/my-tasks (page/limit/status/priority/projectId/search/sortBy/sortOrder)
    │   ├── hooks/useTasks.ts, useMyTasks.ts   # useMyTasks(workspaceId, query) wraps getMyTasks in useQuery with placeholderData so the previous page stays visible while the next loads
    │   ├── utils/taskGrouping.ts         # priorityColors, due-date grouping (getDueDateGroup/groupByDueDate) + groupByStatus — shared by MyTasksPage and TaskListViews
    │   ├── components/
    │   │   ├── BoardColumn.tsx + BoardColumn.module.css
    │   │   ├── TaskCard.tsx + TaskCard.module.css
    │   │   ├── CreateTaskModal.tsx
    │   │   ├── TaskDetailModal.tsx       # full task detail — title/desc editing, right panel, checklist, comments
    │   │   ├── TaskDetailModal.module.css
    │   │   ├── TaskListViews.tsx + .module.css   # renders My Tasks' task list in 9 selectable UI variants (classic/compact/spreadsheet/cards/minimal/colorful/avatar/striped/kanban) — same data, different layout/CSS per `TableViewId`. Also owns column customization: `ColumnId`/`ColumnSetting` (`{id, visible, width?}`)/`DEFAULT_COLUMNS`/`COLUMN_LABEL_KEYS`/`normalizeColumns`, and `isRowTableVariant()` — true only for the 7 row-table variants (not `cards`/`kanban`), gating whether the Columns/Resize buttons show. `TaskListView`'s `resizable`/`onColumnResize` props (threaded into `RowsTable`) wrap each header cell in `react-resizable`'s `<Resizable>` (axis "e", handle is `.resizeHandle`) when resize mode is on; `columnWidthCss()` picks a column's saved pixel width over its `COLUMN_WIDTHS` default (`title` stays fluid `1fr` until explicitly resized)
    │   │   ├── TableViewModal.tsx + .module.css  # "Customize table" picker modal — 3x3 grid of mini CSS-mockup previews, one per TableViewId
    │   │   ├── TableColumnsModal.tsx + .module.css   # "Columns" picker modal — checkbox per column (visible/hidden) + @dnd-kit drag handle to reorder; array order = display order
    │   └── pages/
    │       ├── BoardPage.tsx + BoardPage.module.css
    │       └── MyTasksPage.tsx + MyTasksPage.module.css   # search/status/priority/project filters (server-side, debounced) + per-page size selector + SimplePagination + TaskListView + TableViewModal/TableColumnsModal triggers — table view/page size/columns are loaded from and saved to `useTableSettings`/`useSaveTableSettings` (backend-persisted, see tableSettings feature), not localStorage. Column *resizing* is a separate mode from the Columns modal: a "Resize columns" toggle swaps in a `draftColumns` working copy that absorbs every drag live (via `TaskListView`'s `onColumnResize`) without saving anything; only the "Save" button that replaces the toggle while active commits `draftColumns` → `columns` + `saveSettings({ columns: draftColumns })` in one request, "Cancel" just discards the draft. Page layout matches ActivityLogPage's visual language (title + total-count badge header, filters + table-customization buttons together in one white card, `SimplePagination` centered below the table) — the two pages intentionally look like the same design system
    ├── tableSettings/
    │   ├── services/tableSettingsService.ts   # getOne(key), upsert(key, dto) — talks to GET/PUT /table-settings/:key
    │   └── hooks/useTableSettings.ts          # useTableSettings(key) (useQuery, staleTime: Infinity — this tab is the only writer) + useSaveTableSettings(key) (useMutation, writes through to the query cache on success)
    ├── sidebarSettings/
    │   ├── services/sidebarSettingsService.ts # getOne(), upsert(dto) — talks to GET/PUT /sidebar-settings (singular, no key — one doc per user)
    │   └── hooks/useSidebarSettings.ts        # same shape as useTableSettings/useSaveTableSettings, consumed directly by AppLayout
    ├── comments/
    │   └── services/commentService.ts   # getAll, create, update, remove
    ├── sprints/
    │   ├── services/sprintService.ts    # CRUD, start, complete, getVelocity, getBurndown
    │   ├── hooks/useSprints.ts
    │   ├── components/
    │   │   ├── SprintCard.tsx + SprintCard.module.css   # sidebar list item
    │   │   ├── BurndownChart.tsx        # recharts LineChart (ideal vs actual)
    │   │   ├── VelocityChart.tsx        # recharts BarChart (completed points per sprint)
    │   │   ├── CreateSprintModal.tsx
    │   │   ├── CompleteSprintModal.tsx  # incomplete task action radio + next sprint select
    │   │   └── AddTasksToSprintModal.tsx # backlog task picker with checkboxes
    │   └── pages/
    │       ├── SprintsPage.tsx + SprintsPage.module.css
    ├── notifications/
    │   └── hooks/useNotifications.ts
    ├── search/
    ├── settings/
    │   └── pages/
    │       └── SettingsPage.tsx + .module.css   # user-level app settings — currently just the Appearance card (theme picker); route `/settings`, reached via the user-avatar dropdown, not workspace-scoped
    └── activity/
        ├── services/activityService.ts    # getWorkspaceActivity(workspaceId, query) — GET /workspaces/:id/activity (userId/module/action/dateFrom/dateTo/page/limit)
        ├── hooks/useWorkspaceActivity.ts   # useQuery wrapper, placeholderData so filters don't flash empty while refetching
        ├── utils/activityMeta.ts           # mirrors backend's action→module grouping (`ACTIVITY_MODULES`/`getActivityModule`/`getActionsForModule`) plus a frontend-only action→category (create/update/delete/restore/login) → color/icon mapping (`getActionCategory`, `ACTION_CATEGORY_COLORS`, `ACTION_CATEGORY_ICONS`) — keep the module grouping in sync with the backend's `activity-module.util.ts` when adding a new `ActivityAction`
        ├── utils/activityColumns.ts        # column customization model (ColumnId: user/module/action/context/date, ColumnSetting, DEFAULT_COLUMNS, DEFAULT_COLUMN_WIDTH_PX, normalizeColumns) — same shape as TaskListViews' but this table's own columns. The trailing eye-icon column is a fixed action column, not part of this
        ├── utils/activityViews.ts          # 6 table view variants (classic/compact/striped/minimal/colorful/spreadsheet) — smaller catalog than My Tasks' 9 since this table's columns are generic, not task-specific
        ├── components/
        │   ├── ActivityDetailDrawer.tsx + .module.css   # right-drawer with actor, project/task context, changed-field before→after Tags, any `meta` text, and a default-collapsed "System information" section (`log.ip`/`browser`/`os`/`device` — real values from the backend, falls back to "Not available" per-field if null)
        │   └── ActivityViewModal.tsx + .module.css      # "Customize table" picker — same pattern as My Tasks' TableViewModal (grid of cards with tiny CSS-only mockup previews per variant), just a 6-variant catalog instead of 9
        └── pages/
            └── ActivityLogPage.tsx + .module.css   # workspace-wide activity table — User/Module/Action/date-range filters (Module narrows the Action options), server-side paginated (page-size selector: 10/25/50/100) with `SimplePagination`, an eye icon per row opens ActivityDetailDrawer. page size, "Customize table" (ActivityViewModal), "Customize columns" (shared `ColumnsModal`), and a column-resize mode (`react-resizable`, explicit Save/Cancel — same DOM-measurement approach as My Tasks' resize mode, see that page's `handleEnterResizeMode` comment) are all backend-persisted via `table-settings` with `key: "activityLog"` — same collection and mechanism as My Tasks, just a different key (see Table Settings notes below), not `localStorage`
```

---

## Design System

### Theme system (System / Light / Dark)

The app has a real theme architecture, not just a light palette — `src/lib/theme/`:

- `constants.ts` — `Theme = "system" | "light" | "dark"` (the only three valid values, exported type, no magic strings elsewhere), `THEME_STORAGE_KEY = "taskflow-theme"`, `resolveTheme(theme, prefersDark)` → `"light" | "dark"`
- `ThemeProvider.tsx` — React context + `useTheme()` hook returning `{ theme, resolvedTheme, setTheme }`. Reads `localStorage` on init, listens to `matchMedia("(prefers-color-scheme: dark)")` while `theme === "system"`, and writes `data-theme="light"|"dark"` onto `<html>` via `useLayoutEffect` (so it lands before paint on every change, not just initial load)
- `index.html` has a small inline `<script>` in `<head>` that resolves and sets `data-theme` **before React even mounts** — this is what prevents a light-mode flash on load; it duplicates `ThemeProvider`'s resolution logic on purpose (nothing else can run that early) and must be kept in sync if the storage key/fallback ever changes
- `main.tsx` wraps `<App/>` in `<ThemeProvider>`; `App.tsx` reads `resolvedTheme` via `useTheme()` and picks `lightTheme`/`darkTheme` (from `src/styles/theme.ts`) for AntD's `<ConfigProvider theme={...}>` — this is what makes every AntD component (buttons, inputs, selects, date pickers, modals, drawers, dropdowns, pagination) follow the theme for free, no per-component dark styling needed
- Settings page (`features/settings/pages/SettingsPage.tsx`, reachable via the user-avatar dropdown → "Settings", route `/settings`) has the Appearance card with System/Light/Dark cards (`DesktopOutlined`/`SunOutlined`/`MoonOutlined`)
- No page reload on theme change — it's a pure context update + a `data-theme` attribute swap

### Colors — CSS custom properties (src/styles/global.css)

Every color in the app should reference one of these tokens — never a hardcoded hex. `:root` holds the light values, `[data-theme="dark"]` overrides them; nothing else needs a media query since `data-theme` is always explicitly set (see above).

```css
--bg, --surface, --surface-secondary
--text, --text-secondary
--border
--primary
--success, --warning, --danger
--success-bg, --success-text   /* soft-tint badge pairs, same idea for warning/danger/info */
--warning-bg, --warning-text
--danger-bg, --danger-text
--info-bg, --info-text
```

`src/styles/theme.ts` keeps `tokens`/`darkTokens` as plain hex (AntD's `ConfigProvider` needs real color values to derive shades from, not `var()`) — these are the same colors as the CSS variables above, just duplicated in JS form for AntD's `lightTheme`/`darkTheme` configs. Keep both in sync if a color changes.

**Rollout status**: the token system, `AppLayout` (sidebar/topbar), My Tasks, and the Activity Log page (table + `ActivityDetailDrawer`) are fully converted to `var(--token)`. Other pages (Board, Sprints, Task Detail Modal, etc.) still have some hardcoded hex in their `.module.css` files from before the theme system existed — they inherit correct AntD-component theming automatically (buttons/inputs/modals/etc.), but their custom CSS classes won't fully dark-mode until migrated the same way (swap literal hex for the matching `var(--token)`).

Priority colors (task priority tags, unrelated to light/dark) stay as their own fixed hue per priority — see `features/tasks/utils/taskGrouping.ts`'s `priorityColors` — not part of the light/dark token set.

### Design principles — KEEP IT SIMPLE

- No heavy animations or gradients — subtle box-shadows and transitions only
- Use Ant Design components as-is — do not over-customize
- Cards: `background: #fff`, `border: 1px solid #E8E8E8`, `border-radius: 8px`, `box-shadow: 0 2px 8px rgba(0,0,0,0.06)`
- Border radius: 6–8px for cards and inputs, 4–6px for tags and badges
- Font: system font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`)
- Spacing: multiples of 4px (4, 8, 12, 16, 20, 24px)

---

## Path Aliases

Always use these — never use relative imports that go up more than one level:

```typescript
@types/*        → src/types/*
@lib/*          → src/lib/*
@store/*        → src/store/*
@styles/*       → src/styles/*
@router/*       → src/router/*
@components/*   → src/components/*
@features/*     → src/features/*
@hooks/*        → src/hooks/*
@utils/*        → src/utils/*
```

---

## API Integration Rules

### Axios instance

Always import from `@lib/axios`, never create a new axios instance:

```typescript
import api from "@lib/axios";
```

The instance has:

- `baseURL`: `VITE_API_URL` from `.env` (e.g. `http://localhost:3000/api/v1`)
- `withCredentials: true` — required for HttpOnly cookie auth
- Automatic 401 handling — refreshes token and retries, or redirects to `/login`

### API response shape

Every backend response is wrapped in an envelope:

```typescript
// success
{ success: true, data: <payload> }

// error
{ success: false, error: { statusCode, message, path } }
```

Always unwrap with `res.data.data`:

```typescript
const res = await api.get<ApiResponse<User[]>>("/workspaces");
return res.data.data; // ← the actual array
```

### Services pattern

Every feature has a `services/` file with plain async functions:

```typescript
// ✅ correct
export const workspaceService = {
  getAll: async (): Promise<Workspace[]> => {
    const res = await api.get<ApiResponse<Workspace[]>>("/workspaces");
    return res.data.data;
  },
};

// ❌ wrong — never put API calls directly in components or hooks
```

### React Query hooks pattern

Every feature has a `hooks/` file wrapping the service in useQuery/useMutation:

```typescript
// ✅ correct
export const useWorkspaces = () => {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: workspaceService.getAll,
  });
};
```

Query key conventions:

```typescript
["workspaces"][("projects", workspaceId)][("tasks", workspaceId, projectId)][ // all workspaces // projects in workspace // tasks in project
  ("tasks", workspaceId, projectId, query)
]["me"]["notifications"]; // tasks with filters // current user // notifications
```

### Mutations pattern

```typescript
const { mutate, isPending, error } = useMutation({
  mutationFn: (dto: CreateTaskDto) =>
    taskService.create(workspaceId, projectId, dto),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["tasks", workspaceId, projectId] });
  },
  onError: () => message.error("Failed to create task"),
});
```

### Error message extraction

Errors from Axios always follow this pattern:

```typescript
const errorMessage = (() => {
  if (!error) return null;
  const msg = (error as AxiosError<any>)?.response?.data?.error?.message;
  return Array.isArray(msg) ? msg[0] : msg || "Something went wrong.";
})();
```

---

## Redux Store Rules

Only these things belong in Redux:

- `ui.sidebarCollapsed` — declared on the slice but currently unused; the sidebar's actual collapsed/expanded state lives in `AppLayout`'s own component state, backend-persisted (see below), not Redux
- `ui.activeWorkspaceId` — currently selected workspace. Persisted to `localStorage` (`taskflow.activeWorkspaceId`) inside the `setActiveWorkspace` reducer itself, so it survives a page reload — `AppLayout` reads the URL's `:workspaceId` first, falls back to this stored value on routes without one (e.g. `/workspaces`), and only then falls back to the first workspace in the list.
- `ui.activeProjectId` — currently selected project
- `notifications.items` — notification list pushed via WebSocket
- `notifications.unreadCount` — badge count
- `notifications.isOpen` — notification panel open/closed

Everything else (server data) belongs in React Query, not Redux.

Purely local, per-browser UI preferences that aren't shared app state can skip Redux entirely and read/write `localStorage` directly in the component — same pattern `uiSlice.setActiveWorkspace` uses for its own persistence, just without the Redux layer since nothing else needs to react to it.

Preferences that should follow the *user* rather than the browser (e.g. My Tasks' selected table view/page size/column layout, or the sidebar's module visibility/order/collapsed state) don't belong in either Redux or `localStorage` — they're saved server-side per user via the `table-settings`/`sidebar-settings` backend modules (see `tableSettings`/`sidebarSettings` features, `useTableSettings`/`useSaveTableSettings` and `useSidebarSettings`/`useSaveSidebarSettings`). `MyTasksPage`/`AppLayout` apply the fetched settings exactly once (a `useRef` guard) and then save on every change; watch that ordering if you touch it, or the initial defaults will get saved over the user's real settings before they load.

Always use typed hooks:

```typescript
import { useAppDispatch, useAppSelector } from "@store/index";

// ✅ correct
const dispatch = useAppDispatch();
const count = useAppSelector((s) => s.notifications.unreadCount);

// ❌ wrong
const dispatch = useDispatch();
const count = useSelector((s: any) => s.notifications.unreadCount);
```

---

## Routing

Routes defined in `src/router/index.tsx`.

Public routes (no auth required):

- `/login` — accepts an optional `?inviteToken=` query param (set when redirected here from `/register` because the invited email already has an account); after a successful login it calls `authService.acceptInvite` and lands on that workspace instead of `/workspaces`
- `/register` — requires `?token=` query param. Branches three ways based on `GET /auth/invite/:token`: normal signup form, an "accept invite" screen if the same invited user is already logged in, or a redirect prompt to `/login?inviteToken=...` if the invited email already has an account and no one is logged in
- `/forgot-password`
- `/reset-password` — requires `?token=` query param

Protected routes (wrapped in `AuthGuard`):

- `/workspaces` — workspace list/grid, create/edit/archive/restore
- `/workspaces/:workspaceId/projects`
- `/workspaces/:workspaceId/projects/:projectId/board`
- `/workspaces/:workspaceId/members` — member list, invite, remove, role update
- `/workspaces/:workspaceId/my-tasks`
- `/workspaces/:workspaceId/activity`
- `/settings` — not workspace-scoped (a user-level preference page)

`AuthGuard` checks `useCurrentUser()` — if loading shows spinner, if error/no user redirects to `/login`.

When adding new protected routes always add them inside the existing `AuthGuard` wrapped route in the router, never outside it.

---

## CSS Modules Rules

- One `.module.css` file per component or page
- Name the file the same as the component: `TaskCard.tsx` → `TaskCard.module.css`
- Import as `styles`: `import styles from './TaskCard.module.css'`
- Never use global CSS classes except in `global.css`
- Use `:global()` only to override Ant Design internals when absolutely necessary

```css
/* ✅ correct — override Ant Design card body padding */
.card :global(.ant-card-body) {
  padding: 16px;
}

/* ❌ wrong — never override without :global() wrapper */
.ant-card-body {
  padding: 16px;
}
```

---

## Component Patterns

### Page component structure

```typescript
export default function SomePage() {
  // 1. URL params
  const { workspaceId } = useParams<{ workspaceId: string }>();

  // 2. Data hooks
  const { data, isLoading } = useSomeData(workspaceId ?? '');

  // 3. Local UI state
  const [modalOpen, setModalOpen] = useState(false);

  // 4. Mutations
  const { mutate } = useMutation({ ... });

  // 5. Early returns for loading/error states
  if (isLoading) return <Skeleton />;

  // 6. Render
  return <div>...</div>;
}
```

### Loading states

Use Ant Design `Skeleton` for card-based loading, `Spin` for full-page:

```typescript
// Card loading
<Skeleton active paragraph={{ rows: 3 }} />

// Full page loading
<div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
  <Spin size="large" />
</div>
```

### Empty states

```typescript
<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No tasks yet">
  <Button type="primary" onClick={...}>Create first task</Button>
</Empty>
```

### Modal pattern

- Use Ant Design `Modal` component
- `footer={null}` — always manage footer yourself with a Form
- Reset form on close
- Use `width={480}` or `width={520}` depending on content

---

## Task Detail Modal Patterns

### Keeping modal data fresh
Store only the selected task's **ID** in state, and derive the task object from the live React Query cache. This ensures the modal always shows up-to-date data after any mutation without manual syncing:

```typescript
// ✅ correct — selectedTask stays fresh after every refetch
const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
const selectedTask = selectedTaskId
  ? (tasks.find((t) => t._id === selectedTaskId) ?? null)
  : null;

// ❌ wrong — snapshot goes stale after mutations
const [selectedTask, setSelectedTask] = useState<Task | null>(null);
```

### Resetting modal state on task switch
Add `key={task._id}` on the modal. React remounts the component when the key changes, resetting all local state automatically — no `useEffect` needed:

```tsx
<TaskDetailModal key={selectedTask._id} task={selectedTask} ... />
```

### Editable fields — Save/Cancel pattern
- **Text fields** (title, description): show input + Save/Cancel buttons on click, send on Save only
- **Right panel fields** (status, priority, due date, story points): maintain local state, show Save/Cancel buttons when `hasChanges`, send one batched request on Save

### Optimistic checklist updates
`localChecklist` is local state initialized from `task.checklist` on mount. Both add and toggle update it in `onMutate` for instant feedback, and revert in `onError`:

```typescript
onMutate: (index) => {
  setLocalChecklist((prev) =>
    prev.map((item, i) =>
      i === index ? { ...item, completed: !item.completed } : item,
    ),
  );
},
onError: () => {
  setLocalChecklist(task.checklist); // revert
},
```

### Checklist endpoints
```
POST   /:taskId/checklist              body: { title }   — add item
PATCH  /:taskId/checklist/:itemIndex                     — toggle completed
```

> **Backend note**: After mutating a Mongoose subdocument array by index, call `task.markModified('checklist')` before `task.save()` or the change won't be persisted.

---

## Auth Flow

Authentication uses HttpOnly cookies — the browser sends them automatically on every request. Never manually attach tokens to headers.

The `useCurrentUser` hook (`src/features/auth/hooks/useCurrentUser.ts`) is the source of truth for the logged-in user across the entire app:

```typescript
const { data: user, isLoading, isError } = useCurrentUser();
```

`AuthGuard` uses this hook to protect routes. `AppLayout` uses it to show the user's name and avatar in the sidebar.

On login success → `queryClient.setQueryData(['me'], user)` to avoid an extra network request.
On logout → `queryClient.clear()` to wipe all cached data, then redirect to `/login`.

---

## Completed Features

- ✅ Foundation: Axios, React Query, Redux store, router, theme, i18n (en/az/ru)
- ✅ Auth pages: Login, Register, ForgotPassword, ResetPassword
- ✅ Invite re-use flow: `RegisterPage` branches to an "accept invite" screen (already logged in as the invited user) or redirects to `Login` with `?inviteToken=` (invited email already has an account, not logged in) — see `authService.acceptInvite`
- ✅ AppLayout: sidebar, topbar, workspace switcher (derived from URL, falling back to the persisted `ui.activeWorkspaceId`, falling back to first workspace), user menu, notifications panel, Cmd+K search overlay, sidebar customization (`SidebarModulesModal` — show/hide + drag-reorder nav modules) and a collapsed/expanded toggle, both backend-persisted per user via `sidebar-settings` (default: expanded, all modules visible)
- ✅ AuthGuard: route protection
- ✅ Workspaces page: grid of workspace cards (member count, description), create/edit/archive/restore modals, owner-only archive/restore
- ✅ Workspace Members page: member list, invite (email + role), remove member, per-member role update (Select, owner/admin only, can't change own role)
- ✅ Projects page: project grid, create project modal
- ✅ Project Settings page: edit project, manage columns and members
- ✅ Board page: kanban columns, task cards, drag and drop (cross-column + same-column reorder), create task modal
- ✅ Task detail modal — title/description editing (Save/Cancel), right panel fields (Save/Cancel), checklist (add + toggle), comments (add/edit/delete)
- ✅ My Tasks page — cross-project task list, server-side paginated (page-size selector: 10/25/50/100) with `SimplePagination`, search + status/priority/project filters (server-side, debounced), "Customize table" modal offering 9 alternate UI layouts for the same data (`TaskListViews.tsx`), a "Columns" modal to show/hide and drag-reorder individual columns, and a column-resize mode (`react-resizable` drag handles, explicit Save/Cancel) — all row-table variants only (`cards`/`kanban` don't have literal columns). All four preferences (table view, page size, columns incl. widths) are saved per-user on the backend via `table-settings` — see Redux Store Rules
- ✅ Sprints page — sprint list sidebar with velocity chart, planned/active/completed sprint views, create/start/complete sprint flows, add tasks from backlog, burndown chart
- ✅ Notifications panel — bell icon dropdown with real-time updates (WebSocket)
- ✅ Search overlay — Cmd+K global search
- ✅ System/Light/Dark theme (`src/lib/theme/`) — `useTheme()` hook, `localStorage`-persisted, follows OS theme live when set to "system", no reload on change. Settings page (Appearance card) to pick it. AntD components theme automatically via `ConfigProvider`; custom CSS uses `var(--token)` from `global.css` — fully rolled out on `AppLayout`, My Tasks, and Activity Log; other pages still have some pre-theme-system hardcoded colors (see Design System's Rollout status note)

- ✅ Activity Log page (`ActivityLogPage`) — workspace-wide activity table with User/Module/Action/date-range filters, server-side pagination (page-size selector, `SimplePagination`), table view customization (6 variants with mockup previews, like My Tasks), column show/hide/reorder/resize, eye-icon-per-row opening `ActivityDetailDrawer` (actor, project/task context, changed-field before→after, `meta`, collapsed system-info section). All four preferences (page size, table view, columns incl. widths) persist to backend `table-settings` (`key: "activityLog"`) — same treatment as My Tasks now, nothing left in `localStorage`

## In Progress / Remaining

- ⬜ Activity log inside the task detail modal (a per-task view, distinct from the new workspace-wide Activity Log page)

---

## Environment Variables

```env
VITE_API_URL=http://localhost:3000/api/v1    # backend API base URL
VITE_WS_URL=http://localhost:3000            # WebSocket base URL (no /api/v1)
```

Access in code:

```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

Never hardcode URLs — always use env vars.

---

## Running the Project

```bash
npm run dev      # start dev server on localhost:5173
npm run build    # production build
npm run preview  # preview production build
```

Backend must be running for API calls to work:

```bash
# from the backend folder
./scripts/dev.sh
```
