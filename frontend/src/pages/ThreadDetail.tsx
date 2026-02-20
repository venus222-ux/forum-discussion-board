// src/pages/ThreadDetail.tsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import API from "../api";
import { useStore } from "../store/useStore";
import { useThreadStore } from "../store/useThreadStore"; // your Zustand store
import styles from "../styles/ThreadDetail.module.css";

interface Thread {
  id: number;
  title: string;
  content: string;
  user: { id: number; name: string; avatar?: string };
  category: { id: number; name: string; slug: string };
  created_at: string;
  views?: number;
  likes?: number;
  replies?: number;
}

interface Reply {
  id: number;
  content: string;
  user: { id: number; name: string };
  created_at: string;
  likes?: number;
}

export default function ThreadDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuth, user } = useStore();
  const navigate = useNavigate();
  const { threads, addThreads } = useThreadStore();

  const [thread, setThread] = useState<Thread | null>(
    threads.find((t) => t.slug === slug) || null,
  );
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loadingThread, setLoadingThread] = useState(!thread);
  const [loadingReplies, setLoadingReplies] = useState(true);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"discussion" | "details">(
    "discussion",
  );

  // ---------------- FETCH THREAD (from cache or API) ----------------
  useEffect(() => {
    if (!slug) return;

    if (!thread) fetchThread();
    else setLoadingThread(false);

    fetchReplies();
  }, [slug]);

  const fetchThread = async () => {
    setLoadingThread(true);
    try {
      const res = await API.get(`/threads/${slug}`);
      setThread(res.data);
      addThreads([res.data], null); // cache in Zustand
    } catch (err) {
      console.error("Error fetching thread:", err);
    } finally {
      setLoadingThread(false);
    }
  };

  // ---------------- FETCH REPLIES ----------------
  const fetchReplies = async () => {
    setLoadingReplies(true);
    try {
      const res = await API.get(`/threads/${slug}/replies`);
      setReplies(res.data || []);
    } catch (err) {
      console.log("No replies endpoint");
    } finally {
      setLoadingReplies(false);
    }
  };

  // ---------------- POST REPLY ----------------
  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuth) return navigate("/login");
    if (!replyContent.trim()) return;

    setSubmitting(true);
    try {
      const res = await API.post(`/threads/${slug}/replies`, {
        content: replyContent,
      });
      setReplies([...replies, res.data]);
      setReplyContent("");
    } catch (err) {
      console.error("Error posting reply:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------- UTILITIES ----------------
  const getUserInitials = (name: string) =>
    name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .substring(0, 2)
      : "?";

  const formatDate = (date: string) =>
    new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const timeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diff = Math.floor((now.getTime() - past.getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600)
      return `${Math.floor(diff / 60)} minute${diff / 60 > 1 ? "s" : ""} ago`;
    if (diff < 86400)
      return `${Math.floor(diff / 3600)} hour${diff / 3600 > 1 ? "s" : ""} ago`;
    return `${Math.floor(diff / 86400)} day${diff / 86400 > 1 ? "s" : ""} ago`;
  };

  // ---------------- LOADING & ERROR ----------------
  if (loadingThread) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}>
          <div className={styles.spinner}></div>
          <p>Loading thread...</p>
        </div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorCard}>
          <span className={styles.errorIcon}>🔍</span>
          <h2>Thread Not Found</h2>
          <p>
            The thread you're looking for doesn't exist or has been removed.
          </p>
          <Link to="/" className={styles.backButton}>
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // ---------------- JSX ----------------
  return (
    <div className={styles.container}>
      {/* Back navigation */}
      <div className={styles.backNav}>
        <Link to="/" className={styles.backLink}>
          ← Back to Conversations
        </Link>
        <div className={styles.breadcrumb}>
          <Link to="/categories">Categories</Link>
          <span>›</span>
          <Link to={`/categories/${thread.category.slug}/threads`}>
            {thread.category.name}
          </Link>
          <span>›</span>
          <span className={styles.current}>{thread.title}</span>
        </div>
      </div>

      {/* Thread card */}
      <div className={styles.threadCard}>
        <div className={styles.threadHeader}>
          <div className={styles.category}>
            <span className={styles.categoryBadge}>{thread.category.name}</span>
          </div>
          <h1 className={styles.threadTitle}>{thread.title}</h1>

          <div className={styles.threadMeta}>
            <div className={styles.author}>
              <div className={styles.avatar}>
                {getUserInitials(thread.user.name)}
              </div>
              <div className={styles.authorInfo}>
                <span className={styles.authorName}>{thread.user.name}</span>
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
              {thread.replies !== undefined && (
                <div className={styles.metaItem}>
                  <span>💬</span>
                  <span>{thread.replies} replies</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.threadContent}>
          <div
            className={styles.contentBody}
            dangerouslySetInnerHTML={{ __html: thread.content }}
          />
        </div>

        <div className={styles.threadActions}>
          <button className={styles.actionButton}>
            <span>👍</span>Like
          </button>
          <button className={styles.actionButton}>
            <span>💬</span>Reply
          </button>
          <button className={styles.actionButton}>
            <span>🔗</span>Share
          </button>
          <button className={styles.actionButton}>
            <span>📌</span>Save
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "discussion" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("discussion")}
        >
          Discussion{" "}
          {replies.length > 0 && (
            <span className={styles.tabCount}>{replies.length}</span>
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
                <div className={styles.replyAvatar}>
                  {getUserInitials(user?.name || "User")}
                </div>
                <span className={styles.replyName}>{user?.name || "User"}</span>
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
            ) : replies.length === 0 ? (
              <div className={styles.noReplies}>
                <span className={styles.noRepliesIcon}>💭</span>
                <h3>No replies yet</h3>
                <p>Be the first to share your thoughts!</p>
              </div>
            ) : (
              replies.map((reply) => (
                <div key={reply.id} className={styles.replyCard}>
                  <div className={styles.replyHeader}>
                    <div className={styles.replyAuthor}>
                      <div className={styles.replyAvatar}>
                        {getUserInitials(reply.user.name)}
                      </div>
                      <div className={styles.replyAuthorInfo}>
                        <span className={styles.replyAuthorName}>
                          {reply.user.name}
                        </span>
                        <span className={styles.replyTime}>
                          {timeAgo(reply.created_at)}
                        </span>
                      </div>
                    </div>
                    {reply.likes !== undefined && (
                      <button className={styles.replyLikeButton}>
                        <span>👍</span>
                        {reply.likes}
                      </button>
                    )}
                  </div>
                  <div className={styles.replyContent}>{reply.content}</div>
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
                <span className={styles.detailValue}>{thread.user.name}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Category</span>
                <Link
                  to={`/categories/${thread.category.slug}/threads`}
                  className={styles.detailLink}
                >
                  {thread.category.name}
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
