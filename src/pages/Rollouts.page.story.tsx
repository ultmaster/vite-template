import type { Meta, StoryObj } from '@storybook/react';
import userEvent from '@testing-library/user-event';
import { within } from '@testing-library/dom';
import { Provider } from 'react-redux';
import { http, HttpResponse, delay } from 'msw';
import { RolloutsPage } from './Rollouts.page';
import { createAppStore } from '../store';
import { initialConfigState } from '../features/config/slice';
import { initialRolloutsUiState, type RolloutsUiState } from '../features/rollouts/slice';
import type { Attempt, Rollout } from '../features/rollouts';
import { snakeCaseKeys } from '@/utils/format';

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
    rolloutId: 'ro-7fa3b6e2',
    input: { task: 'Summarize report' },
    status: 'running',
    mode: 'train',
    resourcesId: 'rs-100',
    startTime: now - 1200,
    endTime: null,
    attempt: {
      rolloutId: 'ro-7fa3b6e2',
      attemptId: 'at-9001',
      sequenceId: 1,
      status: 'running',
      startTime: now - 1200,
      endTime: null,
      workerId: 'worker-alpha',
      lastHeartbeatTime: now - 30,
      metadata: { lastHeartbeatAt: now - 30 },
    },
    config: { retries: 0 },
    metadata: { owner: 'alice' },
  },
  {
    rolloutId: 'ro-116eab45',
    input: { task: 'Classify dataset' },
    status: 'succeeded',
    mode: 'val',
    resourcesId: 'rs-101',
    startTime: now - 5400,
    endTime: now - 3600,
    attempt: {
      rolloutId: 'ro-116eab45',
      attemptId: 'at-9002',
      sequenceId: 2,
      status: 'succeeded',
      startTime: now - 4000,
      endTime: now - 3600,
      workerId: 'worker-beta',
      lastHeartbeatTime: now - 3600,
      metadata: { lastHeartbeatAt: now - 3600 },
    },
    config: { retries: 1 },
    metadata: { owner: 'bob' },
  },
  {
    rolloutId: 'ro-9ae77c11',
    input: { task: 'Evaluate prompt variations' },
    status: 'failed',
    mode: 'test',
    resourcesId: 'rs-102',
    startTime: now - 9600,
    endTime: now - 8400,
    attempt: {
      rolloutId: 'ro-9ae77c11',
      attemptId: 'at-9005',
      sequenceId: 3,
      status: 'failed',
      startTime: now - 8800,
      endTime: now - 8400,
      workerId: 'worker-gamma',
      lastHeartbeatTime: now - 8400,
      metadata: { lastHeartbeatAt: now - 8400 },
    },
    config: { retries: 2 },
    metadata: { owner: 'carol' },
  },
];

