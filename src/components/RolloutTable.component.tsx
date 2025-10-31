import { Alert, Badge, Button, Group, MultiSelect, Skeleton, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconAlertCircle, IconRefresh, IconReload, IconSearch } from '@tabler/icons-react';
import { DataTable, type DataTableColumn, type DataTableSortStatus } from 'mantine-datatable';
import { useCallback, useEffect, useMemo, useState, type ReactNode, type SetStateAction } from 'react';

import {
  type Attempt,
  type AttemptStatus,
  type Rollout,
  type RolloutMode,
  type RolloutStatus,
  type RolloutsSortState,
} from '@/features/rollouts';
import { clampToNow, formatDateTime, formatDuration, formatInputPreview, formatRelativeTime, formatStatusLabel, toTimestamp } from '@/utils/format';

const ROLLOUT_STATUS_OPTIONS: RolloutStatus[] = [
  'queuing',
  'preparing',
  'running',
  'failed',
  'succeeded',
  'cancelled',
  'requeuing',
];

const ATTEMPT_STATUS_COLORS: Record<AttemptStatus, string> = {
  failed: 'red',
  preparing: 'violet',
  running: 'blue',
  succeeded: 'teal',
  timeout: 'orange',
  unresponsive: 'orange',
};

const ROLLOUT_STATUS_COLORS: Record<RolloutStatus, string> = {
  cancelled: 'gray',
  failed: 'red',
  preparing: 'violet',
  queuing: 'blue',
  requeuing: 'cyan',
  running: 'blue',
  succeeded: 'teal',
};

const ROLLOUT_MODE_OPTIONS: RolloutMode[] = ['train', 'val', 'test'];

const DEFAULT_RECORDS_PER_PAGE_OPTIONS = [50, 100, 200, 500];

type RolloutTableRecord = Rollout & {
  attemptId: string | null;
  attemptSequence?: number;
  isNested: boolean;
  canExpand: boolean;
  inputPreview: string;
  inputFull: string;
  attemptStatus?: AttemptStatus;
  statusValue: string;
  startTimestamp: number | null;
  durationSeconds: number | null;
  lastHeartbeatTimestamp: number | null;
  workerId: string | null;
};

