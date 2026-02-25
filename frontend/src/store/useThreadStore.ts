import { create } from "zustand";
import API from "../api";

// In useThreadStore.ts, update the Reply interface:

export interface Reply {
  _id: string;
  content: string;
  user: { id?: number | string; name: string };
  createdAt: string;
  upvotes?: number;
  downvotes?: number;
  isBest?: boolean; // Make sure this is included
  parentId?: string;
  children?: Reply[];
}
// In useThreadStore.ts, ensure the Thread interface has consistent user.id type
export interface Thread {
  id: number;
  title: string;
  slug: string;
  content: string;
  category_id: number;
  created_at: string;
  user?: {
    id: number | string; // Accept both
    name: string;
    reputation?: number;
  };
  category?: { id: string; name: string; slug: string };
  reply_count?: number;
  like_count?: number;
  comment_count?: number;
  upvotes?: number;
  downvotes?: number;
  replies?: Reply[];
  best_comment_id?: string;
}

interface ThreadStore {
  threads: Thread[];
  currentThread: Thread | null;
  isFetchingOne: boolean;
  lastPage: number;
  isLoading: boolean;
  error: any | null;

  setReplies: (slug: string, replies: Reply[]) => void;
  addReply: (slug: string, reply: Reply) => void;
  refetchReplies: (slug: string) => Promise<void>;
  markBestReply: (slug: string, commentId: string) => void;

  setThreads: (threads: Thread[]) => void;
  setCurrentThread: (thread: Thread | null) => void;
  fetchThreadBySlug: (slug: string) => Promise<void>;
  fetchThreads: (page: number) => Promise<void>;
  reset: () => void;
}

export const useThreadStore = create<ThreadStore>((set, get) => ({
  threads: [],
  currentThread: null,
  isFetchingOne: false,
  lastPage: 1,
  isLoading: false,
  error: null,

  setThreads: (threads) => set({ threads }),

  // --- ADD THREADS (used in ThreadList)
  addThreads: (newThreads: Thread[], cursor: any = null) =>
    set((state) => ({
      threads: [...state.threads, ...newThreads],
      lastPage: cursor ?? state.lastPage,
    })),

  // --- ADD OPTIMISTIC THREAD
  addOptimistic: (thread: Thread) =>
    set((state) => ({
      threads: [thread, ...state.threads],
    })),

  replaceThread: (tempSlug: string, realThread: Thread) =>
    set((state) => ({
      threads: state.threads.map((t) => (t.slug === tempSlug ? realThread : t)),
    })),

  removeThread: (tempSlug: string) =>
    set((state) => ({
      threads: state.threads.filter((t) => t.slug !== tempSlug),
    })),

  // ---------------- THREADS ----------------

  fetchThreads: async (page) => {
    set({ isLoading: true, error: null });
    try {
      const res = await API.get(`/threads/recent?page=${page}`);
      const threads: Thread[] = res.data.data || [];
      const lastPage: number = res.data.last_page || 1;

      set({ threads, lastPage, isLoading: false });
    } catch (err) {
      set({ error: err, isLoading: false });
    }
  },

  setThreads: (threads) => set({ threads }),
  setCurrentThread: (thread) => set({ currentThread: thread }),

  fetchThreadBySlug: async (slug) => {
    if (!slug) return;

    const existing = get().threads.find((t) => t.slug === slug);
    if (existing) {
      set({ currentThread: existing });
      return;
    }

    set({ isFetchingOne: true });

    try {
      const res = await API.get(`/threads/${slug}`);
      const thread: Thread = res.data;

      // Ensure thread author is always mapped
      if (!thread.user && res.data.user) {
        thread.user = {
          id: String(res.data.user.id), // always a string
          name: res.data.user.name,
        };
      }

      set({
        currentThread: thread,
        threads: [thread, ...get().threads],
      });
    } catch (err) {
      set({ error: err });
    } finally {
      set({ isFetchingOne: false });
    }
  },
  // ---------------- REPLIES ----------------

  setReplies: (slug, replies) =>
    set((state) => ({
      threads: state.threads.map((t) =>
        t.slug === slug ? { ...t, replies } : t,
      ),
      currentThread:
        state.currentThread?.slug === slug
          ? { ...state.currentThread, replies }
          : state.currentThread,
    })),

  addReply: (slug, reply) =>
    set((state) => {
      // 🔒 Prevent duplicates
      const exists = (list?: Reply[]): boolean => {
        if (!list) return false;
        return list.some((r) => r._id === reply._id || exists(r.children));
      };

      if (exists(state.currentThread?.replies)) {
        return state;
      }

      // 🌳 Insert in correct place
      const insertReply = (list?: Reply[]): Reply[] => {
        if (!list) return [reply];

        return list.map((r) => {
          if (r._id === reply.parentId) {
            return {
              ...r,
              children: r.children ? [...r.children, reply] : [reply],
            };
          }

          return {
            ...r,
            children: insertReply(r.children),
          };
        });
      };

      return {
        threads: state.threads.map((t) =>
          t.slug === slug
            ? {
                ...t,
                replies: reply.parentId
                  ? insertReply(t.replies)
                  : [...(t.replies || []), reply],
              }
            : t,
        ),

        currentThread:
          state.currentThread?.slug === slug
            ? {
                ...state.currentThread,
                replies: reply.parentId
                  ? insertReply(state.currentThread.replies)
                  : [...(state.currentThread.replies || []), reply],
              }
            : state.currentThread,
      };
    }),

  refetchReplies: async (slug) => {
    try {
      const res = await API.get(`/threads/${slug}/comments`);
      const replies: Reply[] = res.data;

      const bestId = get().currentThread?.best_comment_id;

      const markBest = (list?: Reply[]): Reply[] | undefined =>
        list?.map((r) => ({
          ...r,
          isBest: r._id === get().currentThread?.best_comment_id,
          children: markBest(r.children),
        }));

      get().setReplies(slug, markBest(replies) || []);
    } catch (err) {
      console.error("Failed to refetch replies:", err);
    }
  },

  // In useThreadStore.ts, update the markBestReply method:

  markBestReply: (slug, commentId) =>
    set((state) => {
      const updateBest = (replies?: Reply[]): Reply[] | undefined => {
        if (!replies) return replies;

        // First mark all as not best
        const updated = replies.map((r) => ({
          ...r,
          isBest: r._id === commentId,
          children: updateBest(r.children),
        }));

        // Sort to bring best answer to top
        return [
          ...updated.filter((r) => r.isBest),
          ...updated.filter((r) => !r.isBest),
        ];
      };

      // Update both threads list and currentThread
      const updatedThreads = state.threads.map((t) =>
        t.slug === slug
          ? {
              ...t,
              replies: updateBest(t.replies),
              best_comment_id: commentId,
            }
          : t,
      );

      const updatedCurrentThread =
        state.currentThread?.slug === slug
          ? {
              ...state.currentThread,
              replies: updateBest(state.currentThread.replies),
              best_comment_id: commentId,
            }
          : state.currentThread;

      return {
        threads: updatedThreads,
        currentThread: updatedCurrentThread,
      };
    }),

  reset: () =>
    set({
      threads: [],
      currentThread: null,
      lastPage: 1,
      error: null,
    }),
}));
