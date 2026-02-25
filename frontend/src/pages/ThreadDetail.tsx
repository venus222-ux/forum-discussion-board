// src/pages/ThreadDetail.tsx
import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "../store/useStore";
import { useThreadStore, Reply } from "../store/useThreadStore";
import styles from "../styles/ThreadDetail.module.css";
import CommentTree from "../components/CommentTree";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

export default function ThreadDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuth, user } = useStore();
  const navigate = useNavigate();

  // Zustand store
  const currentThread = useThreadStore((s) => s.currentThread);
  const isFetchingOne = useThreadStore((s) => s.isFetchingOne);
  const fetchThreadBySlug = useThreadStore((s) => s.fetchThreadBySlug);
  const setReplies = useThreadStore((s) => s.setReplies);
  const addReply = useThreadStore((s) => s.addReply);

  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Persist active tab in localStorage
  const [activeTab, setActiveTab] = useState<"discussion" | "details">(
    () =>
      (localStorage.getItem("activeTab") as "discussion" | "details") ||
      "discussion",
  );

  useEffect(() => {
    localStorage.setItem("activeTab", activeTab);
  }, [activeTab]);

  // ---------------- FETCH THREAD ----------------
  useEffect(() => {
    if (!slug) return;
    useThreadStore.getState().setCurrentThread(null); // reset
    fetchThreadBySlug(slug);
  }, [slug]);

  // ---------------- FETCH COMMENTS ----------------
  const {
    data: fetchedReplies = [],
    isLoading: loadingReplies,
    refetch: refetchReplies,
  } = useQuery<Reply[]>({
    queryKey: ["threadReplies", slug],
    queryFn: async () => {
      if (!slug) return [];
      const res = await fetch(`/api/threads/${slug}/comments`);
      if (!res.ok) throw new Error("Failed to fetch comments");
      const data: Reply[] = await res.json();
      return data;
    },
    enabled: !!slug,
  });

  // ---------------- ENRICH REPLIES ----------------
  const prevBestId = useRef<string | undefined>();

  const enrichReplies = (replies: Reply[], bestId?: string): Reply[] =>
    replies.map((r) => ({
      ...r,
      isBest: r._id === bestId,
      children: r.children ? enrichReplies(r.children, bestId) : undefined,
    }));

  useEffect(() => {
    if (!currentThread || !fetchedReplies) return;

    // Only update if best_comment_id changed or replies array changed
    const currentRepliesIds = (currentThread.replies || [])
      .map((r) => r._id)
      .join(",");
    const fetchedRepliesIds = fetchedReplies.map((r) => r._id).join(",");

    if (
      prevBestId.current === currentThread.best_comment_id &&
      currentRepliesIds === fetchedRepliesIds
    )
      return;

    prevBestId.current = currentThread.best_comment_id;

    const enriched = enrichReplies(
      fetchedReplies,
      currentThread.best_comment_id,
    );
    setReplies(slug!, enriched);
  }, [
    currentThread?.best_comment_id,
    fetchedReplies,
    slug,
    setReplies,
    currentThread?.replies,
  ]);

  // ---------------- TOOLTIP INIT ----------------
  useEffect(() => {
    if (!(window as any).bootstrap) return;
    const tooltipTriggerList = document.querySelectorAll(
      '[data-bs-toggle="tooltip"]',
    );
    tooltipTriggerList.forEach((el) => {
      new (window as any).bootstrap.Tooltip(el);
    });
  }, [fetchedReplies]);

  // ---------------- POST REPLY ----------------
  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuth) return navigate("/login");
    if (!replyContent.trim() || !slug) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/threads/${slug}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ content: replyContent }),
      });
      if (!res.ok) throw new Error("Failed to post reply");
      const newReply: Reply = await res.json();
      addReply(slug, newReply);
      setReplyContent("");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------- ACCEPT BEST COMMENT ----------------
  const handleAcceptBest = async (commentId: string) => {
    if (!slug || !commentId) return;
    try {
      const res = await fetch(`/api/comments/${commentId}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!res.ok) throw new Error("Failed to accept comment");

      // Update replies locally
      const updated = enrichReplies(fetchedReplies, commentId);
      setReplies(slug, updated);

      // Update currentThread state to persist best_comment_id
      useThreadStore.getState().setCurrentThread({
        ...currentThread!,
        best_comment_id: commentId,
      });
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------- UTILITIES ----------------
  const getUserInitials = (name?: string) =>
    name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .substring(0, 2)
      : "?";

  const formatDate = (date?: string) =>
    date
      ? new Date(date).toLocaleString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Unknown";

  const timeAgo = (date?: string) => (date ? dayjs(date).fromNow() : "unknown");

  // ---------------- LOADING ----------------
  if (isFetchingOne || !currentThread) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}>
          <div className={styles.spinner}></div>
          <p>Loading thread...</p>
        </div>
      </div>
    );
  }

  const thread = currentThread;

  // ---------------- JSX ----------------
  return (
    <div className={styles.container}>
      {/* Back navigation & breadcrumbs */}
      <div className={styles.backNav}>
        <Link to="/" className={styles.backLink}>
          ← Back to Conversations
        </Link>
        <div className={styles.breadcrumb}>
          <Link to="/categories">Categories</Link>
          <span>›</span>
          <Link to={`/categories/${thread.category?.slug || ""}/threads`}>
            {thread.category?.name || "Unknown"}
          </Link>
          <span>›</span>
          <span className={styles.current}>{thread.title || "Unknown"}</span>
        </div>
      </div>

      {/* Thread card */}
      <div className={styles.threadCard}>
        <div className={styles.threadHeader}>
          <div className={styles.category}>
            <span className={styles.categoryBadge}>
              {thread.category?.name || "Unknown"}
            </span>
          </div>
          <h1 className={styles.threadTitle}>{thread.title || "Untitled"}</h1>
          <div className={styles.threadMeta}>
            <div className={styles.author}>
              <div className={styles.avatar}>
                {getUserInitials(thread.user?.name)}
              </div>
              <div className={styles.authorInfo}>
                <span className={styles.authorName}>
                  {thread.user?.name || "Unknown"}
                </span>
                <span className={styles.authorBadge}>OP</span>
              </div>
            </div>
            <div className={styles.metaStats}>
              <div className={styles.metaItem}>
                <span>📅</span>
                <span title={formatDate(thread.created_at)}>
                  {timeAgo(thread.created_at)}
                </span>
              </div>
              {thread.views !== undefined && (
                <div className={styles.metaItem}>
                  <span>👁️</span>
                  <span>{thread.views} views</span>
                </div>
              )}
              {Array.isArray(thread.replies) && (
                <div className={styles.metaItem}>
                  <span>💬</span>
                  <span>{thread.replies.length} replies</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className={styles.threadContent}>
          <div
            className={styles.contentBody}
            dangerouslySetInnerHTML={{ __html: thread.content || "" }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${
            activeTab === "discussion" ? styles.activeTab : ""
          }`}
          onClick={() => setActiveTab("discussion")}
        >
          Discussion{" "}
          {thread.replies && thread.replies.length > 0 && (
            <span className={styles.tabCount}>{thread.replies.length}</span>
          )}
        </button>
        <button
          className={`${styles.tab} ${activeTab === "details" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("details")}
        >
          Details
        </button>
      </div>

      {/* Discussion */}
      {activeTab === "discussion" && (
        <div className={styles.discussionSection}>
          {isAuth ? (
            <form onSubmit={handleReplySubmit} className={styles.replyForm}>
              <div className={styles.replyFormHeader}>
                <span>Write a comment</span>
              </div>
              <textarea
                className={styles.replyInput}
                placeholder="Write your reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={4}
              />
              <div className={styles.replyActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setReplyContent("")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={submitting || !replyContent.trim()}
                >
                  {submitting ? "Posting..." : "Post Reply"}
                </button>
              </div>
            </form>
          ) : (
            <div className={styles.loginPrompt}>
              <p>Want to join the discussion?</p>
              <Link to="/login" className={styles.loginButton}>
                Sign in to reply
              </Link>
            </div>
          )}

          <div className={styles.repliesList}>
            {loadingReplies ? (
              <p>Loading replies...</p>
            ) : (
              (thread.replies || []).map((c) => (
                <div key={c._id} className={c.isBest ? styles.bestComment : ""}>
                  <CommentTree comment={c} level={0} threadSlug={slug || ""} />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Details */}
      {activeTab === "details" && (
        <div className={styles.detailsSection}>
          <div className={styles.detailsCard}>
            <h3>Thread Information</h3>
            <div className={styles.detailsGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Created by</span>
                <span className={styles.detailValue}>
                  {thread.user?.name || "Unknown"}
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Category</span>
                <Link
                  to={`/categories/${thread.category?.slug || ""}/threads`}
                  className={styles.detailLink}
                >
                  {thread.category?.name || "Unknown"}
                </Link>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Created at</span>
                <span className={styles.detailValue}>
                  {formatDate(thread.created_at)}
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Thread ID</span>
                <span className={styles.detailValue}>#{thread.id}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
