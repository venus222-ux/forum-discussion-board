// src/components/CommentTree.tsx
import React, { useState, useMemo } from "react";
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

  const [showFlagBox, setShowFlagBox] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [flagSubmitting, setFlagSubmitting] = useState(false);

  // ---------------- HIDDEN COMMENT ----------------
  if (comment.is_hidden) {
    return (
      <div className={styles.commentWrapper} style={{ marginLeft: level * 24 }}>
        <div className={styles.commentCard}>
          <div className={styles.hiddenComment}>
            ⚠️ This comment was hidden by moderators.
            {comment.moderation_reason && (
              <div className={styles.moderationReason}>
                Reason: {comment.moderation_reason}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ----------------- Memoized flags -----------------
  const isThreadAuthor = useMemo(() => {
    if (!isAuth || !user?.id || !currentThread?.user?.id) return false;
    return String(user.id) === String(currentThread.user.id);
  }, [isAuth, user?.id, currentThread?.user?.id]);

  const isBestAnswer = comment.isBest === true;
  const isOfficialReply = comment.official_reply === true;

  const canSelectBestAnswer = useMemo(() => {
    if (!isThreadAuthor) return false;
    if (currentThread?.best_comment_id) return false;
    if (isBestAnswer) return false;
    return true;
  }, [isThreadAuthor, currentThread?.best_comment_id, isBestAnswer]);

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

    if (optimisticVote === type) {
      setOptimisticVote(null);
      type === "upvote" ? setUpvotes((v) => v - 1) : setDownvotes((v) => v - 1);
    } else {
      type === "upvote" ? setUpvotes((v) => v + 1) : setDownvotes((v) => v + 1);

      if (optimisticVote === "upvote") setUpvotes((v) => v - 1);
      if (optimisticVote === "downvote") setDownvotes((v) => v - 1);

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

      if (!res.ok) throw new Error("Vote failed");
    } catch (err) {
      setOptimisticVote(null);
      setUpvotes(comment.upvotes || 0);
      setDownvotes(comment.downvotes || 0);
      console.error(err);
    }
  };

  // ---------------- ACCEPT BEST ANSWER ----------------
  const handleAcceptBest = async () => {
    if (!threadSlug || !comment._id || !isThreadAuthor || isBestAnswer) return;

    comment.isBest = true;
    markBestReply(threadSlug, comment._id);

    try {
      const res = await fetch(`/api/comments/${comment._id}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!res.ok) throw new Error("Failed to accept comment");

      await refetchReplies?.(threadSlug);
    } catch (err) {
      comment.isBest = false;
      markBestReply(threadSlug, "");
      console.error(err);
    }
  };

  // ---------------- FLAG COMMENT ----------------
  const handleFlag = async () => {
    if (flagSubmitting) return;

    const reason = flagReason.trim().substring(0, 255);
    if (!reason) {
      alert("Please provide a reason for flagging.");
      return;
    }

    setFlagSubmitting(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/comments/${comment._id}/flag`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ reason }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        console.error("Flag error:", data);
        alert(data.message || "Failed to flag comment");
        return;
      }

      setShowFlagBox(false);
      setFlagReason("");
      alert("Comment flagged successfully.");
    } catch (err: any) {
      console.error("Unexpected error while flagging:", err);
      alert(err.message || "Unexpected error occurred");
    } finally {
      setFlagSubmitting(false);
    }
  };

  return (
    <div className={styles.commentWrapper} style={{ marginLeft: level * 24 }}>
      <div
        className={`${styles.commentCard} ${
          isBestAnswer ? styles.bestComment : ""
        }`}
      >
        {/* HEADER */}
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

          {/* VOTES */}
          <div className={styles.voteButtons}>
            <button
              onClick={() => handleVote("upvote")}
              className={`${styles.voteButton} ${styles.upvote} ${
                optimisticVote === "upvote" ? styles.active : ""
              }`}
              disabled={!isAuth}
            >
              ▲ <span>{upvotes}</span>
            </button>

            <button
              onClick={() => handleVote("downvote")}
              className={`${styles.voteButton} ${styles.downvote} ${
                optimisticVote === "downvote" ? styles.active : ""
              }`}
              disabled={!isAuth}
            >
              ▼ <span>{downvotes}</span>
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className={styles.commentContent}>{comment.content}</div>

        {/* BADGES */}
        <div className={styles.commentActions}>
          {isBestAnswer && (
            <span className={`${styles.badge} ${styles.bgSuccess}`}>
              ✅ Best Answer
            </span>
          )}

          {isOfficialReply && (
            <span className={`${styles.badge} ${styles.bgInfo}`}>
              🛡️ Official Moderator Reply
            </span>
          )}

          {canSelectBestAnswer && (
            <button className={styles.actionButton} onClick={handleAcceptBest}>
              Accept as Best Answer
            </button>
          )}

          {isAuth && (
            <button
              className={`${styles.actionButton} ${replying ? styles.active : ""}`}
              onClick={() => setReplying(!replying)}
            >
              💬 Reply
            </button>
          )}

          {isAuth && (
            <button
              className={styles.actionButton}
              onClick={() => setShowFlagBox(!showFlagBox)}
            >
              🚩 Flag
            </button>
          )}
        </div>

        {/* FLAG BOX */}
        {showFlagBox && (
          <div className={styles.replyForm}>
            <textarea
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="Reason for flag..."
              rows={2}
              className={styles.replyInput}
            />
            <div className={styles.replyFormActions}>
              <button
                onClick={() => setShowFlagBox(false)}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={handleFlag}
                disabled={!flagReason.trim() || flagSubmitting}
                className={styles.submitButton}
              >
                Submit Flag
              </button>
            </div>
          </div>
        )}

        {/* REPLY FORM */}
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

        {/* NESTED COMMENTS */}
        {comment.children?.map((child) => (
          <CommentTree
            key={child._id}
            comment={child}
            level={level + 1}
            threadSlug={threadSlug}
          />
        ))}
      </div>
    </div>
  );
}
