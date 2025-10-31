import type { Meta, StoryObj } from '@storybook/react';
import { Provider } from 'react-redux';
import { RolloutDrawer } from './RolloutDrawer.component';
import { createAppStore } from '@/store';
import { initialConfigState } from '@/features/config/slice';
import { initialRolloutsUiState } from '@/features/rollouts/slice';
import type { Attempt, Rollout } from '@/types';
import type { DrawerContent } from '@/features/ui/drawer';

const meta: Meta<typeof RolloutDrawer> = {
  title: 'Components/RolloutDrawer',
  component: RolloutDrawer,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof RolloutDrawer>;

const now = Math.floor(Date.now() / 1000);

const baseAttempt: Attempt = {
  rolloutId: 'ro-story-001',
  attemptId: 'at-story-001',
  sequenceId: 1,
  startTime: now - 3600,
  endTime: null,
  status: 'running',
  workerId: 'worker-story',
  lastHeartbeatTime: now - 42,
  metadata: { info: 'Sample metadata', runId: 'run-123' },
};

const baseRollout: Rollout = {
  rolloutId: 'ro-story-001',
  input: {
    task: 'Generate daily summary',
    payload: { account: 'enterprise', date: '2024-02-19' },
  },
  startTime: now - 4000,
  endTime: null,
  mode: 'train',
  resourcesId: 'rs-story-001',
  status: 'running',
  config: { retries: 1, priority: 'high' },
  metadata: { owner: 'storybook' },
  attempt: baseAttempt,
};

function renderWithDrawer(content: DrawerContent) {
  const store = createAppStore({
    config: initialConfigState,
    rollouts: initialRolloutsUiState,
    drawer: {
      isOpen: true,
      content,
    },
  });

  return (
    <Provider store={store}>
      <RolloutDrawer />
    </Provider>
  );
}

export const RawRolloutJson: Story = {
  render: () =>
    renderWithDrawer({
      type: 'rollout-json',
      rollout: baseRollout,
      attempt: baseRollout.attempt,
      isNested: false,
    }),
};

export const NestedAttemptJson: Story = {
  render: () =>
    renderWithDrawer({
      type: 'rollout-json',
      rollout: baseRollout,
      attempt: {
        ...baseAttempt,
        attemptId: 'at-story-002',
        sequenceId: 2,
        status: 'failed',
        endTime: now - 1200,
        metadata: { info: 'Secondary attempt', reason: 'Timeout' },
      },
      isNested: true,
    }),
};

export const TracesPlaceholder: Story = {
  render: () =>
    renderWithDrawer({
      type: 'rollout-traces',
      rollout: baseRollout,
      attempt: baseRollout.attempt,
      isNested: false,
    }),
};
