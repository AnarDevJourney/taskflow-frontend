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
| Drag & Drop   | @dnd-kit/core + @dnd-kit/sortable    | Kanban board drag and drop                      |
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
│   └── queryClient.ts          # React Query client with retry and stale time config
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
│   │   ├── AppLayout.tsx       # sidebar + topbar + <Outlet /> — wraps all protected pages
│   │   ├── AppLayout.module.css
│   │   └── AuthGuard.tsx       # redirects to /login if not authenticated
│   └── ui/                     # shared reusable UI components (avatars, badges, etc.)
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
    │   ├── services/workspaceService.ts  # getMyWorkspaces, getOne
    │   ├── hooks/useWorkspaces.ts
    │   └── pages/WorkspacesPage.tsx
    ├── projects/
    │   ├── services/projectService.ts    # getAll, getOne, create
    │   ├── hooks/useProjects.ts          # useProjects (list) + useProject (single — includes statuses)
    │   └── pages/
    │       ├── ProjectsPage.tsx + ProjectsPage.module.css
    ├── tasks/
    │   ├── services/taskService.ts       # getAll, create, update, reorder, remove, addChecklistItem, toggleChecklistItem
    │   ├── hooks/useTasks.ts
    │   ├── components/
    │   │   ├── BoardColumn.tsx + BoardColumn.module.css
    │   │   ├── TaskCard.tsx + TaskCard.module.css
    │   │   ├── CreateTaskModal.tsx
    │   │   ├── TaskDetailModal.tsx       # full task detail — title/desc editing, right panel, checklist, comments
    │   │   └── TaskDetailModal.module.css
    │   └── pages/
    │       ├── BoardPage.tsx + BoardPage.module.css
    │       └── MyTasksPage.tsx
    ├── comments/
    │   └── services/commentService.ts   # getAll, create, update, remove
    ├── notifications/
    │   └── hooks/useNotifications.ts
    └── search/
```

---

## Design System

### Colors (from src/styles/theme.ts tokens)

```typescript
primary:  '#4a6cf7'   // blue — buttons, links, selected states
success:  '#10B981'   // green
warning:  '#F59E0B'   // amber
error:    '#f85149'   // red

bg:       '#F5F6FA'   // page background
card:     '#FFFFFF'   // card/panel background
border:   '#E8E8E8'   // borders
text:     '#1a1f2e'   // primary text
muted:    '#8c8c8c'   // secondary text, icons

priority colors:
  critical: '#f5222d'
  high:     '#fa8c16'
  medium:   '#4a6cf7'
  low:      '#8c8c8c'
```

### Design principles — KEEP IT SIMPLE

- Light mode only — no dark mode, no theme switching
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

- `ui.sidebarCollapsed` — sidebar open/closed
- `ui.activeWorkspaceId` — currently selected workspace
- `ui.activeProjectId` — currently selected project
- `notifications.items` — notification list pushed via WebSocket
- `notifications.unreadCount` — badge count
- `notifications.isOpen` — notification panel open/closed

Everything else (server data) belongs in React Query, not Redux.

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

- `/login`
- `/register` — requires `?token=` query param
- `/forgot-password`
- `/reset-password` — requires `?token=` query param

Protected routes (wrapped in `AuthGuard`):

- `/workspaces/:workspaceId/projects`
- `/workspaces/:workspaceId/projects/:projectId/board`
- `/my-tasks`

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

- ✅ Foundation: Axios, React Query, Redux store, router, theme
- ✅ Auth pages: Login, Register, ForgotPassword, ResetPassword
- ✅ AppLayout: sidebar, topbar, workspace switcher, user menu
- ✅ AuthGuard: route protection
- ✅ Projects page: project grid, create project modal
- ✅ Board page: kanban columns, task cards, drag and drop (cross-column + same-column reorder), create task modal
- ✅ Task detail modal — title/description editing (Save/Cancel), right panel fields (Save/Cancel), checklist (add + toggle), comments (add/edit/delete)

## In Progress / Remaining

- ⬜ My Tasks page — cross-project task list
- ⬜ Project Settings page — edit project, manage columns and members
- ⬜ Notifications panel — bell icon dropdown with real-time updates
- ⬜ Search overlay — Cmd+K global search
- ⬜ Activity log — inside task detail modal

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
