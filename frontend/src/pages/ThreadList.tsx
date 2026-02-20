// src/pages/ThreadList.tsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import API from "../api";
import { useStore } from "../store/useStore";
import styles from "../styles/ThreadList.module.css";

interface Thread {
  id: number;
  title: string;
  slug: string;
  content: string;
  created_at: string;
  user: { id: number; name: string };
  comment_count?: number;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  thread_count?: number;
}

export default function ThreadList() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const { isAuth } = useStore();
  const [category, setCategory] = useState<Category | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const loader = useRef<HTMLDivElement | null>(null);

  // Fetch category details
  useEffect(() => {
    if (!categorySlug) return;
    const fetchCategory = async () => {
      try {
        const res = await API.get(`/categories/${categorySlug}`);
        setCategory(res.data);
      } catch (err) {
        console.error("Error fetching category:", err);
      }
    };
    fetchCategory();
  }, [categorySlug]);

  // Fetch threads
  const fetchThreads = async (reset = false) => {
    if (!categorySlug) return;
    if (!reset && !hasMore) return;
    if (!reset) setLoadingMore(true);
    else setLoading(true);

    try {
      const url = reset
        ? `/categories/${categorySlug}/threads`
        : `/categories/${categorySlug}/threads?cursor=${cursor}`;
      const res = await API.get(url);
      const newThreads = res.data.data || res.data || [];
      setThreads((prev) => (reset ? newThreads : [...prev, ...newThreads]));
      setCursor(res.data.next_cursor || null);
      setHasMore(!!res.data.next_cursor);
    } catch (err) {
      console.error("Error fetching threads:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (categorySlug) {
      fetchThreads(true);
    }
  }, [categorySlug]);

  // Intersection Observer for infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !loadingMore) {
        fetchThreads();
      }
    },
    [hasMore, loadingMore, cursor, categorySlug],
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
      rootMargin: "100px",
    });
    if (loader.current) observer.observe(loader.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  // Helpers
  const timeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) {
      const mins = Math.floor(diffInSeconds / 60);
      return `${mins} minute${mins > 1 ? "s" : ""} ago`;
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    }
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  };

  const getUserInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  if (loading && !threads.length) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Breadcrumbs */}
      <div className={styles.breadcrumbs}>
        <Link to="/" className={styles.breadcrumbLink}>
          Home
        </Link>
        <span className={styles.breadcrumbSeparator}>›</span>
        <Link to="/categories" className={styles.breadcrumbLink}>
          Categories
        </Link>
        <span className={styles.breadcrumbSeparator}>›</span>
        <span className={styles.breadcrumbCurrent}>
          {category?.name || categorySlug}
        </span>
      </div>

      {/* Category Header */}
      {category && (
        <div className={styles.categoryHeader}>
          <h1 className={styles.categoryTitle}>{category.name}</h1>
          {category.description && (
            <p className={styles.categoryDescription}>{category.description}</p>
          )}
          <div className={styles.categoryStats}>
            <span className={styles.statItem}>
              <span className={styles.statIcon}>📌</span>
              {category.thread_count || threads.length} threads
            </span>
          </div>
        </div>
      )}

      {/* Thread List */}
      <div className={styles.threadList}>
        {threads.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>💬</span>
            <h3>No threads yet</h3>
            <p>Be the first to start a conversation in this category!</p>
            {isAuth ? (
              <Link to="/dashboard" className={styles.createButton}>
                Create a Thread
              </Link>
            ) : (
              <Link to="/login" className={styles.createButton}>
                Sign in to post
              </Link>
            )}
          </div>
        ) : (
          threads.map((thread) => (
            <Link
              key={thread.id}
              to={`/threads/${thread.slug}`}
              className={styles.threadLink}
            >
              <article className={styles.threadCard}>
                <div className={styles.avatar}>
                  {getUserInitials(thread.user.name)}
                </div>
                <div className={styles.threadContent}>
                  <h2 className={styles.threadTitle}>{thread.title}</h2>
                  <p className={styles.threadPreview}>
                    {thread.content?.replace(/<[^>]*>/g, "").substring(0, 120)}
                    ...
                  </p>
                  <div className={styles.threadMeta}>
                    <span className={styles.author}>by {thread.user.name}</span>
                    <span className={styles.dot}>·</span>
                    <span className={styles.time}>
                      {timeAgo(thread.created_at)}
                    </span>
                    {thread.comment_count !== undefined && (
                      <>
                        <span className={styles.dot}>·</span>
                        <span className={styles.comments}>
                          💬 {thread.comment_count}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </article>
            </Link>
          ))
        )}
      </div>

      {/* Infinite Scroll Loader */}
      {hasMore && threads.length > 0 && (
        <div ref={loader} className={styles.loader}>
          {loadingMore ? (
            <div className={styles.spinner}></div>
          ) : (
            <span className={styles.loaderText}>Scroll for more</span>
          )}
        </div>
      )}
      {!hasMore && threads.length > 0 && (
        <div className={styles.endMessage}>You've reached the end</div>
      )}
    </div>
  );
}
