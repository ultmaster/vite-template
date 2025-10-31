import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Attempt, Rollout } from '@/types';

export type DrawerType = 'rollout-json' | 'rollout-traces';

export type DrawerContent = {
  type: DrawerType;
  rollout: Rollout;
  attempt: Attempt | null;
  isNested: boolean;
};

export type DrawerState = {
  isOpen: boolean;
  content: DrawerContent | null;
};

export const initialDrawerState: DrawerState = {
  isOpen: false,
  content: null,
};

const drawerSlice = createSlice({
  name: 'drawer',
  initialState: initialDrawerState,
  reducers: {
    openDrawer(state, action: PayloadAction<DrawerContent>) {
      state.isOpen = true;
      state.content = action.payload;
    },
    closeDrawer(state) {
      state.isOpen = false;
      state.content = null;
    },
  },
});

export const { openDrawer, closeDrawer } = drawerSlice.actions;

export const drawerReducer = drawerSlice.reducer;
