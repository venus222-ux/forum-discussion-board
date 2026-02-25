import { create } from "zustand";
import API from "../api";

export interface Flag {
  id: number;
  comment_id: string;
  reason: string;
  status: string;
  user: {
    id: number;
    name: string;
  };
  created_at: string;
}

interface ModerationState {
  flags: Flag[];
  loading: boolean;

  fetchFlags: () => Promise<void>;
  approve: (commentId: string, reason?: string) => Promise<void>;
  reject: (commentId: string) => Promise<void>;
  addRealtimeFlag: (commentId: string, totalFlags: number) => void;
}

export const useModerationStore = create<ModerationState>((set, get) => ({
  flags: [],
  loading: false,

  fetchFlags: async () => {
    set({ loading: true });
    const res = await API.get("/moderation/flags");
    set({ flags: res.data, loading: false });
  },

  approve: async (commentId, reason) => {
    await API.post(`/moderation/${commentId}/approve`, { reason });
    set({
      flags: get().flags.filter((f) => f.comment_id !== commentId),
    });
  },

  reject: async (commentId) => {
    await API.post(`/moderation/${commentId}/reject`);
    set({
      flags: get().flags.filter((f) => f.comment_id !== commentId),
    });
  },

  addRealtimeFlag: (commentId, totalFlags) => {
    set((state) => ({
      flags: state.flags.map((f) =>
        f.comment_id === commentId ? { ...f, total_flags: totalFlags } : f,
      ),
    }));
  },
}));
