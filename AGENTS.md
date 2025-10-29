# Agent-lightning Dashboard — Detailed Design Spec

Tech stack: **React + Mantine UI**, **Redux Toolkit**, **React Router**, **Storybook**. Backend: **FastAPI (uvicorn)**.

## 1. Information Architecture & Routing

**Base layout:**
- Left Sidebar (persistent):
  - Title: `[Icon] Agent-lightning Dashboard`
  - Menu: **Rollouts**, **Resources**, **Traces**, **Settings**
  - Bottom footer: connection indicator: `Connected to http://localhost:xxxx/` (dynamic; server may be self or remote)
- Content area (router outlet)

**Routes**
- `/rollouts`
- `/resources`
- `/traces`
- `/settings`
- Fallback: `/* → /rollouts`

**URL query params (deep-linkable)**
- `/rollouts?search=&status=&mode=&resources=&page=1&pageSize=50&sort=-start_time`
- `/resources?page=1&pageSize=50`
- `/traces?rollout_id=&attempt_id=&view=waterfall|list`
- `/settings` (no params)

**Empty, loading, error states**
- Each page shows: Skeleton loaders → Empty state (illustration + CTA to refresh) → Error state (Retry, copyable error id).
- Global toast system for transient errors.

## Visual System (Mantine)

- **Theme:** Light/dark support; primary color neutral (black/white), accent color `#c45259`.
- **Core components used:**
  - `AppShell`, `Navbar`, `Header`, `Group`, `Stack`, `ActionIcon`, `Button`, `Anchor`, `Badge`, `Table`, `Pagination`,
    `ScrollArea`, `Code`, `Drawer`, `Modal`, `Tooltip`, `CopyButton`, `JsonInput` (for editable JSON in Settings), `Skeleton`, `Loader`, `Alert`, `SegmentedControl`, `Select`, `MultiSelect`, `Checkbox`, `Text`, `Title`, `TextInput`, `Kbd`.
- **Right drawer pattern** for detail dialogs (Rollout/Attempt details; Resource details; Span details).
- **Syntax highlight:** `@mantine/code-highlight` for JSON.

## Data Model


RolloutStatus = Literal[
    "queuing",  # initial status
    "preparing",  # after the trace is claimed
    "running",  # after receiving the first trace
    "failed",  # crashed
    "succeeded",  # status OK
    "cancelled",  # cancelled by user (or watchdog)
    "requeuing",  # retrying
]
"""The status of a rollout."""

AttemptStatus = Literal[
    # A status is essentially a process.
    # It should not have scheduling/management statuses like "queuing" or "cancelled".
    "preparing",
    "running",
    "failed",
    "succeeded",
    "unresponsive",  # the worker has not reported results for a while
    "timeout",  # the worker has been emitting new logs, but have been working on the task for too long
]
"""The status of an attempt."""

RolloutMode = Literal["train", "val", "test"]
"""Possible rollout modes."""


class Attempt(BaseModel):
    """Execution attempt for a rollout, including metadata for retries."""

    rollout_id: str
    """The rollout which this attempt belongs to."""
    attempt_id: str
    """The universal id for current attempt."""
    sequence_id: int
    """The sequence number of the attempt, starting from 1."""
    start_time: float
    """The time when the attempt has started."""
    end_time: Optional[float] = None
    """The time when the attempt has ended."""
    status: AttemptStatus = "preparing"
    """The status of the attempt."""
    worker_id: Optional[str] = None
    """The rollout worker which is executing this attempt."""

    last_heartbeat_time: Optional[float] = None
    """The last time when the worker has reported progress (i.e., a span)."""

    metadata: Optional[Dict[str, Any]] = None
    """A bucket for any other relevant information."""


class RolloutConfig(BaseModel):
    """Configuration controlling rollout retries and timeouts."""

    timeout_seconds: Optional[float] = None
    """The timeout for the rollout, in seconds. None indicates no timeout."""
    unresponsive_seconds: Optional[float] = None
    """The unresponsive timeout for the rollout, in seconds. None indicates no unresponsive timeout."""
    max_attempts: int = Field(default=1, ge=1)
    """The maximum number of attempts for the rollout, including the first attempt."""
    retry_condition: List[AttemptStatus] = Field(default_factory=cast(Callable[[], List[AttemptStatus]], list))
    """The list of statuses that should trigger a retry."""


