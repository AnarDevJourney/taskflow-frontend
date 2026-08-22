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
    ├── dashboard/
    │   ├── services/dashboardService.ts   # getOverview(workspaceId) — GET /workspaces/:id/dashboard/overview, the page's only request
    │   ├── hooks/useDashboardOverview.ts  # the single useQuery every widget reads from (60s staleTime, placeholderData so a refetch dims instead of collapsing)
    │   ├── utils/
    │   │   ├── chartPalette.ts            # the donuts' colors, per theme — NOT the `var(--token)` UI colors (see Dashboard notes below)
    │   │   └── dueBadge.ts                # due date → "Today"/"Tomorrow"/"in 3 days"/"2 days overdue" + a tone, shared by My Tasks and Upcoming Deadlines
    │   ├── components/
    │   │   ├── DashboardDonutChart.tsx + .module.css  # THE reusable donut — both charts are this component with different props. Custom tooltip + custom legend (the legend doubles as the chart's table view: every slice's count and share is readable without hovering). memo'd
    │   │   ├── ActivityHeatmap.tsx + .module.css     # GitHub-style contribution grid (53 week-columns x 7 day-rows) — plain CSS grid, not Recharts. Full width, last card on the page. memo'd
    │   │   ├── WorkloadByAssigneeChart.tsx + .module.css # Recharts horizontal BarChart — open tasks per person, busiest first, one color for every bar. Shares the last row with SprintProgressCard. memo'd
    │   │   ├── ProductivityTrendChart.tsx + .module.css # full-width Recharts LineChart — tasks completed per day over the last 7 days, with a dashed daily-average reference line and a direct label on the endpoint. memo'd
    │   │   ├── KpiCard.tsx + .module.css             # stat tile: icon, value, label, optional comparison chip (hidden when changePercent is null). memo'd
    │   │   ├── WidgetCard.tsx + .module.css          # the shell the three list widgets share (header + badge + empty state + hairline-separated rows)
    │   │   ├── MyTasksWidget.tsx + .module.css       # checkbox completes a task for real, via the ordinary taskService.update + the backend-resolved `project.doneStatus`
    │   │   ├── RecentActivityWidget.tsx + .module.css # reuses activity's `activityMeta` + `activityLogPage.action.*` translations rather than a second copy
    │   │   ├── UpcomingDeadlinesWidget.tsx + .module.css
    │   │   └── SprintProgressCard.tsx + .module.css  # stacked meter in the same three status colors as the donut above it. memo'd
    │   └── pages/
    │       └── DashboardPage.tsx + .module.css       # `/workspaces/:workspaceId/dashboard` — KPI row, two donuts, three widgets, sprint progress
    ├── files/
    │   ├── services/fileService.ts      # upload (task attachment), getSignedUrl, remove, uploadAvatar/removeAvatar, uploadWorkspaceLogo/removeWorkspaceLogo — all multipart, all with upload-progress callbacks
    │   ├── hooks/useAttachments.ts      # useAttachmentUploads (sequential per-file upload queue with progress), useOpenAttachment (presigned URL → open/download), useDeleteAttachment
    │   ├── utils/fileMeta.ts            # ALLOWED_ATTACHMENT_MIME_TYPES / ALLOWED_IMAGE_MIME_TYPES / MAX_*_MB (mirror the backend's), formatBytes, per-MIME icon + colour
    │   ├── utils/validateFile.ts        # client-side MIME + size pre-check (UX only — the backend is the real gatekeeper)
    │   ├── utils/uploadError.ts         # extractApiError — pulls the message out of the API's error envelope
    │   └── components/
    │       ├── FileDropZone.tsx + .module.css       # click-or-drop picker. NOT AntD's Upload — that component wants to own the request, and uploads must go through @lib/axios to inherit cookie auth + the 401-refresh interceptor
    │       ├── TaskAttachments.tsx + .module.css    # attachment list (icon/size/date, preview, download, delete-with-confirm) + drop zone + per-file progress rows. Rendered by TaskDetailModal
    │       └── ImageUploadField.tsx + .module.css   # avatar/workspace-logo picker (preview + drop zone + Remove) — one image that replaces the previous one; used by SettingsPage and WorkspacesPage's edit modal
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
    │   ├── components/
    │   │   ├── NotificationsPanel.tsx + .module.css        # bell dropdown list — header has a "View all" link to /notifications alongside "Mark all as read"
    │   │   ├── NotificationToast.tsx + .module.css         # body of the pop-up card
    │   │   ├── NotificationDetailDrawer.tsx + .module.css  # right-drawer for one notification — type badge, full title/body, actor (if any), read/unread + read-at, an "open related item" button when `link` is set. Same visual language as Activity Log's ActivityDetailDrawer (shared CSS module copied over, not imported cross-feature)
    │   │   └── NotificationViewModal.tsx + .module.css     # "Customize table" picker — same pattern as ActivityViewModal (6-variant catalog with mockup previews), CSS module copied from that component
    │   ├── hooks/
    │   │   ├── useNotifications.ts         # REST list/mark-read (+60s fallback poll) — used by the bell panel
    │   │   ├── useNotificationsTable.ts    # filter-driven, server-side paginated (`notificationService.query`), placeholderData like useWorkspaceActivity — used by NotificationsPage, not the bell panel
    │   │   ├── useNotificationSocket.ts    # the websocket connection, mounted once in AppLayout
    │   │   └── useNotificationToast.tsx    # opens the AntD top toast
    │   ├── services/notificationService.ts   # `getAll(page, limit)` for the bell panel + `query(dto)` (isRead/type/dateFrom/dateTo/page/limit) for the table page
    │   ├── utils/
    │   │   ├── notificationIcon.tsx      # icon + colour per NotificationType
    │   │   ├── notificationText.ts       # renderNotificationText — titleKey/bodyKey + params → translated title/body, shared by the bell panel, toast, table, and drawer
    │   │   ├── notificationColumns.ts    # column customization model (ColumnId: status/type/message/actor/date, same shape as activityColumns.ts) — NotificationsPage's own columns
    │   │   └── notificationViews.ts      # 6 table view variants (classic/compact/striped/minimal/colorful/spreadsheet), mirrors activityViews.ts
    │   └── pages/
    │       └── NotificationsPage.tsx + .module.css   # `/notifications` (top-level, not workspace-scoped — notifications aren't per-workspace) — same layout/mechanics as ActivityLogPage: Status(read/unread)/Type/date-range filters, server-side pagination, "Customize table"/"Customize columns"/column-resize all persisted via `table-settings` (`key: "notifications"`), trailing eye-icon column opens NotificationDetailDrawer and marks that notification read. Reached from the user-avatar dropdown ("Notifications", above Settings) and the bell panel's "View all" link
    ├── search/
    ├── settings/
    │   └── pages/
    │       └── SettingsPage.tsx + .module.css   # user-level app settings — a Profile picture card (`ImageUploadField` → POST/DELETE /users/me/avatar) and the Appearance card (theme picker); route `/settings`, reached via the user-avatar dropdown, not workspace-scoped
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

