import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useElementSize } from '@mantine/hooks';
import {
  IconAlertCircle,
  IconBraces,
  IconCheck,
  IconCopy,
  IconFileText,
  IconRefresh,
} from '@tabler/icons-react';
import { DataTable, type DataTableColumn, type DataTableSortStatus } from 'mantine-datatable';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  CopyButton,
  Group,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import type { Span } from '@/types';
import { formatDateTime, formatDuration, toTimestamp } from '@/utils/format';

const DEFAULT_RECORDS_PER_PAGE_OPTIONS = [50, 100, 200, 500];

type ColumnVisibilityConfig = {
  minWidth: number;
  priority: number;
};

const COLUMN_VISIBILITY: Record<string, ColumnVisibilityConfig> = {
  traceId: { minWidth: 180, priority: 1 },
  spanId: { minWidth: 180, priority: 1 },
  parentId: { minWidth: 180, priority: 2 },
  name: { minWidth: 200, priority: 0 },
  statusCode: { minWidth: 120, priority: 1 },
  attributeKeys: { minWidth: 200, priority: 2 },
  startTime: { minWidth: 180, priority: 2 },
  duration: { minWidth: 120, priority: 2 },
  actionsPlaceholder: { minWidth: 120, priority: 0 },
};

const STATUS_COLORS: Record<string, string> = {
  UNSET: 'gray',
  OK: 'teal',
  ERROR: 'red',
};

export type TracesTableRecord = Span & {
  statusCode: string;
  attributeKeys: string;
  duration: number;
  actionsPlaceholder?: null;
};

export function buildTraceRecord(span: Span): TracesTableRecord {
  const statusCode = span.status.status_code;
  const attributeKeys = Object.keys(span.attributes ?? {}).join(', ') || 'N/A';
  const startTimestamp = toTimestamp(span.startTime);
  const endTimestamp = toTimestamp(span.endTime);
  const duration = endTimestamp && startTimestamp ? endTimestamp - startTimestamp : 0;

  return {
    ...span,
    statusCode,
    attributeKeys,
    duration,
    actionsPlaceholder: null,
  };
}

type TracesColumnsOptions = {
  onShowRollout?: (record: TracesTableRecord) => void;
  onShowSpanDetail?: (record: TracesTableRecord) => void;
  onParentIdClick?: (parentId: string) => void;
  spanIds: Set<string>;
};

function createTracesColumns({
  onShowRollout,
  onShowSpanDetail,
  onParentIdClick,
  spanIds,
}: TracesColumnsOptions): DataTableColumn<TracesTableRecord>[] {
  return [
    {
      accessor: 'traceId',
      title: 'Trace ID',
      sortable: true,
      render: ({ traceId }) => (
        <Group gap={2}>
          <Text size="sm" ff="monospace">
            {traceId.slice(0, 8)}...
          </Text>
          <CopyButton value={traceId}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? 'Copied' : 'Copy'} withArrow>
                <ActionIcon
                  aria-label={`Copy trace ID ${traceId}`}
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
      width: '11em',
    },
    {
      accessor: 'spanId',
      title: 'Span ID',
      sortable: true,
      render: ({ spanId }) => (
        <Group gap={2}>
          <Text size="sm" ff="monospace">
            {spanId.slice(0, 8)}...
          </Text>
          <CopyButton value={spanId}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? 'Copied' : 'Copy'} withArrow>
                <ActionIcon
                  aria-label={`Copy span ID ${spanId}`}
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
      width: '11em',
    },
    {
      accessor: 'parentId',
      title: 'Parent ID',
      sortable: true,
      render: ({ parentId }) => {
        if (!parentId) {
          return (
            <Text size="sm" c="dimmed">
              N/A
            </Text>
          );
        }

        const parentExists = spanIds.has(parentId);

        return (
          <Group gap={2}>
            <Text
              size="sm"
              ff="monospace"
              c={parentExists ? undefined : 'red'}
              style={{ cursor: parentExists ? 'pointer' : undefined }}
              onClick={(event) => {
                if (parentExists) {
                  event.stopPropagation();
                  onParentIdClick?.(parentId);
                }
              }}
            >
              {parentId.slice(0, 8)}...
            </Text>
            {!parentExists && (
              <Tooltip label="Parent span not found in table" withArrow>
                <IconAlertCircle size={14} color="red" />
              </Tooltip>
            )}
          </Group>
        );
      },
      width: '11em',
    },
    {
      accessor: 'name',
      title: 'Name',
      sortable: true,
      render: ({ name }) => (
        <Text size="sm" fw={500}>
          {name}
        </Text>
      ),
    },
    {
      accessor: 'statusCode',
      title: 'Status',
      sortable: true,
      width: '8em',
      render: ({ statusCode }) => (
        <Badge size="sm" variant="light" color={STATUS_COLORS[statusCode] ?? 'gray'}>
          {statusCode}
        </Badge>
      ),
    },
    {
      accessor: 'attributeKeys',
      title: 'Attribute Keys',
      render: ({ attributeKeys }) => (
        <Text size="sm" c="dimmed" lineClamp={1}>
          {attributeKeys}
        </Text>
      ),
    },
    {
      accessor: 'startTime',
      title: 'Start Time',
      sortable: true,
      textAlign: 'left',
      width: '12em',
      render: ({ startTime }) => <Text size="sm">{formatDateTime(toTimestamp(startTime))}</Text>,
    },
    {
      accessor: 'duration',
      title: 'Duration',
      sortable: true,
      textAlign: 'left',
      width: '10em',
      render: ({ duration }) => <Text size="sm">{formatDuration(duration)}</Text>,
    },
    {
      accessor: 'actionsPlaceholder',
      title: 'Actions',
      width: '7em',
      render: (record) => (
        <Group gap={4}>
          <Tooltip label="Show rollout" withArrow disabled={!onShowRollout}>
            <ActionIcon
              aria-label="Show rollout"
              variant="subtle"
              color="gray"
              onClick={(event) => {
                event.stopPropagation();
                onShowRollout?.(record);
              }}
            >
              <IconFileText size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Show span detail" withArrow disabled={!onShowSpanDetail}>
            <ActionIcon
              aria-label="Show span detail"
              variant="subtle"
              color="gray"
              onClick={(event) => {
                event.stopPropagation();
                onShowSpanDetail?.(record);
              }}
            >
              <IconBraces size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ),
    },
  ];
}

