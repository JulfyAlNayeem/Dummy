import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import { socialApi } from './api/socialApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [socialApi.reducerPath]: socialApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(socialApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