## File Uploads

Everything that uploads a file goes through `features/files`. Three targets exist, one component each:

| Where | Component | Endpoint |
|---|---|---|
| Task detail modal → "Qoşmalar / Attachments" | `TaskAttachments` | `POST /files/upload`, `GET /files/signed-url`, `DELETE /files/:attachmentId` |
| Settings → Profile picture | `ImageUploadField` | `POST/DELETE /users/me/avatar` |
| Workspaces → edit modal → Logo | `ImageUploadField` | `POST/DELETE /workspaces/:workspaceId/logo` |

### Rules

- **`Content-Type: null` is mandatory on every multipart request** — `MULTIPART_CONFIG` in `fileService.ts`. The shared axios instance sets `Content-Type: application/json` as an instance default, and axios's default `transformRequest` reacts to that by running FormData through `formDataToJSON`: a `File` serializes to `{}` and the server receives a JSON body with no file at all. Nulling the header skips that conversion *and* stops axios from sending a Content-Type, which is what lets the browser add the multipart boundary. This was a real bug — the symptom is a 400 `No file provided in the "file" field`.
- **Text fields go into the FormData before the file.** The backend streams the multipart body straight into MinIO, so it parses parts in wire order — fields appended after the file part do not exist yet when the upload is validated. `buildAttachmentForm` already does this; keep it that way.
- **Never use AntD's `Upload`.** It owns its own request, which would bypass `@lib/axios` and therefore cookie auth and the 401-refresh interceptor. `FileDropZone` is the click-or-drop picker to reuse.
- **The file input is cleared when the picker opens, not in `onChange`.** Clearing it in `onChange` resets the input while an upload may still be reading its `File`; clearing on open still lets the same file be picked twice in a row.
- **Attachments are addressed by `attachment.id`**, the subdocument's ObjectId. The backend exposes it via the `id` virtual on the `Attachment` subdocument schema, so it is present both on `task.attachments[]` and in the upload response.
- Downloads never go through the API: `useOpenAttachment` fetches a presigned URL and points the browser straight at MinIO. Avatars and logos are plain public URLs (bucket `public/` prefix) and go directly into `<img src>`.
- Uploads are **sequential**, not parallel — each one holds an open stream for its whole duration and the endpoint is rate-limited (20/hour).
- `fileMeta.ts` mirrors the backend's MIME allow-lists and size ceilings. They are duplicated on purpose (instant feedback), but the backend is the gatekeeper — keep both in sync when the backend's list changes.

