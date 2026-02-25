// src/pages/ThreadList.tsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useCategoryThreads } from "../hooks/useThreads";
import { useStore } from "../store/useStore";
import { useThreadStore, Thread } from "../store/useThreadStore";
import styles from "../styles/ThreadList.module.css";

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  thread_count?: number;
}

export default function ThreadList() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const { isAuth, user } = useStore();
  const [category, setCategory] = useState<Category | null>(null);

  const {
    threads,
    hasMore,
    loadingMore,
    addThreads,
    addOptimistic,
    replaceThread,
    removeThread,
    reset,
    fetchCategoryThreads,
  } = useThreadStore();

  const loader = useRef<HTMLDivElement | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // Fetch category threads with React Query
  const { data, isLoading, error } = useCategoryThreads(categorySlug!);

  // Sync React Query data to Zustand
  useEffect(() => {
    if (data?.data) {
      reset();
      addThreads(data.data, data.next_cursor || null);
    }
  }, [data]);

  // Fetch category info
  useEffect(() => {
    if (!categorySlug) return;
    const fetchCategory = async () => {
      try {
        const res = await fetch(`/api/categories/${categorySlug}`);
        const json = await res.json();
        setCategory(json);
      } catch (err) {
        console.error("Error fetching category:", err);
      }
    };
    fetchCategory();
  }, [categorySlug]);

  // Infinite scroll observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !loadingMore) {
        fetchCategoryThreads(categorySlug!);
      }
    },
    [hasMore, loadingMore, categorySlug, fetchCategoryThreads],
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
      rootMargin: "100px",
    });
    if (loader.current) observer.observe(loader.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  // Optimistic thread creation
  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || !category || !user) return;

    const tempSlug = `temp-${Date.now()}`;
    const tempThread: Thread = {
      id: -1,
      title,
      slug: tempSlug,
      content,
      created_at: new Date().toISOString(),
      user: { id: user.id, name: user.name },
      category: {
        id: `${category.id}`,
        name: category.name,
        slug: category.slug,
      },
      optimistic: true,
      comment_count: 0,
    };

    addOptimistic(tempThread);
    setShowForm(false);
    setTitle("");
    setContent("");

    try {
      const res = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          category_id: category.id,
        }),
      });
      const realThread = await res.json();
      replaceThread(tempSlug, realThread);
    } catch (err) {
      removeThread(tempSlug);
      alert("Error creating thread: " + (err as Error).message);
    }
  };

  // Helpers
  const timeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)} minute${
        Math.floor(diffInSeconds / 60) > 1 ? "s" : ""
      } ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)} hour${
        Math.floor(diffInSeconds / 3600) > 1 ? "s" : ""
      } ago`;
    return `${Math.floor(diffInSeconds / 86400)} day${
      Math.floor(diffInSeconds / 86400) > 1 ? "s" : ""
    } ago`;
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

  if (isLoading && threads.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  if (error) {
    return <div className={styles.error}>Error loading threads</div>;
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
              <span className={styles.statIcon}>🧵</span>
              {category.thread_count ?? threads.length} threads
            </span>
          </div>
        </div>
      )}

      {/* Create Thread Form */}
      {isAuth ? (
        <>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className={styles.createButton}
            >
              Create a Thread
            </button>
          )}
          {showForm && (
            <form onSubmit={handleCreateThread} className={styles.createForm}>
              <input
                type="text"
                placeholder="Thread Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <textarea
                placeholder="Thread Content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
              <button type="submit">Submit</button>
              <button type="button" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </form>
          )}
        </>
      ) : (
        <Link to="/login" className={styles.createButton}>
          Sign in to post
        </Link>
      )}

      {/* Thread List */}
      <div className={styles.threadList}>
        {threads.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>💬</span>
            <h3>No threads yet</h3>
            <p>Be the first to start a conversation in this category!</p>
          </div>
        ) : (
          threads.map((thread) => (
            <div key={thread.id} className={styles.threadWrapper}>
              <Link
                to={`/threads/${thread.slug}`}
                className={styles.threadLink}
              >
                <article
                  className={styles.threadCard}
                  style={thread.optimistic ? { opacity: 0.7 } : {}}
                >
                  <div className={styles.avatar}>
                    {getUserInitials(thread.user?.name || "")}
                  </div>
                  <div className={styles.threadContent}>
                    <h2 className={styles.threadTitle}>{thread.title}</h2>
                    <p className={styles.threadPreview}>
                      {thread.content
                        ?.replace(/<[^>]*>/g, "")
                        .substring(0, 120)}
                      ...
                    </p>

                    <div className={styles.threadMeta}>
                      <span className={styles.author}>
                        by {thread.user?.name || "You"}
                      </span>
                      <span className={styles.dot}>·</span>
                      <span className={styles.time}>
                        {timeAgo(thread.created_at)}
                      </span>
                    </div>

                    {/* --- THREAD FOOTER --- */}
                    <div className={styles.threadFooter}>
                      <span className={styles.replyCount}>
                        {thread.comment_count ?? 0}{" "}
                        {thread.comment_count === 1 ? "comment" : "comments"}
                      </span>
                      <span className={styles.likeCount}>
                        {thread.like_count ?? 0}{" "}
                        {thread.like_count === 1 ? "vote" : "votes"}
                      </span>
                      {thread.upvotes !== undefined &&
                        thread.downvotes !== undefined && (
                          <span className={styles.voteCount}>
                            (+{thread.upvotes} / -{thread.downvotes})
                          </span>
                        )}
                      <span className={styles.timeAgo}>
                        {timeAgo(thread.created_at)}
                      </span>
                    </div>
                  </div>
                </article>
              </Link>

              {/* Optional placeholder for comments */}
              <div className={styles.commentsPlaceholder}>
                {thread.comment_count === 0 ? (
                  <span>💬 No comments yet</span>
                ) : null}
              </div>
            </div>
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
