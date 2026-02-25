// src/components/ThreadCard.tsx
import React from "react";
import { Link } from "react-router-dom";
import styles from "../styles/ThreadCard.module.css"; // Make sure to import styles

export interface ThreadCardProps {
  thread: {
    id: number;
    slug: string;
    title: string;
    content?: string;
    created_at: string;
    user?: { id: number; name: string };
    category?: { id: string; name: string; slug: string };
    comment_count?: number;
    like_count?: number;
    optimistic?: boolean;
    best_comment_id?: string; // 👈 Add this field
  };
  showCategory?: boolean; // optional for Home page
}

export const ThreadCard: React.FC<ThreadCardProps> = ({
  thread,
  showCategory = false,
}) => {
  const getUserInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const timeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diff = Math.floor((now.getTime() - past.getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600)
      return `${Math.floor(diff / 60)} min${Math.floor(diff / 60) > 1 ? "s" : ""} ago`;
    if (diff < 86400)
      return `${Math.floor(diff / 3600)} hr${Math.floor(diff / 3600) > 1 ? "s" : ""} ago`;
    return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) > 1 ? "s" : ""} ago`;
  };

  return (
    <div className={styles.threadWrapper}>
      <Link to={`/threads/${thread.slug}`} className={styles.threadLink}>
        <article
          className={`${styles.threadCard} ${
            thread.optimistic ? styles.optimistic : ""
          }`}
        >
          <div className={styles.avatar}>
            {getUserInitials(thread.user?.name)}
          </div>
          <div className={styles.threadContent}>
            <div className={styles.titleRow}>
              <h2 className={styles.threadTitle}>{thread.title}</h2>
              {/* 👇 Add best answer badge */}
              {thread.best_comment_id && (
                <span
                  className={styles.acceptedBadge}
                  title="This thread has an accepted answer"
                >
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
                  <span>Accepted</span>
                </span>
              )}
            </div>

            {thread.content && (
              <p className={styles.threadPreview}>
                {thread.content.replace(/<[^>]*>/g, "").substring(0, 120)}...
              </p>
            )}

            <div className={styles.threadMeta}>
              <span className={styles.author}>
                {thread.user?.name || "You"}
              </span>
              {showCategory && thread.category && (
                <>
                  <span className={styles.dot}>·</span>
                  <span className={styles.category}>
                    {thread.category.name}
                  </span>
                </>
              )}
              <span className={styles.dot}>·</span>
              <span className={styles.time}>{timeAgo(thread.created_at)}</span>
              {thread.comment_count !== undefined && (
                <>
                  <span className={styles.dot}>·</span>
                  <span className={styles.comments}>
                    💬 {thread.comment_count}
                  </span>
                </>
              )}
              {thread.like_count !== undefined && (
                <>
                  <span className={styles.dot}>·</span>
                  <span className={styles.likes}>👍 {thread.like_count}</span>
                </>
              )}
            </div>
          </div>
        </article>
      </Link>
    </div>
  );
};