### i18n

Two new top-level namespaces in all three locales: `attachments.*` and `imageUpload.*`, plus `settingsPage.profile.*` and `workspaces.logoLabel` / `workspaces.logoUploadLabel`.

---

## Dashboard

The whole page is one request (`useDashboardOverview` → `GET /workspaces/:id/dashboard/overview`).
Do not add a second query for a new widget — extend the backend's `$facet` and the
`DashboardOverview` type instead, or the widgets can start disagreeing with each other.

### Chart colors are not UI tokens

`features/dashboard/utils/chartPalette.ts` holds hex values per theme, deliberately
separate from `global.css`'s `var(--token)` set, for two reasons:

- Recharts writes colors into SVG `fill` attributes and interpolates them while
  animating, so it needs literal values, not `var()` references.
- A chart fill answers to different constraints than a border or a surface: a
  lightness band, a chroma floor, and colorblind-separation floors measured against
  the surface it sits on. Both palettes were run through a palette validator against
  this app's real surfaces (`#ffffff` light, `#111827` dark) before being adopted.

The two donuts use a categorical palette — a distinct hue per slice, not a ramp:

- **Status** (`todo`/`in_progress`/`done`) — three independent workflow states,
  each with its own hue, assigned in a fixed order that never changes with the
  data. A bucket that empties keeps its color.
- **Priority** (`critical`/`high`/`medium`/`low`) — four distinct hues
  (magenta/yellow/blue/green), not four shades of one color. Severity order is
  carried by the legend's labels, so color's only job here is identity. Red and
  orange (the "obvious" critical/high pair) do not survive together — checking
  every 4-hue subset of the app's validated 8-hue set against both surfaces
  leaves exactly two passing combinations, both without red or orange; magenta
  was picked for `critical` as the most alarming hue on offer.

The productivity-trend line and the workload bars are each a single series, so
they just take the first categorical slot (blue) and need no legend — the card's
title says what is plotted. Every workload bar is the **same** color on purpose:
the bar length already says who is busy, and since the rows are sorted by count,
a hue per person would repaint everyone the moment a number changed, so nobody
could ever learn "the green one is Ramin". The viewer's own row is marked by font
weight and ink instead — emphasis via typography, never a second bar color.

The heatmap uses a **sequential** green ramp (five steps: an empty-day track plus
four levels), which is a different job again — magnitude, not identity. See the
note on it below before touching those values.

