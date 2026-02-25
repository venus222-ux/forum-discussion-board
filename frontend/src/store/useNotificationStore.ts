import { create } from "zustand";
import API from "../api";
import { toast } from "react-toastify"; // optional for UI feedback

export interface NotificationItem {
  id: string;
  type: string;
  read_at: string | null;
  created_at: string;
  data: any;
}

interface NotificationStore {
  notifications: NotificationItem[];
  unreadCount: number;
  cursor: string | null;
  hasMore: boolean;
  isLoading: boolean;

  fetchNotifications: (cursor?: string | null) => Promise<void>;
  addRealtimeNotification: (notification: NotificationItem) => void;
  markAsRead: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  reset: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  cursor: null,
  hasMore: true,
  isLoading: false,

  fetchNotifications: async (cursor = null) => {
    if (get().isLoading || !get().hasMore) return;
    set({ isLoading: true });

    try {
      const res = await API.get("/notifications", { params: { cursor } });
      const { data, next_cursor, unread_count } = res.data;

      // filter duplicates
      const existingIds = new Set(get().notifications.map((n) => n.id));
      const newNotifications = data.filter(
        (n: NotificationItem) => !existingIds.has(n.id),
      );

      set({
        notifications: cursor
          ? [...get().notifications, ...newNotifications]
          : newNotifications,
        cursor: next_cursor,
        hasMore: Boolean(next_cursor),
        unreadCount: unread_count,
        isLoading: false,
      });
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      set({ isLoading: false });
      toast.error("Failed to load notifications");
    }
  },

  addRealtimeNotification: (notification: NotificationItem) => {
    const exists = get().notifications.some((n) => n.id === notification.id);
    if (exists) return;

    set({
      notifications: [notification, ...get().notifications],
      unreadCount: get().unreadCount + 1,
    });
  },

  markAsRead: async (id) => {
    try {
      await API.post(`/notifications/${id}/read`);
      set({
        notifications: get().notifications.filter((n) => n.id !== id),
        unreadCount: Math.max(0, get().unreadCount - 1),
      });
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      toast.error("Failed to mark notification as read");
    }
  },

  clearAll: async () => {
    try {
      const res = await API.post("/notifications/clear");
      set({
        notifications: res.data.data.map((n: NotificationItem) => ({
          ...n,
          read_at: n.read_at ?? new Date().toISOString(),
        })),
        unreadCount: res.data.unread_count,
      });
    } catch (err) {
      console.error("Failed to clear notifications:", err);
      toast.error("Failed to clear notifications");
    }
  },

  reset: () =>
    set({
      notifications: [],
      unreadCount: 0,
      cursor: null,
      hasMore: true,
      isLoading: false,
    }),
}));
