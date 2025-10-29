import { PayloadAction, createSlice } from '@reduxjs/toolkit';

export type ThemePreference = 'light' | 'dark' | 'system';

export type ConfigState = {
  baseUrl: string;
  autoRefreshMs: number;
  theme: ThemePreference;
};

const initialState: ConfigState = {
  baseUrl: typeof window !== 'undefined' ? window.location.origin : '',
  autoRefreshMs: 0,
  theme: 'system',
};

const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    setBaseUrl(state, action: PayloadAction<string>) {
      state.baseUrl = action.payload;
    },
    setAutoRefreshMs(state, action: PayloadAction<number>) {
      state.autoRefreshMs = action.payload;
    },
    setTheme(state, action: PayloadAction<ThemePreference>) {
      state.theme = action.payload;
    },
  },
});

export const { setAutoRefreshMs, setBaseUrl, setTheme } = configSlice.actions;

export const configReducer = configSlice.reducer;

