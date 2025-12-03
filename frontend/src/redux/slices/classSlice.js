import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedClass: null,
  activeSession: null,
  joinRequests: [],
  notifications: [],
  filters: {
    classType: "all",
    role: "all",
  },
};

const classSlice = createSlice({
  name: "class",
  initialState,
  reducers: {
    setSelectedClass: (state, action) => {
      state.selectedClass = action.payload;
    },
    clearSelectedClass: (state) => {
      state.selectedClass = null;
    },
    setActiveSession: (state, action) => {
      state.activeSession = action.payload;
    },
    clearActiveSession: (state) => {
      state.activeSession = null;
    },
    addNotification: (state, action) => {
      state.notifications.unshift(action.payload);
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter((notification) => notification.id !== action.payload);
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    updateJoinRequests: (state, action) => {
      state.joinRequests = action.payload;
    },
  },
});

export const {
  setSelectedClass,
  clearSelectedClass,
  setActiveSession,
  clearActiveSession,
  addNotification,
  removeNotification,
  clearNotifications,
  setFilters,
  updateJoinRequests,
} = classSlice.actions;

export default classSlice.reducer;

// Selectors with defensive checks
export const selectSelectedClass = (state) => state.class?.selectedClass || null;
export const selectActiveSession = (state) => state.class?.activeSession || null;
export const selectNotifications = (state) => state.class?.notifications || [];
export const selectFilters = (state) => state.class?.filters || initialState.filters;
export const selectJoinRequests = (state) => state.class?.joinRequests || [];