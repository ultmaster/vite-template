import type { Meta, StoryObj } from '@storybook/react';
import { Provider } from 'react-redux';
import { http, HttpResponse, delay } from 'msw';
import { RolloutsPage } from './Rollouts.page';
import { createAppStore } from '../store';
import { initialConfigState } from '../features/config/slice';
import { initialRolloutsUiState } from '../features/rollouts/slice';
import type { Attempt, Rollout } from '../features/rollouts';

const meta: Meta<typeof RolloutsPage> = {
  title: 'Pages/RolloutsPage',
  component: RolloutsPage,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof RolloutsPage>;

const now = Math.floor(Date.now() / 1000);

const sampleRollouts: Rollout[] = [
  {
    rollout_id: 'ro-7fa3b6e2',
    input: { task: 'Summarize report' },
    status: 'running',
    mode: 'train',
    resources_id: 'rs-100',
    start_time: now - 1200,
    end_time: null,
    attempt: {
      rollout_id: 'ro-7fa3b6e2',
      attempt_id: 'at-9001',
      sequence_id: 1,
      status: 'running',
      start_time: now - 1200,
      end_time: null,
      worker_id: 'worker-alpha',
      metadata: { lastHeartbeatAt: now - 30 },
    },
    config: { retries: 0 },
    metadata: { owner: 'alice' },
  },
  {
    rollout_id: 'ro-116eab45',
    input: { task: 'Classify dataset' },
    status: 'succeeded',
    mode: 'val',
    resources_id: 'rs-101',
    start_time: now - 5400,
    end_time: now - 3600,
    attempt: {
      rollout_id: 'ro-116eab45',
      attempt_id: 'at-9002',
      sequence_id: 2,
      status: 'succeeded',
      start_time: now - 4000,
      end_time: now - 3600,
      worker_id: 'worker-beta',
      metadata: { lastHeartbeatAt: now - 3600 },
    },
    config: { retries: 1 },
    metadata: { owner: 'bob' },
  },
  {
    rollout_id: 'ro-9ae77c11',
    input: { task: 'Evaluate prompt variations' },
    status: 'failed',
    mode: 'test',
    resources_id: 'rs-102',
    start_time: now - 9600,
    end_time: now - 8400,
    attempt: {
      rollout_id: 'ro-9ae77c11',
      attempt_id: 'at-9005',
      sequence_id: 3,
      status: 'failed',
      start_time: now - 8800,
      end_time: now - 8400,
      worker_id: 'worker-gamma',
      metadata: { lastHeartbeatAt: now - 8400 },
    },
    config: { retries: 2 },
    metadata: { owner: 'carol' },
  },
];

const attemptsByRollout: Record<string, Attempt[]> = {
  'ro-7fa3b6e2': [
    {
      rollout_id: 'ro-7fa3b6e2',
      attempt_id: 'at-9001',
      sequence_id: 1,
      status: 'running',
      start_time: now - 1200,
      end_time: null,
      worker_id: 'worker-alpha',
      metadata: { lastHeartbeatAt: now - 30 },
    },
  ],
  'ro-116eab45': [
    {
      rollout_id: 'ro-116eab45',
      attempt_id: 'at-9000',
      sequence_id: 1,
      status: 'failed',
      start_time: now - 5400,
      end_time: now - 5000,
      worker_id: 'worker-beta',
      metadata: { lastHeartbeatAt: now - 5000 },
    },
    {
      rollout_id: 'ro-116eab45',
      attempt_id: 'at-9002',
      sequence_id: 2,
      status: 'succeeded',
      start_time: now - 4000,
      end_time: now - 3600,
      worker_id: 'worker-beta',
      metadata: { lastHeartbeatAt: now - 3600 },
    },
  ],
  'ro-9ae77c11': [
    {
      rollout_id: 'ro-9ae77c11',
      attempt_id: 'at-9003',
      sequence_id: 1,
      status: 'preparing',
      start_time: now - 9600,
      end_time: now - 9300,
      worker_id: 'worker-gamma',
      metadata: { lastHeartbeatAt: now - 9300 },
    },
    {
      rollout_id: 'ro-9ae77c11',
      attempt_id: 'at-9004',
      sequence_id: 2,
      status: 'running',
      start_time: now - 9200,
      end_time: now - 8800,
      worker_id: 'worker-delta',
      metadata: { lastHeartbeatAt: now - 8800 },
    },
    {
      rollout_id: 'ro-9ae77c11',
      attempt_id: 'at-9005',
      sequence_id: 3,
      status: 'failed',
      start_time: now - 8800,
      end_time: now - 8400,
      worker_id: 'worker-gamma',
      metadata: { lastHeartbeatAt: now - 8400 },
    },
  ],
};

function renderWithStore() {
  const store = createAppStore({
    config: {
      ...initialConfigState,
      autoRefreshMs: 0,
    },
    rollouts: initialRolloutsUiState,
  });

  return (
    <Provider store={store}>
      <RolloutsPage />
    </Provider>
  );
}

const defaultHandlers = [
  http.get('*/rollouts', () => HttpResponse.json(sampleRollouts)),
  http.get('*/rollouts/:rolloutId/attempts', ({ params }) => {
    const rolloutId = params.rolloutId as string;
    return HttpResponse.json(attemptsByRollout[rolloutId] ?? []);
  }),
];

export const Default: Story = {
  render: () => renderWithStore(),
  parameters: {
    msw: {
      handlers: defaultHandlers,
    },
  },
};

export const EmptyState: Story = {
  render: () => renderWithStore(),
  parameters: {
    msw: {
      handlers: [
        http.get('*/rollouts', () => HttpResponse.json([])),
        http.get('*/rollouts/:rolloutId/attempts', () => HttpResponse.json([])),
      ],
    },
  },
};

export const ServerError: Story = {
  render: () => renderWithStore(),
  parameters: {
    msw: {
      handlers: [
        http.get('*/rollouts', () => HttpResponse.json({ detail: 'Internal error' }, { status: 500 })),
        http.get('*/rollouts/:rolloutId/attempts', () => HttpResponse.json([], { status: 200 })),
      ],
    },
  },
};

export const Loading: Story = {
  render: () => renderWithStore(),
  parameters: {
    msw: {
      handlers: [
        http.get('*/rollouts', async () => {
          await delay('infinite');
          return HttpResponse.json([]);
        }),
        http.get('*/rollouts/:rolloutId/attempts', async () => {
          await delay('infinite');
          return HttpResponse.json([]);
        }),
      ],
    },
  },
};
