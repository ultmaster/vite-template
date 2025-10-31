import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import { createApi, fetchBaseQuery, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { RootState } from '@/store';
import { camelCaseKeys } from '@/utils/format';
import type { Attempt, Rollout, Timestamp } from '../../types';

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

const normalizeHeartbeat = (
  attempt: Partial<Attempt> & { lastHeartbeatTime?: Timestamp | null; lastHeartBeatTime?: Timestamp | null },
): Timestamp | null => {
  if (typeof attempt.lastHeartbeatTime === 'number') {
    return attempt.lastHeartbeatTime;
  }

  if (typeof attempt.lastHeartBeatTime === 'number') {
    return attempt.lastHeartBeatTime;
  }

  if (typeof attempt.startTime === 'number') {
    return attempt.startTime;
  }

  return null;
};

const normalizeAttempt = (value: unknown): Attempt | null => {
  if (value === null || typeof value === 'undefined') {
    return null;
  }

  const camelized = camelCaseKeys(value) as Attempt & {
    lastHeartbeatTime?: Timestamp | null;
    lastHeartBeatTime?: Timestamp | null;
  };
  const { lastHeartbeatTime, lastHeartBeatTime, ...rest } = camelized;

  return {
    ...rest,
    lastHeartbeatTime: normalizeHeartbeat({ ...rest, lastHeartbeatTime, lastHeartBeatTime }),
  };
};

const normalizeAttemptStrict = (value: unknown): Attempt => {
  const normalized = normalizeAttempt(value);
  if (!normalized) {
    throw new Error('Expected attempt payload');
  }
  return normalized;
};

const normalizeRollout = (value: unknown): Rollout => {
  const camelized = camelCaseKeys(value) as Rollout & { attempt?: unknown };
  const { attempt, ...rest } = camelized;

  return {
    ...rest,
    attempt: normalizeAttempt(attempt),
  };
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
      transformResponse: (response: unknown) => {
        if (!Array.isArray(response)) {
          throw new Error('Expected rollouts list payload');
        }

        return response.map((rollout) => normalizeRollout(rollout));
      },
      providesTags: (result) =>
        result
          ? [
              { type: 'Rollout' as const, id: 'LIST' },
              ...result.map((rollout) => ({ type: 'Rollout' as const, id: rollout.rolloutId })),
            ]
          : [{ type: 'Rollout' as const, id: 'LIST' }],
    }),
    getRolloutAttempts: builder.query<Attempt[], string>({
      query: (rolloutId) => ({ url: `rollouts/${rolloutId}/attempts`, method: 'GET' }),
      transformResponse: (response: unknown) => {
        if (!Array.isArray(response)) {
          throw new Error('Expected attempts list payload');
        }

        return response.map((attempt) => normalizeAttemptStrict(attempt));
      },
      providesTags: (_result, _error, rolloutId) => [{ type: 'Rollout', id: rolloutId }],
    }),
  }),
});

export const { useGetRolloutsQuery, useGetRolloutAttemptsQuery } = rolloutsApi;