const attemptsByRollout: Record<string, Attempt[]> = {
  'ro-7fa3b6e2': [
    {
      rolloutId: 'ro-7fa3b6e2',
      attemptId: 'at-9001',
      sequenceId: 1,
      status: 'running',
      startTime: now - 1200,
      endTime: null,
      workerId: 'worker-alpha',
      lastHeartbeatTime: now - 30,
      metadata: { lastHeartbeatAt: now - 30 },
    },
  ],
  'ro-116eab45': [
    {
      rolloutId: 'ro-116eab45',
      attemptId: 'at-9000',
      sequenceId: 1,
      status: 'failed',
      startTime: now - 5400,
      endTime: now - 5000,
      workerId: 'worker-beta',
      lastHeartbeatTime: now - 5000,
      metadata: { lastHeartbeatAt: now - 5000 },
    },
    {
      rolloutId: 'ro-116eab45',
      attemptId: 'at-9002',
      sequenceId: 2,
      status: 'succeeded',
      startTime: now - 4000,
      endTime: now - 3600,
      workerId: 'worker-beta',
      lastHeartbeatTime: now - 3600,
      metadata: { lastHeartbeatAt: now - 3600 },
    },
  ],
  'ro-9ae77c11': [
    {
      rolloutId: 'ro-9ae77c11',
      attemptId: 'at-9003',
      sequenceId: 1,
      status: 'preparing',
      startTime: now - 9600,
      endTime: now - 9300,
      workerId: 'worker-gamma',
      lastHeartbeatTime: now - 9300,
      metadata: { lastHeartbeatAt: now - 9300 },
    },
    {
      rolloutId: 'ro-9ae77c11',
      attemptId: 'at-9004',
      sequenceId: 2,
      status: 'running',
      startTime: now - 9200,
      endTime: now - 8800,
      workerId: 'worker-delta',
      lastHeartbeatTime: now - 8800,
      metadata: { lastHeartbeatAt: now - 8800 },
    },
    {
      rolloutId: 'ro-9ae77c11',
      attemptId: 'at-9005',
      sequenceId: 3,
      status: 'failed',
      startTime: now - 8800,
      endTime: now - 8400,
      workerId: 'worker-gamma',
      lastHeartbeatTime: now - 8400,
      metadata: { lastHeartbeatAt: now - 8400 },
    },
  ],
};

const longDurationRollouts: Rollout[] = [
  {
    rolloutId: 'ro-long-duration',
    input: { task: 'Long running training' },
    status: 'running',
    mode: 'train',
    resourcesId: 'rs-200',
    startTime: now - 7 * 24 * 3600,
    endTime: null,
    attempt: {
      rolloutId: 'ro-long-duration',
      attemptId: 'at-long-001',
      sequenceId: 1,
      status: 'running',
      startTime: now - 7 * 24 * 3600,
      endTime: null,
      workerId: 'worker-long',
      lastHeartbeatTime: now - 45,
      metadata: null,
    },
    config: { retries: 0 },
    metadata: { owner: 'delta' },
  },
];

const longDurationAttempts: Record<string, Attempt[]> = {
  'ro-long-duration': [
    {
      rolloutId: 'ro-long-duration',
      attemptId: 'at-long-001',
      sequenceId: 1,
      status: 'running',
      startTime: now - 7 * 24 * 3600,
      endTime: null,
      workerId: 'worker-long',
      lastHeartbeatTime: now - 45,
      metadata: null,
    },
  ],
};

const staleHeartbeatRollouts: Rollout[] = [
  {
    rolloutId: 'ro-stale-heartbeat',
    input: { task: 'Investigate stale worker' },
    status: 'running',
    mode: 'test',
    resourcesId: 'rs-201',
    startTime: now - 6 * 3600,
    endTime: null,
    attempt: {
      rolloutId: 'ro-stale-heartbeat',
      attemptId: 'at-stale-001',
      sequenceId: 1,
      status: 'running',
      startTime: now - 6 * 3600,
      endTime: null,
      workerId: 'worker-stale',
      lastHeartbeatTime: now - 3 * 24 * 3600,
      metadata: null,
    },
    config: { retries: 0 },
    metadata: { owner: 'echo' },
  },
];

const staleHeartbeatAttempts: Record<string, Attempt[]> = {
  'ro-stale-heartbeat': [
    {
      rolloutId: 'ro-stale-heartbeat',
      attemptId: 'at-stale-001',
      sequenceId: 1,
      status: 'running',
      startTime: now - 6 * 3600,
      endTime: null,
      workerId: 'worker-stale',
      lastHeartbeatTime: now - 3 * 24 * 3600,
      metadata: null,
    },
  ],
};

const statusMismatchRollouts: Rollout[] = [
  {
    rolloutId: 'ro-status-mismatch',
    input: { task: 'Edge case validation' },
    status: 'running',
    mode: 'val',
    resourcesId: null,
    startTime: now - 3600,
    endTime: now - 1800,
    attempt: {
      rolloutId: 'ro-status-mismatch',
      attemptId: 'at-mismatch-003',
      sequenceId: 3,
      status: 'failed',
      startTime: now - 4200,
      endTime: now - 1800,
      workerId: 'worker-mismatch',
      lastHeartbeatTime: now - 1700,
      metadata: null,
    },
    config: { retries: 3 },
    metadata: { owner: 'foxtrot' },
  },
];

