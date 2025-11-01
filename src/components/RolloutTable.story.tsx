import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Box } from '@mantine/core';
import { RolloutTable } from './RolloutTable.component';
import type { Rollout, RolloutMode, RolloutStatus } from '@/types';
import type { RolloutsSortState } from '@/features/rollouts';

const meta: Meta<typeof RolloutTable> = {
  title: 'Components/RolloutTable',
  component: RolloutTable,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof RolloutTable>;

const now = Math.floor(Date.now() / 1000);

const sampleRollouts: Rollout[] = [
  {
    rolloutId: 'ro-story-001',
    input: { task: 'Generate onboarding summary' },
    startTime: now - 3200,
    endTime: null,
    mode: 'train',
    resourcesId: 'rs-story-001',
    status: 'running',
    config: { retries: 1 },
    metadata: { owner: 'alice' },
    attempt: {
      rolloutId: 'ro-story-001',
      attemptId: 'at-story-010',
      sequenceId: 1,
      startTime: now - 3200,
      endTime: null,
      status: 'running',
      workerId: 'worker-east',
      lastHeartbeatTime: now - 45,
      metadata: { info: 'Worker is processing' },
    },
  },
  {
    rolloutId: 'ro-story-002',
    input: { task: 'Classify feedback tickets' },
    startTime: now - 7200,
    endTime: now - 5400,
    mode: 'val',
    resourcesId: 'rs-story-002',
    status: 'succeeded',
    config: { retries: 2 },
    metadata: { owner: 'bob' },
    attempt: {
      rolloutId: 'ro-story-002',
      attemptId: 'at-story-011',
      sequenceId: 2,
      startTime: now - 6200,
      endTime: now - 5400,
      status: 'succeeded',
      workerId: 'worker-north',
      lastHeartbeatTime: now - 5400,
      metadata: { previousAttempt: 'at-story-010' },
    },
  },
  {
    rolloutId: 'ro-story-003',
    input: { task: 'Analyze experiment results' },
    startTime: now - 10800,
    endTime: now - 9600,
    mode: 'test',
    resourcesId: 'rs-story-003',
    status: 'failed',
    config: { retries: 1 },
    metadata: { owner: 'carol' },
    attempt: {
      rolloutId: 'ro-story-003',
      attemptId: 'at-story-012',
      sequenceId: 3,
      startTime: now - 10200,
      endTime: now - 9600,
      status: 'failed',
      workerId: 'worker-west',
      lastHeartbeatTime: now - 9600,
      metadata: { reason: 'Timeout' },
    },
  },
  {
    rolloutId: 'ro-story-004',
    input: { task: 'Evaluate prompt variants' },
    startTime: now - 3600,
    endTime: null,
    mode: 'train',
    resourcesId: null,
    status: 'preparing',
    config: { retries: 0 },
    metadata: { owner: 'dave' },
    attempt: null,
  },
  {
    rolloutId: 'ro-story-005',
    input: { task: 'Generate quick answers' },
    startTime: now - 1800,
    endTime: null,
    mode: 'val',
    resourcesId: 'rs-story-004',
    status: 'running',
    config: { retries: 0 },
    metadata: { owner: 'eva' },
    attempt: {
      rolloutId: 'ro-story-005',
      attemptId: 'at-story-013',
      sequenceId: 1,
      startTime: now - 1800,
      endTime: null,
      status: 'running',
      workerId: null,
      lastHeartbeatTime: now - 75,
      metadata: null,
    },
  },
  {
    rolloutId: 'ro-story-006',
    input: { task: 'Compile release notes' },
    startTime: now - 9600,
    endTime: now - 9000,
    mode: null,
    resourcesId: 'rs-story-005',
    status: 'cancelled',
    config: { retries: 3 },
    metadata: null,
    attempt: {
      rolloutId: 'ro-story-006',
      attemptId: 'at-story-014',
      sequenceId: 1,
      startTime: now - 9600,
      endTime: now - 9000,
      status: 'timeout',
      workerId: 'worker-south',
      lastHeartbeatTime: now - 9000,
      metadata: { info: 'Cancelled by operator' },
    },
  },
];

type WrapperProps = {
  maxWidth: number;
};

function RolloutTableStoryWrapper({ maxWidth }: WrapperProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilters, setStatusFilters] = useState<RolloutStatus[]>([]);
  const [modeFilters, setModeFilters] = useState<RolloutMode[]>([]);
  const [page, setPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(5);
  const [sort, setSort] = useState<RolloutsSortState>({
    column: 'startTimestamp',
    direction: 'desc',
  });

  return (
    <Box mx="auto" style={{ maxWidth, width: '100%', padding: 16 }}>
      <RolloutTable
        rollouts={sampleRollouts}
        isLoading={false}
        isFetching={false}
        isError={false}
        error={null}
        searchTerm={searchTerm}
        statusFilters={statusFilters}
        modeFilters={modeFilters}
        sort={sort}
        page={page}
        recordsPerPage={recordsPerPage}
        onSearchTermChange={setSearchTerm}
        onStatusFilterChange={(values) => {
          setStatusFilters(values);
          setPage(1);
        }}
        onStatusFilterReset={() => {
          setStatusFilters([]);
          setPage(1);
        }}
        onModeFilterChange={(values) => {
          setModeFilters(values);
          setPage(1);
        }}
        onModeFilterReset={() => {
          setModeFilters([]);
          setPage(1);
        }}
        onSortStatusChange={setSort}
        onPageChange={setPage}
        onRecordsPerPageChange={(value) => {
          setRecordsPerPage(value);
          setPage(1);
        }}
        onResetFilters={() => {
          setSearchTerm('');
          setStatusFilters([]);
          setModeFilters([]);
          setSort({ column: 'startTimestamp', direction: 'desc' });
          setPage(1);
        }}
        onRefetch={() => undefined}
        recordsPerPageOptions={[5, 10, 20]}
      />
    </Box>
  );
}

export const WideContainer: Story = {
  render: () => <RolloutTableStoryWrapper maxWidth={1280} />,
};

export const MediumContainer: Story = {
  render: () => <RolloutTableStoryWrapper maxWidth={960} />,
};

export const NarrowContainer: Story = {
  render: () => <RolloutTableStoryWrapper maxWidth={720} />,
};

export const DrawerWidth: Story = {
  render: () => <RolloutTableStoryWrapper maxWidth={520} />,
};
