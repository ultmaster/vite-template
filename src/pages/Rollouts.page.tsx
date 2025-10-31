import { useCallback } from 'react';
import type { DataTableColumn, DataTableSortStatus } from 'mantine-datatable';

import { RolloutAttemptsTable, RolloutTable, type RolloutTableRecord } from '@/components/RolloutTable.component';
import { selectAutoRefreshMs } from '@/features/config';
import {
  type Rollout,
  type RolloutMode,
  type RolloutStatus,
  resetRolloutsFilters,
  selectRolloutsModeFilters,
  selectRolloutsPage,
  selectRolloutsRecordsPerPage,
  selectRolloutsSearchTerm,
  selectRolloutsSort,
  selectRolloutsStatusFilters,
  setRolloutsModeFilters,
  setRolloutsPage,
  setRolloutsRecordsPerPage,
  setRolloutsSearchTerm,
  setRolloutsSort,
  setRolloutsStatusFilters,
  useGetRolloutAttemptsQuery,
  useGetRolloutsQuery,
} from '@/features/rollouts';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

function RolloutAttemptsContent({
  rollout,
  columns,
}: {
  rollout: Rollout;
  columns: DataTableColumn<RolloutTableRecord>[];
}) {
  const { data, isFetching, isError, refetch } = useGetRolloutAttemptsQuery(rollout.rolloutId);

  return (
    <RolloutAttemptsTable
      rollout={rollout}
      attempts={data}
      isFetching={isFetching}
      isError={isError}
      onRetry={refetch}
      columns={columns}
    />
  );
}

export function RolloutsPage() {
  const dispatch = useAppDispatch();
  const autoRefreshMs = useAppSelector(selectAutoRefreshMs);
  const searchTerm = useAppSelector(selectRolloutsSearchTerm);
  const statusFilters = useAppSelector(selectRolloutsStatusFilters);
  const modeFilters = useAppSelector(selectRolloutsModeFilters);
  const page = useAppSelector(selectRolloutsPage);
  const recordsPerPage = useAppSelector(selectRolloutsRecordsPerPage);
  const sort = useAppSelector(selectRolloutsSort);

  const {
    data: rolloutsData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetRolloutsQuery(undefined, {
    pollingInterval: autoRefreshMs > 0 ? autoRefreshMs : undefined,
  });

  const handleSearchTermChange = useCallback(
    (value: string) => {
      dispatch(setRolloutsSearchTerm(value));
    },
    [dispatch],
  );

  const handleStatusFilterChange = useCallback(
    (values: RolloutStatus[]) => {
      dispatch(setRolloutsStatusFilters(values));
    },
    [dispatch],
  );

  const handleStatusFilterReset = useCallback(() => {
    dispatch(setRolloutsStatusFilters([]));
  }, [dispatch]);

  const handleModeFilterChange = useCallback(
    (values: RolloutMode[]) => {
      dispatch(setRolloutsModeFilters(values));
    },
    [dispatch],
  );

  const handleModeFilterReset = useCallback(() => {
    dispatch(setRolloutsModeFilters([]));
  }, [dispatch]);

  const handleSortStatusChange = useCallback(
    (status: DataTableSortStatus<RolloutTableRecord>) => {
      dispatch(
        setRolloutsSort({
          column: status.columnAccessor as string,
          direction: status.direction,
        }),
      );
    },
    [dispatch],
  );

  const handlePageChange = useCallback(
    (nextPage: number) => {
      dispatch(setRolloutsPage(nextPage));
    },
    [dispatch],
  );

  const handleRecordsPerPageChange = useCallback(
    (value: number) => {
      dispatch(setRolloutsRecordsPerPage(value));
    },
    [dispatch],
  );

  const handleResetFilters = useCallback(() => {
    dispatch(resetRolloutsFilters());
  }, [dispatch]);

  return (
    <RolloutTable
      rollouts={rolloutsData}
      isLoading={isLoading}
      isFetching={isFetching}
      isError={isError}
      error={error}
      searchTerm={searchTerm}
      statusFilters={statusFilters}
      modeFilters={modeFilters}
      sort={sort}
      page={page}
      recordsPerPage={recordsPerPage}
      onSearchTermChange={handleSearchTermChange}
      onStatusFilterChange={handleStatusFilterChange}
      onStatusFilterReset={handleStatusFilterReset}
      onModeFilterChange={handleModeFilterChange}
      onModeFilterReset={handleModeFilterReset}
      onSortStatusChange={handleSortStatusChange}
      onPageChange={handlePageChange}
      onRecordsPerPageChange={handleRecordsPerPageChange}
      onResetFilters={handleResetFilters}
      onRefetch={refetch}
      renderRowExpansion={({ rollout, columns }) => <RolloutAttemptsContent rollout={rollout} columns={columns} />}
    />
  );
}
