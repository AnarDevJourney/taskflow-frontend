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
    // a notification that arrived over the websocket. The server sends the
    // unread count with it, so the badge is never derived from local state
    // (which would drift as soon as one tab marks something read).
    receiveNotification(
      state,
      action: PayloadAction<{ notification: Notification; unreadCount: number }>,
    ) {
      const { notification, unreadCount } = action.payload;
      if (!state.items.some((n) => n._id === notification._id)) {
        state.items.unshift(notification);
      }
      state.unreadCount = unreadCount;
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
  receiveNotification,
  setUnreadCount,
  markOneRead,
  markAllRead,
  toggleNotificationsPanel,
  closeNotificationsPanel,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;
