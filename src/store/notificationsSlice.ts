import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Notification } from "../types";

interface NotificationsState {
  items: Notification[];
  unreadCount: number;
  isOpen: boolean;
}

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
  isOpen: false,
};

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    setNotifications(state, action: PayloadAction<Notification[]>) {
      state.items = action.payload;
    },
    addNotification(state, action: PayloadAction<Notification>) {
      state.items.unshift(action.payload);
      if (!action.payload.isRead) {
        state.unreadCount += 1;
      }
    },
    setUnreadCount(state, action: PayloadAction<number>) {
      state.unreadCount = action.payload;
    },
    markOneRead(state, action: PayloadAction<string>) {
      const n = state.items.find((n) => n._id === action.payload);
      if (n && !n.isRead) {
        n.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllRead(state) {
      state.items.forEach((n) => {
        n.isRead = true;
      });
      state.unreadCount = 0;
    },
    toggleNotificationsPanel(state) {
      state.isOpen = !state.isOpen;
    },
    closeNotificationsPanel(state) {
      state.isOpen = false;
    },
  },
});

export const {
  setNotifications,
  addNotification,
  setUnreadCount,
  markOneRead,
  markAllRead,
  toggleNotificationsPanel,
  closeNotificationsPanel,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;