type ComparatorKey = keyof Pick<
  TracesTableRecord,
  'traceId' | 'spanId' | 'parentId' | 'name' | 'statusCode' | 'startTime' | 'duration'
>;

function compareRecords(a: TracesTableRecord, b: TracesTableRecord, key: ComparatorKey): number {
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

export type TracesTableProps = {
  spans: Span[] | undefined;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  searchTerm: string;
  sort: { column: string; direction: 'asc' | 'desc' };
  page: number;
  recordsPerPage: number;
  onSortStatusChange: (status: DataTableSortStatus<TracesTableRecord>) => void;
  onPageChange: (page: number) => void;
  onRecordsPerPageChange: (value: number) => void;
  onResetFilters: () => void;
  onRefetch: () => void;
  onShowRollout?: (record: TracesTableRecord) => void;
  onShowSpanDetail?: (record: TracesTableRecord) => void;
  onParentIdClick?: (parentId: string) => void;
  recordsPerPageOptions?: number[];
};

export function TracesTable({
  spans,
  isFetching,
  isError,
  error,
  searchTerm,
  sort,
  page,
  recordsPerPage,
  onSortStatusChange,
  onPageChange,
  onRecordsPerPageChange,
  onResetFilters,
  onRefetch,
  onShowRollout,
  onShowSpanDetail,
  onParentIdClick,
  recordsPerPageOptions = DEFAULT_RECORDS_PER_PAGE_OPTIONS,
}: TracesTableProps) {
  const { ref: tableContainerRef, width: containerWidth } = useElementSize();

  const traceRecords = useMemo<TracesTableRecord[]>(() => {
    if (!spans) {
      return [];
    }
    return spans.map((span) => buildTraceRecord(span));
  }, [spans]);

  const spanIds = useMemo(() => {
    return new Set(traceRecords.map((record) => record.spanId));
  }, [traceRecords]);

  const columns = useMemo(
    () =>
      createTracesColumns({
        onShowRollout,
        onShowSpanDetail,
        onParentIdClick,
        spanIds,
      }),
    [onShowRollout, onShowSpanDetail, onParentIdClick, spanIds]
  );

  const responsiveColumns = useMemo(() => {
    const measuredWidth = containerWidth
      ? Math.max(containerWidth - 48, 0)
      : Number.POSITIVE_INFINITY;

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

    return traceRecords.filter((record) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        record.traceId.toLowerCase().includes(normalizedSearch) ||
        record.spanId.toLowerCase().includes(normalizedSearch) ||
        record.name.toLowerCase().includes(normalizedSearch);

      return matchesSearch;
    });
  }, [traceRecords, searchTerm]);

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

  const hasActiveFilters = searchTerm.trim().length > 0;

  const sortStatus: DataTableSortStatus<TracesTableRecord> = {
    columnAccessor: sort.column,
    direction: sort.direction,
  };

  const handleSortStatusChange = useCallback(
    (status: DataTableSortStatus<TracesTableRecord>) => {
      onSortStatusChange(status);
    },
    [onSortStatusChange]
  );

  const errorMessage =
    isError && error && typeof error === 'object' && 'status' in (error as Record<string, unknown>)
      ? `Traces are temporarily unavailable (status: ${String((error as Record<string, unknown>).status)}).`
      : 'Traces are temporarily unavailable.';

  const emptyState = (
    <Stack gap="sm" align="center" py="lg">
      {isError ? (
        <>
          <Text fw={600} size="sm">
            {errorMessage}
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            Use the retry button to try again, or adjust the filters to broaden the results.
          </Text>
          <Group gap="xs">
            <Button
              size="xs"
              variant="light"
              color="gray"
              leftSection={<IconRefresh size={14} />}
              onClick={onRefetch}
            >
              Retry
            </Button>
            {hasActiveFilters ? (
              <Button size="xs" variant="subtle" onClick={onResetFilters}>
                Clear filters
              </Button>
            ) : null}
          </Group>
        </>
      ) : (
        <>
          <Text fw={600} size="sm">
            No traces found
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            {hasActiveFilters
              ? 'Try adjusting the search to see more results.'
              : 'Try refreshing to fetch the latest traces.'}
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
        </>
      )}
    </Stack>
  );

  return (
    <Box ref={tableContainerRef}>
      <DataTable<TracesTableRecord>
        classNames={{ root: 'traces-table' }}
        withTableBorder
        withColumnBorders
        highlightOnHover
        verticalAlign="center"
        minHeight={paginatedRecords.length === 0 ? 500 : undefined}
        idAccessor="spanId"
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
        fetching={isFetching}
        loaderSize="sm"
        emptyState={paginatedRecords.length === 0 ? emptyState : undefined}
      />
    </Box>
  );
}
