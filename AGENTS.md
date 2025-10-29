# Agent-lightning Dashboard — Detailed Design Spec

Tech stack: **React + Mantine UI**, **Redux Toolkit**, **React Router**, **Storybook**. Backend: **FastAPI (uvicorn)**.

## App architecture (high level)

### AppShell layout

`AppShell` with persistent `Navbar` (left), optional `Header` (top; can be minimal), and main content as a `Router` outlet.

### Navbar content

* Brand row: `[ActionIcon] Agent-lightning Dashboard`
* `Navbar.Section` for main nav: `Rollouts`, `Resources`, `Traces`, `Settings` (use `NavLink`s that preserve current query when it makes sense)
* Footer: connection indicator (bound to `ServerConfig.baseUrl` & health state)

### State/data: Redux Toolkit + RTK Query

* Slice: `serverConfig` (`baseUrl`, `autoRefreshMs`)
* UI slices: `ui/toasts`, `ui/drawers`, `ui/theme` (dark/light), `ui/routerState` (deep-link param mirrors where local state is needed)
* Maybe some more on the data model later...

### URL ↔ state sync

For the first iteration, no state will appear in the URL, other than pages like `/rollouts`, `/resources`, `/traces`, `/settings`.

Other states like table sorting status are just cached in the Redux store (or just ephemeral on the components).

### Async UX

* Every list view: `Skeleton` → Empty (illustration + refresh button) → Error (`Alert`)
* Global `showToast` via Mantine `notifications.show()` or `showNotification`

### Right drawer pattern

Single `Drawer` component that is controlled by Redux state. Content swappable by drawer type.

### Code/JSON

* `@mantine/code-highlight` for pretty JSON blocks
* `JsonInput` for editable JSON only in **Settings** (not for data returned by APIs)

## Data Model

```ts
export type RolloutStatus = 'queuing'|'preparing'|'running'|'failed'|'succeeded'|'cancelled'|'requeuing';

export type AttemptStatus = 'preparing'|'running'|'failed'|'succeeded'|'unresponsive'|'timeout';

export type RolloutMode = 'train'|'val'|'test';

export type TaskInput = any;

// Rollouts and Attempts
export type Rollout = {
  rollout_id: string;
  input: TaskInput;
  status: RolloutStatus;
  mode: RolloutMode;
  resources_id: string | null;
  start_time: string; // ISO
  end_time?: string | null; // ISO

  // optional, fetched lazily when row expands
  // by default, only the latest attempt is fetched
  attempts?: Attempt[];

  // raw payload shown in drawer
  config: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type Attempt = {
  rollout_id: string;
  attempt_id: string;
  sequence_id: number; // strictly increasing per rollout
  status: AttemptStatus;
  start_time: string; // ISO
  end_time?: string | null; // ISO
  worker_id?: string | null;
  // raw payload shown in drawer
  metadata?: Record<string, unknown>;
};

// Resources
export type Resources = {
  resources_id: string;
  named_resources: Record<string, unknown>;

};

// Traces
export type TraceSpan = {
  rollout_id: string;
  attempt_id: string;
  sequence_id: number;
  trace_id: string;
  span_id: string;
  parent_id?: string | null;
  name: string;
  status: { status_code: 'UNSET'|'OK'|'ERROR'; description?: string };
  attributes: Record<string, unknown>;
  start_time: string | null; // ISO
  end_time: string | null; // ISO
  // There could be more fields, they can be shown in the "raw" content drawer
};

// Server connection
export type ServerConfig = {
  baseUrl: string; // e.g. http://localhost:8000
  autoRefreshMs: number; // polling/refresh interval
};
```

## API Contracts (FastAPI)

The following APIs are implemented in the Python backend.

### Health

* **GET `/health`** — Simple health check endpoint to confirm the server is alive.

### Queue Management

* **POST `/queues/rollouts/enqueue`** — Add a new rollout to the queue (`status="queuing"`), no attempt created yet.
* **POST `/queues/rollouts/dequeue`** — Claim the oldest queued rollout; transitions to `preparing` and creates a new attempt.

### Rollouts

* **POST `/rollouts`** — Start a new rollout immediately and create its first attempt (`status="preparing"`).
* **GET `/rollouts`** — List all rollouts.
* **POST `/rollouts/search`** — Search rollouts by `status` or specific rollout IDs. Expects a JSON body like `{"status": ["succeeded", "failed"]}`.
* **GET `/rollouts/{rollout_id}`** — Retrieve a rollout by its ID. Returns `null` if not found.
* **POST `/rollouts/{rollout_id}`** — Update rollout metadata or status (can move it to terminal or queued states).

### Attempts

* **GET `/rollouts/{rollout_id}/attempts`** — List all attempts for a given rollout (ordered oldest → newest).
* **GET `/rollouts/{rollout_id}/attempts/latest`** — Get the most recent attempt for a rollout. Returns `null` if not found.
* **POST `/rollouts/{rollout_id}/attempts`** — Manually create a new retry attempt.
* **POST `/rollouts/{rollout_id}/attempts/{attempt_id}`** — Update attempt state, worker ID, heartbeat time, or metadata.

### Resources

* **POST `/resources`** — Create a new immutable resource snapshot and mark it as the latest version.
* **POST `/resources/{resources_id}`** — Update an existing resource snapshot and mark it as latest.
* **GET `/resources/{resources_id}`** — Fetch a resource snapshot by ID.
* **GET `/resources/latest`** — Retrieve the most recent (default) resource snapshot.

### Spans & Telemetry

* **POST `/spans`** — Record a telemetry span from a rollout attempt; also updates heartbeat and state.
* **GET `/spans`** — Query stored spans by rollout (and optionally attempt). Accepts GET params like `?rollout_id=...&attempt_id=...`. Currently `rollout_id` is required.
* **POST `/spans/next`** — Get the next sequential ID for span ordering.

### Wait / Synchronization

* **POST `/waits/rollouts`** — Wait until one or more rollouts finish (`succeeded`, `failed`, or `cancelled`), or timeout expires.
