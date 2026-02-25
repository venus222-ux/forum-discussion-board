// src/components/CommentTree.tsx
import React, { useState, useEffect, useMemo } from "react";
import { Reply, useThreadStore } from "../store/useThreadStore";
import { useStore } from "../store/useStore";
import styles from "../styles/CommentTree.module.css";

interface CommentTreeProps {
  comment: Reply;
  level?: number;
  threadSlug?: string;
}

export default function CommentTree({
  comment,
  level = 0,
  threadSlug,
}: CommentTreeProps) {
  const { isAuth, user } = useStore();
  const addReply = useThreadStore((s) => s.addReply);
  const currentThread = useThreadStore((s) => s.currentThread);
  const markBestReply = useThreadStore((s) => s.markBestReply);
  const refetchReplies = useThreadStore((s) => s.refetchReplies);

  const [replying, setReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [upvotes, setUpvotes] = useState(comment.upvotes || 0);
  const [downvotes, setDownvotes] = useState(comment.downvotes || 0);
  const [optimisticVote, setOptimisticVote] = useState<
    "upvote" | "downvote" | null
  >(null);

  // Check if current user is the thread author
  const isThreadAuthor = useMemo(() => {
    if (!isAuth || !user?.id || !currentThread?.user?.id) return false;

    // Convert both to strings for comparison
    const userId = String(user.id);
    const threadAuthorId = String(currentThread.user.id);

    return userId === threadAuthorId;
  }, [isAuth, user, currentThread]);

  // Check if this comment is the best answer
  const isBestAnswer = useMemo(() => {
    return comment.isBest === true;
  }, [comment.isBest]);

  // Debug logging - remove in production
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("CommentTree:", {
        id: comment._id,
        isBest: comment.isBest,
        isThreadAuthor,
        userId: user?.id,
        threadAuthorId: currentThread?.user?.id,
      });
    }
  }, [
    comment._id,
    comment.isBest,
    isThreadAuthor,
    user?.id,
    currentThread?.user?.id,
  ]);

  // ---------------- POST REPLY ----------------
  const handleReplySubmit = async () => {
    if (!replyContent.trim() || !isAuth || !threadSlug) return;

    try {
      const res = await fetch(`/api/threads/${threadSlug}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          content: replyContent,
          parentId: comment._id,
        }),
      });

      if (!res.ok) throw new Error("Failed to post reply");

      const newReply: Reply = await res.json();
      addReply(threadSlug, newReply);
      setReplyContent("");
      setReplying(false);
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------- VOTING ----------------
  const handleVote = async (type: "upvote" | "downvote") => {
    if (!isAuth) return;

    // Optimistic update
    if (optimisticVote === type) {
      // Remove vote
      setOptimisticVote(null);
      if (type === "upvote") {
        setUpvotes((prev) => prev - 1);
      } else {
        setDownvotes((prev) => prev - 1);
      }
    } else {
      // Add or change vote
      if (type === "upvote") {
        setUpvotes((prev) => prev + 1);
        if (optimisticVote === "downvote") {
          setDownvotes((prev) => prev - 1);
        }
      } else {
        setDownvotes((prev) => prev + 1);
        if (optimisticVote === "upvote") {
          setUpvotes((prev) => prev - 1);
        }
      }
      setOptimisticVote(type);
    }

    try {
      const res = await fetch(`/api/comments/${comment._id}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ type }),
      });

      if (!res.ok) {
        // Revert optimistic update on error
        setOptimisticVote(null);
        setUpvotes(comment.upvotes || 0);
        setDownvotes(comment.downvotes || 0);
        throw new Error("Vote failed");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------- ACCEPT BEST ANSWER ----------------
  const handleAcceptBest = async () => {
    if (!threadSlug || !comment._id || !isThreadAuthor || isBestAnswer) return;

    try {
      // Optimistic update
      markBestReply(threadSlug, comment._id);

      const res = await fetch(`/api/comments/${comment._id}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!res.ok) {
        // If failed, refetch to revert optimistic update
        await refetchReplies?.(threadSlug);
        throw new Error("Failed to accept comment");
      }

      // Refetch to ensure consistency
      await refetchReplies?.(threadSlug);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className={styles.commentWrapper} style={{ marginLeft: level * 24 }}>
      <div
        className={`${styles.commentCard} ${
          isBestAnswer ? styles.bestComment : ""
        }`}
      >
        <div className={styles.commentHeader}>
          <div className={styles.commentAuthor}>
            <div className={styles.avatar}>
              {comment.user?.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className={styles.authorInfo}>
              <span className={styles.authorName}>
                {comment.user?.name || "Anonymous"}
              </span>
              <span className={styles.commentTime}>
                {new Date(comment.createdAt).toLocaleString()}
              </span>
            </div>
          </div>

          <div className={styles.voteButtons}>
            <button
              onClick={() => handleVote("upvote")}
              className={`${styles.voteButton} ${styles.upvote} ${
                optimisticVote === "upvote" ? styles.active : ""
              }`}
              disabled={!isAuth}
              aria-label="Upvote"
            >
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="M12 4L4 12h5v8h6v-8h5z" fill="currentColor" />
              </svg>
              <span>{upvotes}</span>
            </button>

            <button
              onClick={() => handleVote("downvote")}
              className={`${styles.voteButton} ${styles.downvote} ${
                optimisticVote === "downvote" ? styles.active : ""
              }`}
              disabled={!isAuth}
              aria-label="Downvote"
            >
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="M12 20L4 12h5V4h6v8h5z" fill="currentColor" />
              </svg>
              <span>{downvotes}</span>
            </button>
          </div>
        </div>

        <div className={styles.commentContent}>{comment.content}</div>

        <div className={styles.commentActions}>
          {/* Accept as Best Answer button - Only for thread author, on non-best comments */}
          {isThreadAuthor && !isBestAnswer && (
            <button className={styles.acceptButton} onClick={handleAcceptBest}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M20 6L9 17l-5-5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Accept as Best Answer
            </button>
          )}

          {/* Best Answer badge */}
          {isBestAnswer && (
            <div className={styles.badgeGroup}>
              <span className={`${styles.badge} ${styles.bgSuccess}`}>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path
                    d="M20 6L9 17l-5-5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Best Answer
              </span>
              <span
                className={`${styles.badge} ${styles.bgPrimary}`}
                title="This answer solved the question"
              >
                ✔ Accepted by author
              </span>
            </div>
          )}

          {/* Reply button */}
          {isAuth && (
            <button
              onClick={() => setReplying(!replying)}
              className={`${styles.actionButton} ${
                replying ? styles.active : ""
              }`}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Reply
            </button>
          )}
        </div>

        {replying && (
          <div className={styles.replyForm}>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write your reply..."
              className={styles.replyInput}
              rows={3}
            />
            <div className={styles.replyFormActions}>
              <button
                onClick={() => setReplying(false)}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={handleReplySubmit}
                disabled={!replyContent.trim()}
                className={styles.submitButton}
              >
                Post Reply
              </button>
            </div>
          </div>
        )}

        {/* Recursive children */}
        {comment.children?.map((child) => (
          <CommentTree
            key={`${child._id}-${child.parentId || "root"}`}
            comment={child}
            level={level + 1}
            threadSlug={threadSlug}
          />
        ))}
      </div>
    </div>
  );
}
