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
  IconCheck,
  IconCopy,
  IconRefresh,
} from '@tabler/icons-react';
import { DataTable, type DataTableColumn, type DataTableSortStatus } from 'mantine-datatable';
import {
  ActionIcon,
  Box,
  Button,
  CopyButton,
  Group,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import type { Resources } from '@/types';
import { safeStringify } from '@/utils/format';
import {
  compareRecords,
  createResponsiveColumns,
  type ColumnVisibilityConfig,
} from '@/utils/table';

const DEFAULT_RECORDS_PER_PAGE_OPTIONS = [50, 100, 200, 500];

const COLUMN_VISIBILITY: Record<string, ColumnVisibilityConfig> = {
  resourcesId: { minWidth: 200, priority: 0 },
  resourceCount: { minWidth: 150, priority: 2 },
  resourcesPreview: { minWidth: 250, priority: 1 },
};

export type ResourcesTableRecord = Resources & {
  resourceCount: number;
  canExpand: boolean;
  resourcesPreview: string;
};

function buildResourcesRecord(resources: Resources): ResourcesTableRecord {
  const resourceCount = Object.keys(resources.resources ?? {}).length;
  const resourcesValue =
    resources.resources === null || typeof resources.resources === 'undefined'
      ? '—'
      : typeof resources.resources === 'string'
        ? resources.resources
        : safeStringify(resources.resources);

  return {
    ...resources,
    resourceCount,
    canExpand: resourceCount > 0,
    resourcesPreview: resourcesValue,
  };
}

type ResourcesColumnsOptions = Record<string, never>;

function createResourcesColumns(_options: ResourcesColumnsOptions): DataTableColumn<ResourcesTableRecord>[] {
  return [
    {
      accessor: 'resourcesId',
      title: 'Resources ID',
      sortable: true,
      render: ({ resourcesId }) => (
        <Group gap={2}>
          <Text fw={500} size="sm">
            {resourcesId}
          </Text>
          <CopyButton value={resourcesId}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? 'Copied' : 'Copy'} withArrow>
                <ActionIcon
                  aria-label={`Copy resources ID ${resourcesId}`}
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
      width: '12em',
    },
    {
      accessor: 'resourceCount',
      title: 'Count',
      sortable: true,
      textAlign: 'left',
      width: '8em',
      render: ({ resourceCount }) => <Text size="sm">{resourceCount}</Text>,
    },
    {
      accessor: 'resourcesPreview',
      title: 'Preview',
      render: ({ resourcesPreview }) => (
        <Text size="sm" ff="monospace" c="dimmed" lineClamp={1} style={{ width: '100%' }}>
          {resourcesPreview}
        </Text>
      ),
    },
  ];
}

type ComparatorKey = keyof Pick<ResourcesTableRecord, 'resourcesId' | 'resourceCount'>;

type RowExpansionRenderer = (context: {
  resources: Resources;
  columns: DataTableColumn<ResourcesTableRecord>[];
}) => ReactNode;

export type ResourcesTableProps = {
  resourcesList: Resources[] | undefined;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  searchTerm: string;
  sort: { column: string; direction: 'asc' | 'desc' };
  page: number;
  recordsPerPage: number;
  onSortStatusChange: (status: DataTableSortStatus<ResourcesTableRecord>) => void;
  onPageChange: (page: number) => void;
  onRecordsPerPageChange: (value: number) => void;
  onResetFilters: () => void;
  onRefetch: () => void;
  recordsPerPageOptions?: number[];
  renderRowExpansion?: RowExpansionRenderer;
};

export function ResourcesTable({
  resourcesList,
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
  recordsPerPageOptions = DEFAULT_RECORDS_PER_PAGE_OPTIONS,
  renderRowExpansion,
}: ResourcesTableProps) {
  const [expandedRecordIds, setExpandedRecordIds] = useState<string[]>([]);
  const { ref: tableContainerRef, width: containerWidth } = useElementSize();

  const resourcesRecords = useMemo<ResourcesTableRecord[]>(() => {
    if (!resourcesList) {
      return [];
    }
    return resourcesList.map((resourcesItem) => buildResourcesRecord(resourcesItem));
  }, [resourcesList]);

  const columns = useMemo(() => createResourcesColumns({}), []);

  const responsiveColumns = useMemo(
    () => createResponsiveColumns(columns, containerWidth, COLUMN_VISIBILITY),
    [columns, containerWidth]
  );

  const filteredRecords = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return resourcesRecords.filter((record) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        record.resourcesId.toLowerCase().includes(normalizedSearch);

      return matchesSearch;
    });
  }, [resourcesRecords, searchTerm]);

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
        paginatedRecords.some((record) => record.resourcesId === id && record.canExpand)
      )
    );
  }, [paginatedRecords]);

  const hasActiveFilters = searchTerm.trim().length > 0;

  const sortStatus: DataTableSortStatus<ResourcesTableRecord> = {
    columnAccessor: sort.column,
    direction: sort.direction,
  };

  const handleSortStatusChange = useCallback(
    (status: DataTableSortStatus<ResourcesTableRecord>) => {
      onSortStatusChange(status);
    },
    [onSortStatusChange]
  );

  const errorMessage =
    isError && error && typeof error === 'object' && 'status' in (error as Record<string, unknown>)
      ? `Resources are temporarily unavailable (status: ${String((error as Record<string, unknown>).status)}).`
      : 'Resources are temporarily unavailable.';

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
            No resources found
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            {hasActiveFilters
              ? 'Try adjusting the search to see more results.'
              : 'Try refreshing to fetch the latest resources.'}
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
      <DataTable<ResourcesTableRecord>
        classNames={{ root: 'resources-table' }}
        withTableBorder
        withColumnBorders
        highlightOnHover
        verticalAlign="center"
        minHeight={paginatedRecords.length === 0 ? 500 : undefined}
        idAccessor="resourcesId"
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
                            (tableRecord) => tableRecord.resourcesId === id && tableRecord.canExpand
                          )
                        );
                    });
                  },
                },
                content: ({ record }) =>
                  renderRowExpansion({ resources: record, columns: responsiveColumns }),
              }
            : undefined
        }
      />
    </Box>
  );
}
