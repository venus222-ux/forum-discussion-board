// src/store/useThreadStore.ts
import { create } from "zustand";

interface Thread {
  id: number;
  title: string;
  slug: string;
  content: string;
  category_id: number;
  created_at: string;
  optimistic?: boolean;
  user?: { id: number; name: string };
  category?: { id: string; name: string; slug: string };
  reply_count?: number;
  like_count?: number;
}

interface ThreadStore {
  threads: Thread[];
  cursor: string | null;
  hasMore: boolean;

  setThreads: (threads: Thread[]) => void;
  addThreads: (threads: Thread[], cursor: string | null) => void;
  addOptimistic: (thread: Thread) => void;
  replaceThread: (tempSlug: string, realThread: Thread) => void;
  removeThread: (slug: string) => void;
  reset: () => void;
}

export const useThreadStore = create<ThreadStore>((set) => ({
  threads: [],
  cursor: null,
  hasMore: true,

  setThreads: (threads) => set({ threads }),

  addThreads: (newThreads, cursor) =>
    set((state) => {
      const merged = [...state.threads, ...(newThreads || [])];
      const unique = Array.from(
        new Map(merged.map((t) => [t.slug, t])).values(),
      );
      return { threads: unique, cursor, hasMore: cursor !== null };
    }),

  addOptimistic: (thread) =>
    set((state) => ({ threads: [thread, ...state.threads] })),

  replaceThread: (tempSlug, realThread) =>
    set((state) => ({
      threads: state.threads.map((t) => (t.slug === tempSlug ? realThread : t)),
    })),

  removeThread: (slug) =>
    set((state) => ({ threads: state.threads.filter((t) => t.slug !== slug) })),

  reset: () => set({ threads: [], cursor: null, hasMore: true }),
}));