const statusMismatchAttempts: Record<string, Attempt[]> = {
  'ro-status-mismatch': [
    {
      rolloutId: 'ro-status-mismatch',
      attemptId: 'at-mismatch-001',
      sequenceId: 1,
      status: 'preparing',
      startTime: now - 5400,
      endTime: now - 5000,
      workerId: 'worker-mismatch',
      lastHeartbeatTime: now - 5000,
      metadata: null,
    },
    {
      rolloutId: 'ro-status-mismatch',
      attemptId: 'at-mismatch-002',
      sequenceId: 2,
      status: 'running',
      startTime: now - 5000,
      endTime: now - 4200,
      workerId: 'worker-mismatch',
      lastHeartbeatTime: now - 4000,
      metadata: null,
    },
    {
      rolloutId: 'ro-status-mismatch',
      attemptId: 'at-mismatch-003',
      sequenceId: 3,
      status: 'failed',
      startTime: now - 4200,
      endTime: now - 1800,
      workerId: 'worker-mismatch',
      lastHeartbeatTime: now - 1700,
      metadata: null,
    },
  ],
};

const veryLongInput = `{"prompt":"${'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(12)}"}`;

const longInputRollouts: Rollout[] = [
  {
    rolloutId: 'ro-long-input',
    input: veryLongInput,
    status: 'queuing',
    mode: 'test',
    resourcesId: 'rs-300',
    startTime: now - 120,
    endTime: null,
    attempt: null,
    config: { retries: 0 },
    metadata: { owner: 'golf' },
  },
];

const longInputAttempts: Record<string, Attempt[]> = {
  'ro-long-input': [],
};

const paginationRollouts: Rollout[] = Array.from({ length: 120 }, (_item, index) => {
  const startOffset = index * 90;
  const rolloutId = `ro-page-${index + 1}`;

  return {
    rolloutId,
    input: { item: index + 1 },
    status: index % 3 === 0 ? 'running' : index % 3 === 1 ? 'failed' : 'succeeded',
    mode: index % 2 === 0 ? 'train' : 'test',
    resourcesId: index % 5 === 0 ? `rs-${100 + index}` : null,
    startTime: now - startOffset - 300,
    endTime: index % 3 === 0 ? null : now - startOffset,
    attempt: {
      rolloutId,
      attemptId: `at-page-${index + 1}`,
      sequenceId: 1,
      status: index % 3 === 0 ? 'running' : index % 3 === 1 ? 'failed' : 'succeeded',
      startTime: now - startOffset - 300,
      endTime: index % 3 === 0 ? null : now - startOffset,
      workerId: `worker-${(index % 7) + 1}`,
      lastHeartbeatTime: index % 3 === 0 ? now - startOffset - 60 : now - startOffset,
      metadata: null,
    },
    config: {},
    metadata: null,
  };
});

const paginationAttempts: Record<string, Attempt[]> = Object.fromEntries(
  paginationRollouts.map((rollout) => [
    rollout.rolloutId,
    rollout.attempt ? [rollout.attempt] : [],
  ]),
);

const autoExpandRollouts: Rollout[] = [
  {
    rolloutId: 'ro-auto-expand',
    input: { task: 'Auto expand test' },
    status: 'running',
    mode: 'train',
    resourcesId: 'rs-400',
    startTime: now - 3600,
    endTime: null,
    attempt: {
      rolloutId: 'ro-auto-expand',
      attemptId: 'at-expand-003',
      sequenceId: 3,
      status: 'running',
      startTime: now - 3600,
      endTime: null,
      workerId: 'worker-auto',
      lastHeartbeatTime: now - 30,
      metadata: null,
    },
    config: {},
    metadata: null,
  },
];