class Rollout(BaseModel):
    rollout_id: str
    """Unique identifier for the rollout."""

    input: TaskInput
    """Task input used to generate the rollout."""

    # Time to track the lifecycle of the rollout
    start_time: float
    """Timestamp when the rollout started."""
    end_time: Optional[float] = None
    """Timestamp when the rollout ended."""

    mode: Optional[RolloutMode] = None
    """Execution mode such as `"train"`, `"val"` or `"test"`. See [`RolloutMode`][agentlightning.RolloutMode]."""
    resources_id: Optional[str] = None
    """Identifier of the resources required to execute the rollout."""

    status: RolloutStatus = "queuing"
    """Latest status emitted by the controller."""

    config: RolloutConfig = Field(default_factory=RolloutConfig)
    """Retry and timeout configuration associated with the rollout."""

    metadata: Optional[Dict[str, Any]] = None
    """Additional metadata attached to the rollout."""


class AttemptedRollout(Rollout):
    """Rollout paired with the currently active attempt."""

    attempt: Attempt
    """The attempt that is currently processing the rollout."""

    @model_validator(mode="after")
    def check_consistency(self) -> AttemptedRollout:
        if self.attempt.rollout_id != self.rollout_id:
            raise ValueError("Inconsistent rollout_id between Rollout and Attempt")
        return self


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

## 5) Redux State & Slices

**Slices**
- `configSlice`
  - State: `{ baseUrl: string, autoRefreshMs: number, connected: boolean, lastChecked?: string, error?: string }`
  - Actions: `setBaseUrl`, `setAutoRefresh`, `setConnected`, `pingServer` (thunk)
- `rolloutsSlice`
  - State: `{ list: QueryState<RolloutSummary>, byId: EntityState<Rollout>, expanded: Record<string, boolean> }`
  - Thunks: `fetchRollouts`, `fetchRolloutById`, `fetchAttempts(rollout_id)`
- `resourcesSlice`
  - State: `{ list: QueryState<ResourceRecord>, byId: EntityState<ResourceRecord> }`
  - Thunks: `fetchResources`, `fetchResourceById`
- `tracesSlice`
  - State: `{ params: { rollout_id?: string; attempt_id?: string; view: 'list'|'waterfall' }, list: QueryState<TraceSpan>, waterfall: { spans: TraceSpan[]; colorMap: Record<string,string> } }`
  - Thunks: `fetchTraceList`, `fetchTraceWaterfall`

**Shared types**
```ts
export type QueryState<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  sort: string; // e.g. -start_time
  filters: Record<string, string | string[]>;
  loading: boolean;
  error?: string;
};
```

**URL sync**
- On location change, selectors hydrate `QueryState` from search params; dispatch fetch actions.
- On table interaction (sort/paginate/expand), update URL via `navigate()` to ensure deep-linking.

---

## 6) Components (Mantine-oriented)

### 6.1 Shell
- `Sidebar` (Navbar): menu items; active route highlight; bottom `ConnectionBadge` (green/amber/red with tooltip: baseUrl, last ping, ping latency)
- `TopBar`: title, global search input (rollout id), theme toggle

### 6.2 Data Table (shared)
- Props: `columns`, `rows`, `loading`, `empty`, `onSort`, `sort`, `page`, `pageSize`, `onPageChange`, `onPageSizeChange`, `renderExpandedRow?`, `getRowKey`, `rowActions?`
- Implementation: `Table` + `ScrollArea` + sticky header; uses `Loader` overlay while `loading`.
- Supports keyboard nav and a11y (row buttons reachable via Tab).

### 6.3 Right Drawer (shared)
- `DetailDrawer`
  - Props: `opened`, `title`, `subtitle?`, `onClose`, `children`, `primaryAction?`, `width='lg'`

### 6.4 JSON Code Block
- `JsonViewer`
  - Props: `data`, `collapsedDepth=1`, `copyButton=true`
  - Uses `CodeHighlight` with `language="json"`; pretty-prints with 2 spaces.

