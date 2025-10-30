export type RolloutStatus =
  | 'queuing'
  | 'preparing'
  | 'running'
  | 'failed'
  | 'succeeded'
  | 'cancelled'
  | 'requeuing';

export type AttemptStatus = 'preparing' | 'running' | 'failed' | 'succeeded' | 'unresponsive' | 'timeout';

export type RolloutMode = 'train' | 'val' | 'test';

export type TaskInput = unknown;

export type Timestamp = number | null | undefined;

export type AttemptMetadata = Record<string, unknown> & {
  last_heartbeat_time?: number | null;
  lastHeartbeatTime?: number | null;
  last_heartbeat_at?: number | null;
  lastHeartbeatAt?: number | null;
};

export type Attempt = {
  rollout_id: string;
  attempt_id: string;
  sequence_id: number;
  status: AttemptStatus;
  start_time: Timestamp;
  end_time?: Timestamp;
  worker_id?: string | null;
  metadata?: AttemptMetadata;
};

export type Rollout = {
  rollout_id: string;
  input: TaskInput;
  status: RolloutStatus;
  mode: RolloutMode;
  resources_id: string | null;
  start_time: Timestamp;
  end_time?: Timestamp;
  attempt?: Attempt;
  config: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type RolloutListItem = Rollout;

export type ThemePreference = 'light' | 'dark' | 'system';

export type ConfigState = {
  baseUrl: string;
  autoRefreshMs: number;
  theme: ThemePreference;
};