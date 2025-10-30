import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import { createApi, fetchBaseQuery, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { RootState } from '@/store';
import type { Attempt, Rollout } from '../../types';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/',
});

const buildAbsoluteUrl = (baseUrl: string, path: string) => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const normalizedPath = path.replace(/^\/+/, '');
  if (!normalizedBase) {
    return `/${normalizedPath}`;
  }
  return `${normalizedBase}/${normalizedPath}`;
};

const dynamicBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const state = api.getState() as RootState;
  const stateBaseUrl = state.config?.baseUrl;
  const fallbackBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const baseUrl = stateBaseUrl && stateBaseUrl.trim().length > 0 ? stateBaseUrl : fallbackBaseUrl;
  const preparedArgs: FetchArgs =
    typeof args === 'string'
      ? { url: args }
      : {
          ...args,
          url: args.url ?? '',
        };

  const absoluteUrl = buildAbsoluteUrl(baseUrl, preparedArgs.url ?? '');
  return rawBaseQuery({ ...preparedArgs, url: absoluteUrl }, api, extraOptions);
};

export const rolloutsApi = createApi({
  reducerPath: 'rolloutsApi',
  baseQuery: dynamicBaseQuery,
  tagTypes: ['Rollout'],
  endpoints: (builder) => ({
    getRollouts: builder.query<Rollout[], void>({
      query: () => ({ url: 'rollouts', method: 'GET' }),
      providesTags: (result) =>
        result
          ? [
              { type: 'Rollout' as const, id: 'LIST' },
              ...result.map((rollout) => ({ type: 'Rollout' as const, id: rollout.rollout_id })),
            ]
          : [{ type: 'Rollout' as const, id: 'LIST' }],
    }),
    getRolloutAttempts: builder.query<Attempt[], string>({
      query: (rolloutId) => ({ url: `rollouts/${rolloutId}/attempts`, method: 'GET' }),
      providesTags: (_result, _error, rolloutId) => [{ type: 'Rollout', id: rolloutId }],
    }),
  }),
});

export const { useGetRolloutsQuery, useGetRolloutAttemptsQuery } = rolloutsApi;
