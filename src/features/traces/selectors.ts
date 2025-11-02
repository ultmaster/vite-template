import type { RootState } from '@/store';

export const selectTracesState = (state: RootState) => state.traces;

export const selectTracesRolloutId = (state: RootState) => selectTracesState(state).rolloutId;

export const selectTracesAttemptId = (state: RootState) => selectTracesState(state).attemptId;

export const selectTracesSearchTerm = (state: RootState) => selectTracesState(state).searchTerm;

export const selectTracesPage = (state: RootState) => selectTracesState(state).page;

export const selectTracesRecordsPerPage = (state: RootState) => selectTracesState(state).recordsPerPage;

export const selectTracesSort = (state: RootState) => selectTracesState(state).sort;

export const selectTracesViewMode = (state: RootState) => selectTracesState(state).viewMode;