function selectHeartbeatTimestamp(attempt?: Attempt | null): number | null {
  if (!attempt) {
    return null;
  }

  if (typeof attempt.lastHeartbeatTime === 'number' && !Number.isNaN(attempt.lastHeartbeatTime)) {
    return attempt.lastHeartbeatTime;
  }

  if (!attempt || !attempt.metadata) {
    return null;
  }

  const { metadata } = attempt;
  const candidates = [
    metadata.lastHeartbeatAt,
    metadata.last_heartbeat_at,
    metadata.lastHeartbeatTime,
    metadata.last_heartbeat_time,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'number' && !Number.isNaN(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function buildRolloutRecord(rollout: Rollout): RolloutTableRecord {
  const latestAttempt = rollout.attempt;
  const input = formatInputPreview(rollout.input);
  const startTimestamp = toTimestamp(latestAttempt?.startTime ?? rollout.startTime);
  const endTimestamp = toTimestamp(latestAttempt?.endTime ?? rollout.endTime);
  const durationSeconds = clampToNow(startTimestamp, endTimestamp);
  const lastHeartbeatTimestamp = selectHeartbeatTimestamp(latestAttempt);
  const attemptId = latestAttempt?.attemptId ?? null;
  const attemptStatus = latestAttempt?.status;
  const sequenceId = latestAttempt?.sequenceId;
  const statusValue =
    attemptStatus && attemptStatus !== rollout.status ? `${rollout.status}-${attemptStatus}` : rollout.status;

  return {
    ...rollout,
    attempt: latestAttempt ?? null,
    attemptId,
    attemptSequence: sequenceId,
    isNested: false,
    canExpand: Boolean(sequenceId && sequenceId > 1),
    inputPreview: input.preview,
    inputFull: input.full,
    attemptStatus,
    statusValue,
    startTimestamp,
    durationSeconds,
    lastHeartbeatTimestamp,
    workerId: latestAttempt?.workerId ?? null,
  };
}

function buildAttemptRecord(rollout: Rollout, attempt: Attempt): RolloutTableRecord {
  const input = formatInputPreview(rollout.input);
  const startTimestamp = toTimestamp(attempt.startTime ?? rollout.startTime);
  const endTimestamp = toTimestamp(attempt.endTime);
  const durationSeconds = clampToNow(startTimestamp, endTimestamp);
  const lastHeartbeatTimestamp = selectHeartbeatTimestamp(attempt);

  return {
    ...rollout,
    attempt,
    attemptId: attempt.attemptId,
    attemptSequence: attempt.sequenceId,
    isNested: true,
    canExpand: false,
    inputPreview: input.preview,
    inputFull: input.full,
    attemptStatus: attempt.status,
    statusValue: attempt.status,
    startTimestamp,
    durationSeconds,
    lastHeartbeatTimestamp,
    workerId: attempt.workerId ?? null,
  };
}

function getStatusBadge(status: string, kind: 'rollout' | 'attempt') {
  const color =
    kind === 'rollout'
      ? ROLLOUT_STATUS_COLORS[status as RolloutStatus] ?? 'gray'
      : ATTEMPT_STATUS_COLORS[status as AttemptStatus] ?? 'gray';

  return (
    <Badge size="sm" variant="light" color={color}>
      {formatStatusLabel(status)}
    </Badge>
  );
}

type RolloutColumnsOptions = {
  statusFilters: RolloutStatus[];
  onStatusFilterChange: (values: RolloutStatus[]) => void;
  onStatusFilterReset: () => void;
  modeFilters: RolloutMode[];
  onModeFilterChange: (values: RolloutMode[]) => void;
  onModeFilterReset: () => void;
};

function createRolloutColumns({
  statusFilters,
  onStatusFilterChange,
  onStatusFilterReset,
  modeFilters,
  onModeFilterChange,
  onModeFilterReset,
}: RolloutColumnsOptions): DataTableColumn<RolloutTableRecord>[] {
  const statusOptions = ROLLOUT_STATUS_OPTIONS.map((status) => ({
    value: status,
    label: formatStatusLabel(status),
  }));
  const modeOptions = ROLLOUT_MODE_OPTIONS.map((mode) => ({
    value: mode,
    label: formatStatusLabel(mode),
  }));

  return [
    {
      accessor: 'rolloutId',
      title: 'Rollout',
      sortable: true,
      render: ({ rolloutId }) => (
        <Text fw={500} size="sm">
          {rolloutId}
        </Text>
      ),
      width: '8em',
      // TODO: add copy icon
    },
    {
      accessor: 'attemptId',
      title: 'Attempt ID',
      sortable: true,
      render: ({ attemptId, attemptSequence }) => (
        <Group gap="xs">
        <Text size="sm" c={attemptId ? undefined : 'dimmed'}>
          {attemptId ?? 'N/A'}
        </Text>
        {attemptSequence && attemptSequence > 1 && <Badge leftSection={<IconReload size={12}/>} pl={6} pr={6}>{attemptSequence}</Badge>}
        </Group>
      ),
      width: '10em',
      // TODO: add copy icon
    },
    {
      accessor: 'inputPreview',
      title: 'Input',
      render: ({ inputPreview, inputFull }) => (
        <Text size="sm" ff="monospace" c="dimmed" title={inputFull} lineClamp={1}>
          {inputPreview}
        </Text>
      ),
      // TODO:
      // This column takes the rest of the width, and should auto omit contents as ... when overflowed
    },
    {
      accessor: 'statusValue',
      title: 'Status',
      sortable: true,
      width: '10em',
      filter: ({ close }) => (
        <Stack gap="xs">
          <MultiSelect
            label="Status"
            description="Filter rollouts by status"
            data={statusOptions}
            value={statusFilters}
            placeholder="Select statuses..."
            searchable
            clearable
            comboboxProps={{ withinPortal: false }}
            onChange={(values) => onStatusFilterChange(values as RolloutStatus[])}
          />
          <Button
            variant="light"
            size="xs"
            onClick={() => {
              onStatusFilterReset();
              close();
            }}
            disabled={statusFilters.length === 0}
          >
            Clear
          </Button>
        </Stack>
      ),
      filtering: statusFilters.length > 0,
      render: ({ status, attemptStatus, isNested }) => {
        if (isNested) {
          return <Group gap={4}>{getStatusBadge(attemptStatus ?? 'unknown', 'attempt')}</Group>;
        }

        if (attemptStatus && attemptStatus !== status) {
          return (
            <Group gap={4}>
              {getStatusBadge(status, 'rollout')}
              <Text size="sm" c="dimmed">
                -
              </Text>
              {getStatusBadge(attemptStatus, 'attempt')}
            </Group>
          );
        }

        return getStatusBadge(status, 'rollout');
      },
    },
    {
      accessor: 'resourcesId',
      title: 'Resources',
      sortable: true,
      width: '8em',
      render: ({ resourcesId }) => (
        <Text size="sm" c={resourcesId ? undefined : 'dimmed'}>
          {resourcesId ?? 'N/A'}
        </Text>
      ),
    },
    {
      accessor: 'mode',
      title: 'Mode',
      sortable: true,
      width: '8em',
      filter: ({ close }) => (
        <Stack gap="xs">
          <MultiSelect
            label="Mode"
            description="Filter rollouts by mode"
            data={modeOptions}
            value={modeFilters}
            placeholder="Select modes..."
            searchable
            clearable
            comboboxProps={{ withinPortal: false }}
            onChange={(values) => onModeFilterChange(values as RolloutMode[])}
          />
          <Button
            variant="light"
            size="xs"
            onClick={() => {
              onModeFilterReset();
              close();
            }}
            disabled={modeFilters.length === 0}
          >
            Clear
          </Button>
        </Stack>
      ),
      filtering: modeFilters.length > 0,
      render: ({ mode }) => (
        <Text size="sm" c={mode ? undefined : 'dimmed'}>
          {mode ?? 'N/A'}
        </Text>
      ),
    },
    {
      accessor: 'startTimestamp',
      title: 'Start Time',
      sortable: true,
      textAlign: 'right',
      render: ({ startTimestamp }) => <Text size="sm">{formatDateTime(startTimestamp)}</Text>,
    },
    {
      accessor: 'durationSeconds',
      title: 'Duration',
      sortable: true,
      textAlign: 'right',
      render: ({ durationSeconds }) => <Text size="sm">{formatDuration(durationSeconds)}</Text>,
    },
    {
      accessor: 'lastHeartbeatTimestamp',
      title: 'Last Heartbeat',
      sortable: true,
      textAlign: 'right',
      render: ({ lastHeartbeatTimestamp, attempt, isNested }) => {
        if (!attempt && isNested) {
          return (
            <Text size="sm" c="dimmed">
              N/A
            </Text>
          );
        }
        return <Text size="sm">{formatRelativeTime(lastHeartbeatTimestamp)}</Text>;
      },
    },
    {
      accessor: 'workerId',
      title: 'Worker ID',
      sortable: true,
      render: ({ workerId }) => (
        <Text size="sm" c={workerId ? undefined : 'dimmed'}>
          {workerId ?? 'N/A'}
        </Text>
      ),
    },
    {
      accessor: 'actionsPlaceholder',
      title: 'Actions',
      render: () => (
        <Group gap={8}>
          <Button size="xs" variant="light">
            View Raw JSON
          </Button>
          <Button size="xs" variant="outline">
            View Traces
          </Button>
        </Group>
      ),
    },
  ];
}

type ComparatorKey = keyof Pick<
  RolloutTableRecord,
  | 'rolloutId'
  | 'attemptId'
  | 'resourcesId'
  | 'mode'
  | 'startTimestamp'
  | 'durationSeconds'
  | 'lastHeartbeatTimestamp'
  | 'workerId'
  | 'statusValue'
>;

function compareRecords(a: RolloutTableRecord, b: RolloutTableRecord, key: ComparatorKey): number {
  const valueA = a[key];
  const valueB = b[key];

  if (valueA === valueB) {
    return 0;
  }

  if (valueA === null || valueA === undefined) {
    return 1;
  }

  if (valueB === null || valueB === undefined) {
    return -1;
  }

  if (typeof valueA === 'number' && typeof valueB === 'number') {
    return valueA - valueB;
  }

  return String(valueA).localeCompare(String(valueB));
}

type RowExpansionRenderer = (context: {
  rollout: Rollout;
  columns: DataTableColumn<RolloutTableRecord>[];
}) => ReactNode;

export type RolloutTableProps = {
  rollouts: Rollout[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  searchTerm: string;
  statusFilters: RolloutStatus[];
  modeFilters: RolloutMode[];
  sort: RolloutsSortState;
  page: number;
  recordsPerPage: number;
  onSearchTermChange: (value: string) => void;
  onStatusFilterChange: (values: RolloutStatus[]) => void;
  onStatusFilterReset: () => void;
  onModeFilterChange: (values: RolloutMode[]) => void;
  onModeFilterReset: () => void;
  onSortStatusChange: (status: DataTableSortStatus<RolloutTableRecord>) => void;
  onPageChange: (page: number) => void;
  onRecordsPerPageChange: (value: number) => void;
  onResetFilters: () => void;
  onRefetch: () => void;
  recordsPerPageOptions?: number[];
  renderRowExpansion?: RowExpansionRenderer;
};

export function RolloutTable({
  rollouts,
  isLoading,
  isFetching,
  isError,
  error,
  searchTerm,
  statusFilters,
  modeFilters,
  sort,
  page,
  recordsPerPage,
  onSearchTermChange,
  onStatusFilterChange,
  onStatusFilterReset,
  onModeFilterChange,
  onModeFilterReset,
  onSortStatusChange,
  onPageChange,
  onRecordsPerPageChange,
  onResetFilters,
  onRefetch,
  recordsPerPageOptions = DEFAULT_RECORDS_PER_PAGE_OPTIONS,
  renderRowExpansion,
}: RolloutTableProps) {
  const [expandedRecordIds, setExpandedRecordIds] = useState<string[]>([]);

  const rolloutRecords = useMemo<RolloutTableRecord[]>(() => {
    if (!rollouts) {
      return [];
    }
    return rollouts.map((rolloutItem) => buildRolloutRecord(rolloutItem));
  }, [rollouts]);

  const columns = useMemo(
    () =>
      createRolloutColumns({
        statusFilters,
        onStatusFilterChange,
        onStatusFilterReset,
        modeFilters,
        onModeFilterChange,
        onModeFilterReset,
      }),
    [
      statusFilters,
      onStatusFilterChange,
      onStatusFilterReset,
      modeFilters,
      onModeFilterChange,
      onModeFilterReset,
    ],
  );

  const filteredRecords = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const includeStatuses = statusFilters.length > 0 ? statusFilters : undefined;
    const includeModes = modeFilters.length > 0 ? modeFilters : undefined;

    return rolloutRecords.filter((record) => {
      const matchesSearch =
        normalizedSearch.length === 0 || record.rolloutId.toLowerCase().includes(normalizedSearch);
      const matchesStatus = !includeStatuses || includeStatuses.includes(record.status);
      const matchesMode = !includeModes || (record.mode !== null && includeModes.includes(record.mode));

      return matchesSearch && matchesStatus && matchesMode;
    });
  }, [modeFilters, rolloutRecords, searchTerm, statusFilters]);

  const sortedRecords = useMemo(() => {
    const sorted = filteredRecords.slice();
    const { column, direction } = sort;
    const comparatorKey = column as ComparatorKey;
    if (!sorted.length || !(comparatorKey in sorted[0])) {
      return sorted;
    }
    sorted.sort((a, b) => compareRecords(a, b, comparatorKey));
    if (direction === 'desc') {
      sorted.reverse();
    }
    return sorted;
  }, [filteredRecords, sort]);

  const totalRecords = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));

  useEffect(() => {
    if (page > totalPages) {
      onPageChange(totalPages);
    }
  }, [onPageChange, page, totalPages]);

  const paginatedRecords = useMemo(() => {
    const startIndex = (page - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    return sortedRecords.slice(startIndex, endIndex);
  }, [page, recordsPerPage, sortedRecords]);

  useEffect(() => {
    setExpandedRecordIds((current) =>
      current.filter((id) => paginatedRecords.some((record) => record.rolloutId === id && record.canExpand)),
    );
  }, [paginatedRecords]);

  const hasActiveFilters =
    searchTerm.trim().length > 0 || statusFilters.length > 0 || modeFilters.length > 0;

  const sortStatus: DataTableSortStatus<RolloutTableRecord> = {
    columnAccessor: sort.column,
    direction: sort.direction,
  };

  const handleSortStatusChange = useCallback(
    (status: DataTableSortStatus<RolloutTableRecord>) => {
      onSortStatusChange(status);
    },
    [onSortStatusChange],
  );

  if (isLoading) {
    return (
      <Stack gap="md">
        <Title order={1}>Rollouts</Title>
        <Skeleton height={36} radius="sm" />
        <Skeleton height={40} radius="sm" />
        <Skeleton height={360} radius="md" />
      </Stack>
    );
  }

  const errorMessage =
    isError && error && typeof error === 'object' && 'status' in (error as Record<string, unknown>)
      ? `Unable to load rollouts (status: ${String((error as Record<string, unknown>).status)}).`
      : 'Unable to load rollouts.';

  const emptyState = (
    <Stack gap="sm" align="center" py="xl">
      <Text fw={600} size="sm">
        No rollouts found
      </Text>
      <Text size="sm" c="dimmed" ta="center">
        {hasActiveFilters
          ? 'Try adjusting the search or filters to see more results.'
          : 'Try refreshing to fetch the latest rollouts.'}
      </Text>
      <Group gap="xs">
        <Button size="xs" variant="light" leftSection={<IconRefresh size={14} />} onClick={onRefetch}>
          Refresh
        </Button>
        {hasActiveFilters ? (
          <Button size="xs" variant="subtle" onClick={onResetFilters}>
            Clear filters
          </Button>
        ) : null}
      </Group>
    </Stack>
  );

  return (
    <Stack gap="md">
      <Title order={1}>Rollouts</Title>

      <TextInput
        placeholder="Search by Rollout ID"
        value={searchTerm}
        onChange={(event) => onSearchTermChange(event.currentTarget.value)}
        leftSection={<IconSearch size={16} />}
        data-testid="rollouts-search-input"
        w="100%"
        style={{ maxWidth: 360 }}
      />

      {isError && !totalRecords ? (
        <Alert color="red" icon={<IconAlertCircle size={18} />} variant="light">
          <Group justify="space-between" align="center">
            <Text size="sm">{errorMessage}</Text>
            <Button size="xs" variant="light" leftSection={<IconRefresh size={14} />} onClick={onRefetch}>
              Retry
            </Button>
          </Group>
        </Alert>
      ) : null}

      {!isError || totalRecords > 0 ? (
        <DataTable<RolloutTableRecord>
          classNames={{ root: 'rollouts-table' }}
          withTableBorder
          withColumnBorders
          highlightOnHover
          verticalAlign="top"
          minHeight={paginatedRecords.length === 0 ? 320 : undefined}
          idAccessor="rolloutId"
          records={paginatedRecords}
          columns={columns}
          totalRecords={totalRecords}
          recordsPerPage={recordsPerPage}
          page={page}
          onPageChange={onPageChange}
          onRecordsPerPageChange={onRecordsPerPageChange}
          recordsPerPageOptions={recordsPerPageOptions}
          sortStatus={sortStatus}
          onSortStatusChange={handleSortStatusChange}
          fetching={isFetching && !isLoading}
          loaderSize="sm"
          emptyState={paginatedRecords.length === 0 ? emptyState : undefined}
          rowExpansion={
            renderRowExpansion
              ? {
                  allowMultiple: true,
                  expandable: ({ record }) => record.canExpand,
                  expanded: {
                    recordIds: expandedRecordIds,
                    onRecordIdsChange: (nextRecordIds: SetStateAction<string[]>) => {
                      setExpandedRecordIds((previous) => {
                        const resolved =
                          typeof nextRecordIds === 'function'
                            ? nextRecordIds(previous)
                            : (nextRecordIds ?? []) as (string | number)[];
                        return resolved
                          .map(String)
                          .filter((id) =>
                            paginatedRecords.some((tableRecord) => tableRecord.rolloutId === id && tableRecord.canExpand),
                          );
                      });
                    },
                  },
                  content: ({ record }) => renderRowExpansion({ rollout: record, columns }),
                }
              : undefined
          }
        />
      ) : null}
    </Stack>
  );
}

export type RolloutAttemptsTableProps = {
  rollout: Rollout;
  attempts: Attempt[] | undefined;
  isFetching: boolean;
  isError: boolean;
  onRetry: () => void;
  columns: DataTableColumn<RolloutTableRecord>[];
};

export function RolloutAttemptsTable({
  rollout,
  attempts,
  isFetching,
  isError,
  onRetry,
  columns,
}: RolloutAttemptsTableProps) {
  const attemptRecords = useMemo<RolloutTableRecord[]>(() => {
    if (!attempts) {
      return [];
    }
    return attempts.map((attempt) => buildAttemptRecord(rollout, attempt));
  }, [attempts, rollout]);

  if (isError && !attemptRecords.length) {
    return (
      <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />}>
        <Stack gap="xs">
          <Text size="sm">Unable to load attempts for this rollout.</Text>
          <Button size="xs" variant="light" leftSection={<IconRefresh size={14} />} onClick={onRetry}>
            Retry
          </Button>
        </Stack>
      </Alert>
    );
  }

  const emptyState = (
    <Stack gap="xs" align="center" py="md">
      <Text size="sm" c="dimmed">
        No attempts found for this rollout.
      </Text>
      <Button size="xs" variant="light" leftSection={<IconRefresh size={14} />} onClick={onRetry}>
        Refresh
      </Button>
    </Stack>
  );

  return (
    <DataTable<RolloutTableRecord>
      classNames={{ root: 'rollouts-table rollouts-table--nested' }}
      withColumnBorders
      noHeader
      minHeight={0}
      idAccessor="attemptId"
      fetching={isFetching}
      loaderSize="sm"
      records={attemptRecords}
      columns={columns}
      emptyState={attemptRecords.length === 0 ? emptyState : undefined}
    />
  );
}
