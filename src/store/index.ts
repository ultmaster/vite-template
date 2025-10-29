import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { configReducer } from '../features/config';

const rootReducer = combineReducers({
  config: configReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export const createAppStore = (preloadedState?: Partial<RootState>) =>
  configureStore({
    reducer: rootReducer,
    preloadedState,
  });

export const store = createAppStore();

export type AppStore = ReturnType<typeof createAppStore>;
export type AppDispatch = AppStore['dispatch'];
