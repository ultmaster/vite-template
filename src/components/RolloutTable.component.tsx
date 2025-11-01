import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { useElementSize } from '@mantine/hooks';
import {
  IconAlertCircle,
  IconBraces,
  IconCheck,
  IconCopy,
  IconRefresh,
  IconReload,
  IconSearch,
  IconTimeline,
} from '@tabler/icons-react';
import { DataTable, type DataTableColumn, type DataTableSortStatus } from 'mantine-datatable';
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  CopyButton,
  Group,
  MultiSelect,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  type Attempt,
  type AttemptStatus,
  type Rollout,
  type RolloutMode,
  type RolloutsSortState,
  type RolloutStatus,
} from '@/features/rollouts';
import {
  clampToNow,
  formatDateTime,
  formatDuration,
  formatRelativeTime,
  formatStatusLabel,
  safeStringify,
  toTimestamp,
} from '@/utils/format';

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

type ColumnVisibilityConfig = {
  minWidth: number;
  priority: number;
};

const COLUMN_VISIBILITY: Record<string, ColumnVisibilityConfig> = {
  rolloutId: { minWidth: 200, priority: 0 },
  actionsPlaceholder: { minWidth: 120, priority: 0 },
  inputText: { minWidth: 220, priority: 1 },
  statusValue: { minWidth: 150, priority: 1 },
  startTimestamp: { minWidth: 180, priority: 2 },
  durationSeconds: { minWidth: 150, priority: 2 },
  attemptId: { minWidth: 180, priority: 3 },
  resourcesId: { minWidth: 150, priority: 3 },
  mode: { minWidth: 140, priority: 3 },
  lastHeartbeatTimestamp: { minWidth: 170, priority: 3 },
  workerId: { minWidth: 150, priority: 3 },
};

export type RolloutTableRecord = Rollout & {
  attemptId: string | null;
  attemptSequence: number | null;
  isNested: boolean;
  canExpand: boolean;
  inputText: string;
  attemptStatus?: AttemptStatus;
  statusValue: string;
  startTimestamp: number | null;
  durationSeconds: number | null;
  lastHeartbeatTimestamp: number | null;
  workerId: string | null;
  actionsPlaceholder?: null;
};

function selectHeartbeatTimestamp(attempt?: Attempt | null): number | null {
  if (!attempt || attempt.lastHeartbeatTime == null || Number.isNaN(attempt.lastHeartbeatTime)) {
    return null;
  }

  return attempt.lastHeartbeatTime;
}

export function buildRolloutRecord(rollout: Rollout): RolloutTableRecord {
  const latestAttempt = rollout.attempt;
  const inputValue =
    rollout.input === null || typeof rollout.input === 'undefined'
      ? 'N/A'
      : typeof rollout.input === 'string'
        ? rollout.input
        : safeStringify(rollout.input);
  const startTimestamp = toTimestamp(latestAttempt?.startTime ?? rollout.startTime);
  const endTimestamp = toTimestamp(latestAttempt?.endTime ?? rollout.endTime);
  const durationSeconds = clampToNow(startTimestamp, endTimestamp);
  const attemptStatus = latestAttempt?.status;
  const sequenceId = latestAttempt?.sequenceId;
  const statusValue =
    attemptStatus && attemptStatus !== rollout.status
      ? `${rollout.status}-${attemptStatus}`
      : rollout.status;

  return {
    ...rollout,
    attempt: latestAttempt ?? null,
    attemptId: latestAttempt?.attemptId ?? null,
    attemptSequence: latestAttempt?.sequenceId ?? null,
    isNested: false,
    canExpand: Boolean(sequenceId && sequenceId > 1),
    inputText: inputValue,
    attemptStatus,
    statusValue,
    startTimestamp,
    durationSeconds,
    lastHeartbeatTimestamp: rollout.attempt?.lastHeartbeatTime ?? null,
    workerId: latestAttempt?.workerId ?? null,
    actionsPlaceholder: null,
  };
}

function buildAttemptRecord(rollout: Rollout, attempt: Attempt): RolloutTableRecord {
  const inputValue =
    rollout.input === null || typeof rollout.input === 'undefined'
      ? 'N/A'
      : typeof rollout.input === 'string'
        ? rollout.input
        : safeStringify(rollout.input);
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
    inputText: inputValue,
    attemptStatus: attempt.status,
    statusValue: attempt.status,
    startTimestamp,
    durationSeconds,
    lastHeartbeatTimestamp,
    workerId: attempt.workerId ?? null,
    actionsPlaceholder: null,
  };
}