### 6.5 Rollouts Page Components
- `RolloutsTable`
  - Columns:
    - **rollout_id** (monospace, copy button)
    - **attempt.attempt_id** (if expanded row): `${attempt_id} (#${sequence_id})`
    - **mode** (Badge)
    - **resources_id** (Anchor → `/resources?select={id}`)
    - **status**: logic
      - Expanded row: show **attempt.status** only
      - Collapsed row: show **rollout.status**; if rollout.status ≠ latestAttempt.status → show `${rollout.status} – ${attempt.status}` (two badges)
    - **start_time** (prefer attempt.start_time if exists)
    - **end_time**
    - **last_heartbeat**
    - **worker_id**
    - **Actions**: `Show raw` (opens drawer with rollout + attempts JSON), `View traces` (navigates `/traces?rollout_id={}&attempt_id={latest}`)
  - Row expansion:
    - Click caret → loads attempts lazily (spinner within row) and renders nested `DataTable` of attempts.
    - Nested columns mirror main but scoped to Attempt.
  - Default sort: `-start_time` (descending)

- `RolloutDetailDrawer`
  - Header: `Rollout` | subheading: **rollout_id** (copy) + **start_time** (human + ISO tooltip)
  - Body tabs: **Summary**, **Attempts**, **Raw JSON**

### 6.6 Resources Page Components
- `ResourcesTable`
  - Columns: `resources_id`, `named_resources` (show first 1–2 top-level keys as preview chips)
  - Row click → `ResourceDetailDrawer`
- `ResourceDetailDrawer`
  - Title: `Resources` | sub: **resources_id**
  - Body: `JsonViewer` with indented `named_resources`

### 6.7 Traces Page Components
- Header controls (sticky):
  - `Select rollout_id` (searchable; loads from `/rollouts` by id)
  - `Select attempt_id` (auto-filled with latest for selected rollout; label shows `#sequence_id`)
  - `SegmentedControl` view: **Waterfall** | **List**

#### Waterfall view
- `TraceWaterfall` (Gantt-like)
  - Layout: left rail shows span `name` (ellipsis), main area: time-axis in ms/s; blocks from `start_time` to `end_time`.
  - Color: deterministic by span `name`; fallback default when palette exhausted.
  - Click a block → `SpanDetailDrawer` with tabs: **Overview** (times, status, hierarchy), **Attributes** (key–value table), **Raw** JSON.
  - Zoom & pan: wheel to zoom time scale; drag to pan. `Reset zoom` button.
  - Time markers: show min/max, vertical line on hover with tooltip delta.

#### List view
- `TracesTable` columns:
  - `trace_id`
  - `span_id`
  - `parent_id` (clickable if present in table; red `Badge` if parent not found in current page)
  - `name`
  - `status.status_code` (Badge color: OK=green, ERROR=red, UNSET=gray)
  - `attribute_keys` (comma-separated or chips)
  - `start_time`, `end_time`
  - `Actions`: `Show rollout` (navigates to `/rollouts?select={rollout_id}`), `Span detail` (opens drawer)
- Sort default: `-sequence_id,-start_time,-end_time`

### 6.8 Settings Page Components
- `Auto refresh interval` (Number input in ms with helper presets: 0, 5s, 15s, 60s)
- `Backend address` (Text input, validate URL; Save → ping; persisted to `localStorage` and Redux)
- `Test connection` button; badge shows current health.

---

## 7) Interaction Logic & Edge Cases

- **Rollout with no attempts**: still listed; `attempt_id` column shows `—`; status shows `rollout.status` only.
- **Disagreeing statuses** (collapsed): show both badges `rollout.status – attempt.status`.
- **Expanded rows**: status becomes `attempt.status` only in child rows.
- **Latest attempt resolution**: choose max `sequence_id`.
- **Dates**: always ISO in tooltip; relative (e.g., `5m ago`) in cell; respect user timezone.
- **Large data**: virtualize rows when `pageSize > 100` using `@tanstack/react-virtual` (optional enhancement).
- **Auto-refresh**: Poll list endpoints with `autoRefreshMs`; pause on hidden tab; resume on focus.
- **Stale requests**: Cancel in-flight queries on param change (AbortController) to avoid race conditions.
- **Access from external server**: CORS enabled; baseUrl editable in Settings; display hostname in footer.

---

## 8) Color & Status Mapping

- Status → Badge color
  - `queued` gray, `running` blue, `succeeded` green, `failed` red, `canceled` yellow.
- Span name → color
  - Deterministic hash → palette index (`Mantine theme.colors` cycle). Fallback neutral.

