// src/store/useThreadStore.ts
import { create } from "zustand";
import API from "../api";

// -------------------- TYPES --------------------

export interface Reply {
  _id: string;
  content: string;
  user: { id?: number | string; name: string };
  createdAt: string;
  upvotes?: number;
  downvotes?: number;
  isBest?: boolean;
  parentId?: string;
  children?: Reply[];
  // 🔴 MODERATION
  is_hidden?: boolean;
  official_reply?: boolean;
  moderation_reason?: string;
  total_flags?: number; // optional for realtime
}

export interface Thread {
  id: number;
  title: string;
  slug: string;
  content: string;
  category_id: number;
  created_at: string;
  user?: { id: number | string; name: string; reputation?: number };
  category?: { id: string; name: string; slug: string };
  reply_count?: number;
  like_count?: number;
  comment_count?: number;
  upvotes?: number;
  downvotes?: number;
  replies?: Reply[];
  best_comment_id?: string;
  optimistic?: boolean;
}

interface ThreadStore {
  threads: Thread[];
  currentThread: Thread | null;
  isFetchingOne: boolean;
  lastPage: number;
  cursor: string | null;
  hasMore: boolean;
  isLoading: boolean;
  error: any | null;

  // ---------------- THREADS ----------------
  setThreads: (threads: Thread[]) => void;
  setCurrentThread: (thread: Thread | null) => void;
  addThreads: (threads: Thread[], nextCursor: string | null) => void;
  addOptimistic: (thread: Thread) => void;
  replaceThread: (tempSlug: string, thread: Thread) => void;
  removeThread: (slug: string) => void;
  setCursor: (cursor: string | null) => void;
  setHasMore: (value: boolean) => void;
  setLastPage: (page: number) => void;

  fetchThreads: (page: number) => Promise<void>;
  fetchThreadBySlug: (slug: string) => Promise<void>;

  // ---------------- REPLIES ----------------
  setReplies: (slug: string, replies: Reply[]) => void;
  addReply: (slug: string, reply: Reply) => void;
  refetchReplies: (slug: string) => Promise<void>;
  markBestReply: (slug: string, commentId: string) => void;

  reset: () => void;
}

// -------------------- STORE --------------------

export const useThreadStore = create<ThreadStore>((set, get) => ({
  threads: [],
  currentThread: null,
  isFetchingOne: false,
  lastPage: 1,
  cursor: null,
  hasMore: true,
  isLoading: false,
  error: null,

  // ---------------- THREADS ----------------
  setThreads: (threads) => set({ threads }),
  setCurrentThread: (thread) => set({ currentThread: thread }),
  addThreads: (newThreads, nextCursor) => {
    set({
      threads: [...get().threads, ...newThreads],
      cursor: nextCursor,
      hasMore: Boolean(nextCursor),
    });
  },
  addOptimistic: (thread) => set({ threads: [thread, ...get().threads] }),
  replaceThread: (tempSlug, thread) =>
    set({
      threads: get().threads.map((t) => (t.slug === tempSlug ? thread : t)),
    }),
  removeThread: (slug) =>
    set({ threads: get().threads.filter((t) => t.slug !== slug) }),
  setCursor: (cursor) => set({ cursor }),
  setHasMore: (value) => set({ hasMore: value }),
  setLastPage: (page) => set({ lastPage: page }),

  // ---------------- FETCH THREADS ----------------
  fetchThreads: async (page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const res = await API.get(`/threads/recent?page=${page}`);
      const threads: Thread[] = res.data.data || [];
      const lastPage: number = res.data.last_page || 1;
      const nextCursor = page < lastPage ? String(page + 1) : null;

      if (page === 1) {
        set({
          threads,
          lastPage,
          cursor: nextCursor,
          hasMore: Boolean(nextCursor),
          isLoading: false,
        });
      } else {
        get().addThreads(threads, nextCursor);
        set({ lastPage, isLoading: false });
      }
    } catch (err) {
      set({ error: err, isLoading: false });
    }
  },

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

      if (thread.user) thread.user.id = String(thread.user.id);

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
        t.slug === slug ? { ...t, replies: [...replies] } : t,
      ),
      currentThread:
        state.currentThread?.slug === slug
          ? { ...state.currentThread, replies: [...replies] }
          : state.currentThread,
    })),

  addReply: (slug, reply) =>
    set((state) => {
      const exists = (list?: Reply[]): boolean => {
        if (!list) return false;
        return list.some((r) => r._id === reply._id || exists(r.children));
      };
      if (exists(state.currentThread?.replies)) return state;

      const insertReply = (list?: Reply[]): Reply[] => {
        if (!list) return [reply];
        return list.map((r) => {
          if (r._id === reply.parentId) {
            return {
              ...r,
              children: r.children ? [...r.children, reply] : [reply],
            };
          }
          return { ...r, children: insertReply(r.children) };
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
      get().setReplies(slug, replies);
    } catch (err) {
      console.error("Failed to refetch replies:", err);
    }
  },

  markBestReply: (slug, commentId) =>
    set((state) => {
      const updateBest = (replies?: Reply[]): Reply[] | undefined => {
        if (!replies) return replies;
        const updated = replies.map((r) => ({
          ...r,
          isBest: r._id === commentId,
          children: updateBest(r.children),
        }));
        return [
          ...updated.filter((r) => r.isBest),
          ...updated.filter((r) => !r.isBest),
        ];
      };

      const updatedThreads = state.threads.map((t) =>
        t.slug === slug
          ? { ...t, replies: updateBest(t.replies), best_comment_id: commentId }
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

      return { threads: updatedThreads, currentThread: updatedCurrentThread };
    }),

  reset: () =>
    set({
      threads: [],
      currentThread: null,
      lastPage: 1,
      cursor: null,
      hasMore: true,
      isLoading: false,
      error: null,
    }),
}));
