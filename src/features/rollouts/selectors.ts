import type { RootState } from '@/store';

export const selectRolloutsUiState = (state: RootState) => state.rollouts;
export const selectRolloutsSearchTerm = (state: RootState) => state.rollouts.searchTerm;
export const selectRolloutsStatusFilters = (state: RootState) => state.rollouts.statusFilters;
export const selectRolloutsModeFilters = (state: RootState) => state.rollouts.modeFilters;
export const selectRolloutsPage = (state: RootState) => state.rollouts.page;
export const selectRolloutsRecordsPerPage = (state: RootState) => state.rollouts.recordsPerPage;
export const selectRolloutsSort = (state: RootState) => state.rollouts.sort;