function getStatusBadge(status: string, kind: 'rollout' | 'attempt') {
  const color =
    kind === 'rollout'
      ? (ROLLOUT_STATUS_COLORS[status as RolloutStatus] ?? 'gray')
      : (ATTEMPT_STATUS_COLORS[status as AttemptStatus] ?? 'gray');

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
  onViewRawJson?: (record: RolloutTableRecord) => void;
  onViewTraces?: (record: RolloutTableRecord) => void;
};

function createRolloutColumns({
  statusFilters,
  onStatusFilterChange,
  onStatusFilterReset,
  modeFilters,
  onModeFilterChange,
  onModeFilterReset,
  onViewRawJson,
  onViewTraces,
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
        <Group gap={2}>
          <Text fw={500} size="sm">
            {rolloutId}
          </Text>
          <CopyButton value={rolloutId}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? 'Copied' : 'Copy'} withArrow>
                <ActionIcon
                  aria-label={`Copy rollout ID ${rolloutId}`}
                  variant="subtle"
                  color={copied ? 'teal' : 'gray'}
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    copy();
                  }}
                >
                  {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
        </Group>
      ),
      width: '10em',
    },
    {
      accessor: 'attemptId',
      title: 'Attempt',
      sortable: true,
      render: ({ attemptId, attemptSequence, isNested }) => (
        <Group gap={2}>
          <Text size="sm" c={attemptId ? undefined : 'dimmed'}>
            {attemptId ?? 'N/A'}
          </Text>
          {attemptId && (
            <CopyButton value={attemptId}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? 'Copied' : 'Copy'} withArrow>
                  <ActionIcon
                    aria-label={`Copy attempt ID ${attemptId}`}
                    variant="subtle"
                    color={copied ? 'teal' : 'gray'}
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      copy();
                    }}
                  >
                    {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
          )}
          {attemptSequence && (isNested || attemptSequence > 1) && (
            <Badge leftSection={<IconReload size={12} />} pl={6} pr={6}>
              {attemptSequence}
            </Badge>
          )}
        </Group>
      ),
      width: '12em',
    },
    {
      accessor: 'inputText',
      title: 'Input',
      render: ({ inputText }) => (
        <Text size="sm" ff="monospace" c="dimmed" lineClamp={1} style={{ width: '100%' }}>
          {inputText}
        </Text>
      ),
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
                —
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
      textAlign: 'left',
      width: '12em',
      render: ({ startTimestamp }) => <Text size="sm">{formatDateTime(startTimestamp)}</Text>,
    },
    {
      accessor: 'durationSeconds',
      title: 'Duration',
      sortable: true,
      textAlign: 'left',
      width: '10em',
      render: ({ durationSeconds }) => <Text size="sm">{formatDuration(durationSeconds)}</Text>,
    },
    {
      accessor: 'lastHeartbeatTimestamp',
      title: 'Last Heartbeat',
      sortable: true,
      textAlign: 'left',
      width: '10em',
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
      title: 'Worker',
      sortable: true,
      width: '10em',
      render: ({ workerId }) => (
        <Text size="sm" c={workerId ? undefined : 'dimmed'}>
          {workerId ?? 'N/A'}
        </Text>
      ),
    },
    {
      accessor: 'actionsPlaceholder',
      title: 'Actions',
      width: '6.5em',
      render: (record) => (
        <Group gap={4}>
          <Tooltip label="View raw JSON" withArrow disabled={!onViewRawJson}>
            <ActionIcon
              aria-label="View raw JSON"
              variant="subtle"
              color="gray"
              onClick={(event) => {
                event.stopPropagation();
                onViewRawJson?.(record);
              }}
            >
              <IconBraces size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="View traces" withArrow disabled={!onViewTraces}>
            <ActionIcon
              aria-label="View traces"
              variant="subtle"
              color="gray"
              onClick={(event) => {
                event.stopPropagation();
                onViewTraces?.(record);
              }}
            >
              <IconTimeline size={16} />
            </ActionIcon>
          </Tooltip>
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
  onViewRawJson?: (record: RolloutTableRecord) => void;
  onViewTraces?: (record: RolloutTableRecord) => void;
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
  onViewRawJson,
  onViewTraces,
  recordsPerPageOptions = DEFAULT_RECORDS_PER_PAGE_OPTIONS,
  renderRowExpansion,
}: RolloutTableProps) {
  const [expandedRecordIds, setExpandedRecordIds] = useState<string[]>([]);
  const { ref: tableContainerRef, width: containerWidth } = useElementSize();

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
        onViewRawJson,
        onViewTraces,
      }),
    [
      statusFilters,
      onStatusFilterChange,
      onStatusFilterReset,
      modeFilters,
      onModeFilterChange,
      onModeFilterReset,
      onViewRawJson,
      onViewTraces,
    ]
  );

  const responsiveColumns = useMemo(() => {
    const measuredWidth = containerWidth ? Math.max(containerWidth - 48, 0) : Number.POSITIVE_INFINITY;

    const columnEntries = columns.map((column, index) => {
      const accessorKey = String(column.accessor);
      const config = COLUMN_VISIBILITY[accessorKey] ?? { minWidth: 160, priority: 3 };
      return {
        column,
        index,
        accessorKey,
        ...config,
      };
    });

    const sortedByPriority = columnEntries
      .slice()
      .sort((a, b) =>
        a.priority === b.priority ? a.index - b.index : a.priority - b.priority
      );

    const visibleColumnIndices = new Set<number>();
    let usedWidth = 0;

    sortedByPriority.forEach((entry) => {
      if (entry.priority === 0) {
        visibleColumnIndices.add(entry.index);
        usedWidth += entry.minWidth;
      }
    });

    sortedByPriority.forEach((entry) => {
      if (visibleColumnIndices.has(entry.index)) {
        return;
      }
      if (usedWidth + entry.minWidth <= measuredWidth) {
        visibleColumnIndices.add(entry.index);
        usedWidth += entry.minWidth;
      }
    });

    return columnEntries.map(({ column, index }) => ({
      ...column,
      hidden: !visibleColumnIndices.has(index),
    }));
  }, [columns, containerWidth]);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const includeStatuses = statusFilters.length > 0 ? statusFilters : undefined;
    const includeModes = modeFilters.length > 0 ? modeFilters : undefined;

    return rolloutRecords.filter((record) => {
      const matchesSearch =
        normalizedSearch.length === 0 || record.rolloutId.toLowerCase().includes(normalizedSearch);
      const matchesStatus = !includeStatuses || includeStatuses.includes(record.status);
      const matchesMode =
        !includeModes || (record.mode !== null && includeModes.includes(record.mode));

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
      current.filter((id) =>
        paginatedRecords.some((record) => record.rolloutId === id && record.canExpand)
      )
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
    [onSortStatusChange]
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
        <Button
          size="xs"
          variant="light"
          leftSection={<IconRefresh size={14} />}
          onClick={onRefetch}
        >
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
            <Button
              size="xs"
              variant="light"
              leftSection={<IconRefresh size={14} />}
              onClick={onRefetch}
            >
              Retry
            </Button>
          </Group>
        </Alert>
      ) : null}

      {!isError || totalRecords > 0 ? (
        <Box ref={tableContainerRef}>
          <DataTable<RolloutTableRecord>
            classNames={{ root: 'rollouts-table' }}
            withTableBorder
            withColumnBorders
            highlightOnHover
            verticalAlign="center"
            minHeight={paginatedRecords.length === 0 ? 320 : undefined}
            idAccessor="rolloutId"
            records={paginatedRecords}
            columns={responsiveColumns}
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
                              : ((nextRecordIds ?? []) as (string | number)[]);
                          return resolved
                            .map(String)
                            .filter((id) =>
                              paginatedRecords.some(
                                (tableRecord) => tableRecord.rolloutId === id && tableRecord.canExpand
                              )
                            );
                        });
                      },
                    },
                    content: ({ record }) =>
                      renderRowExpansion({ rollout: record, columns: responsiveColumns }),
                  }
                : undefined
            }
          />
        </Box>
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
    return attempts
      .map((attempt) => buildAttemptRecord(rollout, attempt))
      .sort((a, b) => (b.attemptSequence ?? 0) - (a.attemptSequence ?? 0))
      .filter((record) => record.attemptSequence !== rollout.attempt?.sequenceId);
  }, [attempts, rollout]);

  if (isError && !attemptRecords.length) {
    return (
      <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />}>
        <Stack gap="xs">
          <Text size="sm">Unable to load attempts for this rollout.</Text>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconRefresh size={14} />}
            onClick={onRetry}
          >
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
      verticalAlign="center"
      fetching={isFetching}
      loaderSize="sm"
      records={attemptRecords}
      columns={columns}
      emptyState={attemptRecords.length === 0 ? emptyState : undefined}
    />
  );
}