---

## 9) Directory Structure (frontend)

```
src/
  app/
    store.ts
    routes.tsx
    theme.ts
  components/
    DataTable/
    DetailDrawer/
    JsonViewer/
    ConnectionBadge/
  features/
    rollouts/
      RolloutsPage.tsx
      RolloutsTable.tsx
      rolloutsSlice.ts
      api.ts
    resources/
      ResourcesPage.tsx
      ResourcesTable.tsx
      resourcesSlice.ts
      api.ts
    traces/
      TracesPage.tsx
      TraceWaterfall.tsx
      TracesTable.tsx
      tracesSlice.ts
      api.ts
    settings/
      SettingsPage.tsx
      settingsSlice.ts
  pages/
    Layout.tsx
  utils/
    time.ts
    color.ts
    http.ts
```

---

## 10) Example UI Logic (pseudocode)

**Rollouts status cell (collapsed):**
```tsx
function StatusCell({ rollout, latestAttempt }) {
  if (!latestAttempt || rollout.status === latestAttempt.status) {
    return <Badge color={mapStatus(rollout.status)}>{rollout.status}</Badge>;
  }
  return (
    <Group gap="xs">
      <Badge color={mapStatus(rollout.status)}>{rollout.status}</Badge>
      <Text size="xs">–</Text>
      <Badge color={mapStatus(latestAttempt.status)}>{latestAttempt.status}</Badge>
    </Group>
  );
}
```

**Preferred start_time:**
```ts
const start = attempt?.start_time ?? rollout.start_time;
```

**Waterfall layout:**
```ts
const t0 = Math.min(...spans.map(s => Date.parse(s.start_time)));
const t1 = Math.max(...spans.map(s => Date.parse(s.end_time)));
const scale = (t: number) => ((t - t0) / (t1 - t0)) * containerWidth;
```

---

## 11) FastAPI Sketch

```py
from fastapi import FastAPI, Query, HTTPException
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="Agent-lightning API", version="1.0")

class Attempt(BaseModel):
    attempt_id: str
    sequence_id: int
    status: str
    start_time: str
    end_time: Optional[str] = None
    last_heartbeat: Optional[str] = None
    worker_id: Optional[str] = None
    extra: Optional[dict] = None

class Rollout(BaseModel):
    rollout_id: str
    status: str
    mode: str
    resources_id: Optional[str]
    start_time: str
    end_time: Optional[str] = None
    last_heartbeat: Optional[str] = None
    worker_id: Optional[str] = None

class ResourceRecord(BaseModel):
    resources_id: str
    named_resources: dict
    created_at: Optional[str] = None

@app.get('/api/v1/health')
async def health():
    return {"ok": True, "server_time": datetime.utcnow().isoformat()}

# Add rollouts/resources/traces routers similarly...
```

**Performance notes (backend):**
- Paginate at DB level; indexes: `rollouts.start_time DESC`, `attempts.rollout_id, sequence_id DESC`, `spans (rollout_id, attempt_id, sequence_id)`.
- Stream large JSON with `orjson` and `ORJSONResponse`.

## Testing

###  Storybook Coverage

- `DataTable` — default, loading, empty, error, with expanded rows
- `DetailDrawer` — varied widths, long titles, copy button
- `JsonViewer` — large payload, collapsed depth
- Pages (storybook `@storybook/addon-router`):
  - RolloutsTable with mock rows (with/without attempts; disagreeing statuses)
  - ResourcesTable with named_resources preview
  - Traces: Waterfall (dense spans, zoom), List (missing parent badge)
- `ConnectionBadge` — connected/connecting/disconnected
- Theming — light/dark

Mocking via **MSW** scenarios: healthy server, stale responses, 500s, empty datasets, large datasets (1k+ items).

### Other Testing Notes

**Unit** (Vitest + RTL)
- Reducers/selectors: initialization, pagination, sorting, filters
- Utilities: time formatting, color hashing

**Integration and E2E** (Storyboard)
- Rollouts: expand row triggers attempts fetch; status disagreement rendering; large table scrolling & pagination
- Stale requests: late response ignored after param change
- Traces: default latest attempt selected; parent_id link highlighting (present vs missing)
- Auto-refresh pause/resume on tab visibility
- Settings persistence and health check