`chartChromeColors()` in the same file holds the gridline / axis-text / surface /
track hexes the Recharts charts need: Recharts writes those into SVG
**attributes**, where `var()` does not resolve, so they duplicate `--border` /
`--text-secondary` / `--surface` and must be kept in step if those tokens change.

This is the one place the app's `priorityColors` (used by every priority badge,
including the ones in the My Tasks widget on this same page) is deliberately not
reused — a badge is text on a tint and answers to text-contrast rules, a donut
segment is a bare block of color. If you change one, you do not have to change the
other.

### Page layout

`DashboardPage.tsx` renders eight sections top to bottom. The grids are all
`auto-fit`/`minmax` so they collapse on their own; `@media (max-width: 900px)`
forces the chart, widget and team rows to a single column.

| # | Section | Layout | Scope |
|---|---|---|---|
| 1 | 4 KPI cards | `.kpiGrid`, auto-fit | workspace (unread notifications: yours) |
| 2 | Status + Priority donuts | `.chartGrid`, 2 up | workspace |
| 3 | Productivity trend | full width | workspace |
| 4–6 | My Tasks · Recent Activity · Upcoming Deadlines | `.widgetGrid`, 3 up | My Tasks is yours, the rest workspace |
| 7 | Workload + Sprint progress | `.teamGrid`, 1.5fr / 1fr | workspace |
| 8 | Activity heatmap | full width | workspace |

Sections 7 and 8 are deliberate pairings rather than defaults: Workload sits beside
Sprint Progress because both answer "where does the team stand right now?", and
because Sprint Progress alone left that row mostly empty.

### Adding a widget

1. Extend the backend `$facet` and `DashboardOverview` (see the backend's
   "Adding a new dashboard widget"). Never add a second query here.
2. Add the field to `src/types/index.ts`, then read it off `data` in
   `DashboardPage` — no new hook.
3. Reuse `WidgetCard` for a list widget; for a chart, copy an existing card's
   shell (16px radius, hairline border, `0 1px 2px` shadow, 24px padding).
4. Colors go in `chartPalette.ts`, per theme, validated — never a raw hex in a
   component and never a `var(--token)` inside a Recharts prop.
5. `memo` the component and `useMemo` any data transform, so an unrelated
   re-render (a checkbox toggling, a refetch landing) doesn't restart animations.
6. Add `dashboardPage.<widget>.*` to **all three** locales (`en`/`az`/`ru`), and
   pass counts under a name other than `count` — `count` triggers i18next
   pluralization, which would need `_one`/`_few`/`_other` keys per language.

### Other things worth knowing

- **The legend is the table view.** Every donut slice's label, count and share are
  printed under the ring, so no value is reachable only by hovering. Keep it that way
  when editing the chart.
- **Slice order is fixed client-side too** (`STATUS_ORDER` / `PRIORITY_ORDER`), not
  taken from the response array, so a slice can never change position between
  refetches. The backend already returns both distributions zero-filled in that order.
- **The trend chart's x-axis labels come from dayjs**, whose locale is kept in sync
  with the app language (`lib/i18n`), so the weekday abbreviations and the tooltip's
  dates follow whatever the user picked — no separate weekday translation table.
- **The trend's dashed rule is the window's daily average.** Dashing is otherwise an
  anti-pattern for grid/axis lines here; it is used only because this is a reference
  *level* rather than data, which is the one place dashing carries meaning.
- **The heatmap is a CSS grid, not a chart library.** `grid-auto-flow: column`
  over 7 explicit rows fills top-to-bottom then left-to-right — exactly the order
  the server sends the days in, so the DOM needs no rearranging. Its green ramp is
  a **sequential** encoding, so the faintest step is *meant* to sit close to the
  surface; running it through the validator's `--ordinal` gate flags the light end
  for contrast, but that gate does not apply — darkening level 1 would make one
  action look like a busy day.