const autoExpandAttempts: Record<string, Attempt[]> = {
  'ro-auto-expand': [
    {
      rolloutId: 'ro-auto-expand',
      attemptId: 'at-expand-001',
      sequenceId: 1,
      status: 'preparing',
      startTime: now - 5400,
      endTime: now - 5000,
      workerId: 'worker-auto',
      lastHeartbeatTime: now - 5000,
      metadata: null,
    },
    {
      rolloutId: 'ro-auto-expand',
      attemptId: 'at-expand-002',
      sequenceId: 2,
      status: 'failed',
      startTime: now - 5000,
      endTime: now - 4200,
      workerId: 'worker-auto',
      lastHeartbeatTime: now - 4200,
      metadata: null,
    },
    {
      rolloutId: 'ro-auto-expand',
      attemptId: 'at-expand-003',
      sequenceId: 3,
      status: 'running',
      startTime: now - 3600,
      endTime: null,
      workerId: 'worker-auto',
      lastHeartbeatTime: now - 30,
      metadata: null,
    },
  ],
};
function renderWithStore(uiOverrides?: Partial<RolloutsUiState>) {
  const store = createAppStore({
    config: {
      ...initialConfigState,
      autoRefreshMs: 0,
    },
    rollouts: {
      ...initialRolloutsUiState,
      ...uiOverrides,
    },
  });

  return (
    <Provider store={store}>
      <RolloutsPage />
    </Provider>
  );
}

const createHandlers = (rollouts: Rollout[], attempts: Record<string, Attempt[]>) => [
  http.get('*/rollouts', () => HttpResponse.json(snakeCaseKeys(rollouts))),
  http.get('*/rollouts/:rolloutId/attempts', ({ params }) => {
    const rolloutId = params.rolloutId as string;
    return HttpResponse.json(snakeCaseKeys(attempts[rolloutId] ?? []));
  }),
];

const defaultHandlers = createHandlers(sampleRollouts, attemptsByRollout);

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

export const LongDuration: Story = {
  render: () => renderWithStore(),
  parameters: {
    msw: {
      handlers: createHandlers(longDurationRollouts, longDurationAttempts),
    },
  },
};

export const StaleHeartbeat: Story = {
  render: () => renderWithStore(),
  parameters: {
    msw: {
      handlers: createHandlers(staleHeartbeatRollouts, staleHeartbeatAttempts),
    },
  },
};

export const StatusMismatch: Story = {
  render: () => renderWithStore(),
  parameters: {
    msw: {
      handlers: createHandlers(statusMismatchRollouts, statusMismatchAttempts),
    },
  },
};

export const LongInput: Story = {
  render: () => renderWithStore(),
  parameters: {
    msw: {
      handlers: createHandlers(longInputRollouts, longInputAttempts),
    },
  },
};

export const Pagination: Story = {
  render: () => renderWithStore({ recordsPerPage: 20 }),
  parameters: {
    msw: {
      handlers: createHandlers(paginationRollouts, paginationAttempts),
    },
  },
};

export const AutoExpandedAttempt: Story = {
  render: () => renderWithStore(),
  parameters: {
    msw: {
      handlers: createHandlers(autoExpandRollouts, autoExpandAttempts),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText('ro-auto-expand');

    const toggleButton =
      canvas.queryByRole('button', { name: /toggle row/i }) ??
      canvas.queryByRole('button', { name: /expand/i }) ??
      canvas.queryByRole('button', { name: /show details/i }) ??
      (canvasElement.querySelector('table tbody button') as HTMLButtonElement | null);

    if (!toggleButton) {
      throw new Error('Unable to locate row expansion toggle button');
    }

    await userEvent.click(toggleButton);
    await canvas.findByText('at-expand-001');
  },
};