- **Two things the heatmap got wrong once, both fixed — don't reintroduce them.**
  (1) Per-cell `onMouseEnter` handlers meant every crossing between two cells
  re-rendered all 371; it now uses one delegated `onPointerOver` on the scroller
  plus a `useMemo`'d grid element, so hovering re-renders only the tooltip.
  (2) The tooltip lived inside the `overflow-x: auto` scroller and was clipped at
  the right edge; it now renders in the card and flips its anchor near the edge.
- **`label` is a reserved prop on a Recharts `<Tooltip content={...}>` element.**
  Recharts clones that element and injects its own `label` (the active category)
  over any prop of the same name — passing a `label` prop to a custom tooltip
  silently renders the category instead of your text. `WorkloadByAssigneeChart`
  calls its equivalent prop `unitLabel` for exactly this reason; this was a real
  bug (the tooltip printed the person's name twice).
- **The workload chart's height grows with its row count** rather than being fixed,
  and names are truncated to `NAME_MAX_CHARS` — a name wider than
  `NAME_AXIS_WIDTH` is clipped at the card's left edge, not wrapped. Keep the two
  constants in step; the viewer's own row renders bold, which is the widest case.
- **The My Tasks checkbox writes through the normal task endpoint** —
  `taskService.update(..., { status: task.project.doneStatus })`. `doneStatus` is
  resolved by the backend per project because kanban column names are free-form; the
  checkbox is disabled (with a tooltip) when a project has no column that reads as
  "done".
- **Recharts' entrance animation is driven by `requestAnimationFrame`**, which Chrome
  freezes in a backgrounded tab — a donut in a background tab stays blank until the
  tab is focused, then animates in. That is Recharts' behavior for every chart in the
  app (burndown/velocity too), not something specific to this page. It also makes
  charts invisible to screenshots of a backgrounded tab, which is worth knowing when
  automating.
- `animationBegin` is set to 0: Recharts defaults to a 400ms delay before a 300ms
  animation, which reads as the chart failing to load.

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

## Real-time notifications

`useNotificationSocket()` is mounted **once**, in `AppLayout`, and owns the whole live channel:

- Connects to `${VITE_WS_URL}/notifications` with `withCredentials: true` — auth is the HttpOnly `access_token` cookie the browser attaches to the handshake, there is no token to pass in JS.
- `notification:new` → `{ notification, unreadCount }`: pushes into Redux, opens the toast, invalidates the notification queries.
- `notification:count` → `{ unreadCount }`: sent on connect and whenever anything is marked read, including from another tab.
- `unauthorized` → refreshes the access token via `POST /auth/refresh` and reconnects (max 3 attempts). The server closes the socket itself, so socket.io will not auto-reconnect on its own here.

The toast is AntD's `notification` API reached through `App.useApp()` (`useNotificationToast`), never the static `notification.*` import — the static one renders outside `ConfigProvider` and ignores dark mode. `<AntApp>` in `App.tsx` sets the shared config: `placement: "top"`, `duration: 3`, `maxCount: 3`, `stack: false`.

`notification.link` is a relative SPA path (e.g. `/workspaces/:wsId/projects/:pId/board?task=:taskId`), so clicking a toast or a panel row is a `navigate()`, not a page load. `BoardPage` reads `?task=` and opens that task's detail modal.

---

## Redux Store Rules

Only these things belong in Redux:

- `ui.sidebarCollapsed` — declared on the slice but currently unused; the sidebar's actual collapsed/expanded state lives in `AppLayout`'s own component state, backend-persisted (see below), not Redux
- `ui.activeWorkspaceId` — currently selected workspace. Persisted to `localStorage` (`taskflow.activeWorkspaceId`) inside the `setActiveWorkspace` reducer itself, so it survives a page reload — `AppLayout` reads the URL's `:workspaceId` first, falls back to this stored value on routes without one (e.g. `/workspaces`), and only then falls back to the first workspace in the list.
- `ui.activeProjectId` — currently selected project
- `notifications.items` — notification list pushed via WebSocket
- `notifications.unreadCount` — badge count. **Always set from the server's number** (the socket sends it with every event); never incremented locally, or it drifts as soon as a second tab marks something read.
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
- `/notifications` — not workspace-scoped (notifications are per-user, not per-workspace) — the Notifications table page

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
- ✅ Task detail modal — title/description editing (Save/Cancel), right panel fields (Save/Cancel), checklist (add + toggle), attachments (drag-and-drop or click upload with per-file progress, presigned download/preview, delete-with-confirm), comments (add/edit/delete)
- ✅ My Tasks page — cross-project task list, server-side paginated (page-size selector: 10/25/50/100) with `SimplePagination`, search + status/priority/project filters (server-side, debounced), "Customize table" modal offering 9 alternate UI layouts for the same data (`TaskListViews.tsx`), a "Columns" modal to show/hide and drag-reorder individual columns, and a column-resize mode (`react-resizable` drag handles, explicit Save/Cancel) — all row-table variants only (`cards`/`kanban` don't have literal columns). All four preferences (table view, page size, columns incl. widths) are saved per-user on the backend via `table-settings` — see Redux Store Rules
- ✅ Dashboard page (`DashboardPage`, route `/workspaces/:workspaceId/dashboard`) — 4 KPI cards with previous-period comparison chips, two Recharts donut charts (status + priority) from one reusable `DashboardDonutChart`, a full-width productivity-trend LineChart, a Workload-by-assignee bar chart paired with sprint progress, a full-width GitHub-style activity heatmap closing the page, My Tasks / Recent Activity / Upcoming Deadlines widgets, and a sprint progress meter. Everything comes from a **single** API call (`useDashboardOverview`); see the Dashboard section below
- ✅ Sprints page — sprint list sidebar with velocity chart, planned/active/completed sprint views, create/start/complete sprint flows, add tasks from backlog, burndown chart
- ✅ Notifications — bell dropdown + live badge + a toast that slides in from the top and auto-dismisses after 3s. See "Real-time notifications" below.
- ✅ Search overlay — Cmd+K global search
- ✅ File uploads (`features/files`) — task attachments in the task detail modal, profile picture on the Settings page, workspace logo in the Workspaces edit modal. See the "File Uploads" section above; the axios `Content-Type: null` rule there is not optional
- ✅ System/Light/Dark theme (`src/lib/theme/`) — `useTheme()` hook, `localStorage`-persisted, follows OS theme live when set to "system", no reload on change. Settings page (Appearance card) to pick it. AntD components theme automatically via `ConfigProvider`; custom CSS uses `var(--token)` from `global.css` — fully rolled out on `AppLayout`, My Tasks, and Activity Log; other pages still have some pre-theme-system hardcoded colors (see Design System's Rollout status note)

- ✅ Activity Log page (`ActivityLogPage`) — workspace-wide activity table with User/Module/Action/date-range filters, server-side pagination (page-size selector, `SimplePagination`), table view customization (6 variants with mockup previews, like My Tasks), column show/hide/reorder/resize, eye-icon-per-row opening `ActivityDetailDrawer` (actor, project/task context, changed-field before→after, `meta`, collapsed system-info section). All four preferences (page size, table view, columns incl. widths) persist to backend `table-settings` (`key: "activityLog"`) — same treatment as My Tasks now, nothing left in `localStorage`
- ✅ Notifications table page (`NotificationsPage`, route `/notifications`) — same structure/mechanics as `ActivityLogPage` (Status/Type/date-range filters, server-side pagination, 6-variant table view customization, column show/hide/reorder/resize, all persisted to `table-settings` with `key: "notifications"`), applied to the user's own notification history instead of the workspace audit log. Eye-icon-per-row (and clicking the row) opens `NotificationDetailDrawer` and marks that notification read via the existing `markAsRead` mutation. Backend's `GET /notifications` gained `isRead`/`type`/`dateFrom`/`dateTo` filters to power it, alongside the bell panel's existing `page`/`limit`/`unreadOnly` usage

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
