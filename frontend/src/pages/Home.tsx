// src/pages/Home.tsx
import { Link } from "react-router-dom";
import { useStore } from "../store/useStore";
import { useState, useEffect } from "react";
import styles from "../styles/Home.module.css";
import { Thread, useThreadStore } from "../store/useThreadStore";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

import { useQuery } from "@tanstack/react-query";
import API from "../api";

interface ActiveUser {
  id: number;
  name: string;
  postCount: number;
  reputation: number;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  threads_count?: number;
}

const Home = () => {
  const { isAuth } = useStore();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<
    "conversations" | "help" | "categories"
  >("conversations");

  const {
    threads,
    setThreads,
    fetchThreads,
    fetchSearch,
    lastPage,
    isSearching,
  } = useThreadStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  // --- DEBOUNCE SEARCH ---
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 500); // 500ms debounce

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // --- FETCH THREADS OR SEARCH ---
  useEffect(() => {
    if (activeTab === "conversations") {
      if (debouncedQuery.trim()) {
        fetchSearch(page, debouncedQuery);
      } else {
        fetchThreads(page);
      }
    }
  }, [page, activeTab, debouncedQuery]);

  // Reset search when switching tabs
  useEffect(() => {
    if (activeTab !== "conversations") {
      setSearchQuery("");
      setDebouncedQuery("");
      setPage(1);
    } else {
      setThreads([]);
    }
  }, [activeTab]);

  // --- ACTIVE USERS QUERY ---
  const { data: usersData } = useQuery({
    queryKey: ["activeUsers"],
    queryFn: async () => {
      const res = await API.get("/users/most-active");
      return res.data.map((u: any) => ({
        id: u.id,
        name: u.name,
        postCount: u.threads_count ?? 0,
        reputation: u.reputation ?? 0,
      }));
    },
    staleTime: 1000 * 60 * 5,
  });

<<<<<<< HEAD
<<<<<<< HEAD
  // --- SORT USERS BY POINTS (postCount + reputation) ---
=======
  // --- SORT USERS BY POINTS ---
>>>>>>> b0354f2 (add the button choose best answer buy the author of the thread)
=======
  // --- SORT USERS BY POINTS (postCount + reputation) ---
>>>>>>> ae5dd85d9b441ffddbf18e313884df29e585a949
  interface ActiveUserWithPoints extends ActiveUser {
    points: number;
  }

  const activeUsersWithPoints: ActiveUserWithPoints[] = (usersData || [])
    .map((user) => ({
      ...user,
      points: (user.postCount ?? 0) + (user.reputation ?? 0),
    }))
    .sort((a, b) => b.points - a.points);

  // --- CATEGORIES QUERY ---
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await API.get("/categories");
      return res.data;
    },
    enabled: activeTab === "categories",
  });
  const categories = categoriesData || [];

  // --- UTILITIES ---
  const getUserInitials = (name: string) =>
    name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .substring(0, 2)
      : "?";

  const timeAgo = (date: string) => (date ? dayjs(date).fromNow() : "unknown");

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <header className={styles.header}>
        <h1 className={styles.logo}># Typeforum</h1>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${
              activeTab === "conversations" ? styles.activeTab : ""
            }`}
            onClick={() => {
              setActiveTab("conversations");
              setPage(1);
              setThreads([]);
            }}
          >
            Conversations
          </button>
          <button
            className={`${styles.tab} ${
              activeTab === "categories" ? styles.activeTab : ""
            }`}
            onClick={() => setActiveTab("categories")}
          >
            Categories
          </button>
        </div>
      </header>

      {/* MAIN GRID */}
      <div className={styles.mainGrid}>
        <main className={styles.mainContent}>
          {/* CONVERSATIONS */}
          {activeTab === "conversations" && (
            <>
              {/* SEARCH INPUT */}
              {/* SEARCH INPUT */}
              <div className={styles.searchContainer}>
                <div className={styles.searchWrapper}>
                  <span className={styles.searchIcon}>🔍</span>
                  <input
                    type="text"
                    placeholder="Search conversations... (e.g., title:foo content:bar)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>
              </div>

              <div className={styles.threadList}>
                {threads.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>
                      {isSearching
                        ? "No results found."
                        : "No conversations yet."}
                    </p>
                    {isAuth && !isSearching && (
                      <Link
                        to="/threads/create"
                        className={styles.createButton}
                      >
                        Start a conversation
                      </Link>
                    )}
                  </div>
                ) : (
                  threads.map((thread: Thread, index) => (
                    <Link
<<<<<<< HEAD
<<<<<<< HEAD
                      key={`${thread.id}-${thread.slug}-${index}`} // ✅ unique key
=======
                      key={`${thread.id}-${thread.slug}-${index}`}
>>>>>>> b0354f2 (add the button choose best answer buy the author of the thread)
=======
                      key={`${thread.id}-${thread.slug}-${index}`} // ✅ unique key
>>>>>>> ae5dd85d9b441ffddbf18e313884df29e585a949
                      to={`/threads/${thread.slug}`}
                      className={styles.threadLink}
                    >
                      <article className={styles.threadCard}>
                        <div className={styles.avatar}>
                          <span>{getUserInitials(thread.user?.name)}</span>
                        </div>
                        <div className={styles.threadContent}>
                          <div className={styles.threadMeta}>
                            <span className={styles.author}>
                              {thread.user?.name}
                            </span>
                            <span className={styles.separator}>·</span>
                            <span className={styles.category}>
                              {thread.category?.name}
                            </span>
                          </div>
                          <h2 className={styles.threadTitle}>{thread.title}</h2>
                          <p className={styles.threadPreview}>
                            {thread.content
                              ?.replace(/<[^>]*>/g, "")
                              .substring(0, 140)}
                            ...
                          </p>
                          <div className={styles.threadFooter}>
                            <span className={styles.replyCount}>
                              {thread.comment_count ?? 0}{" "}
                              {thread.comment_count === 1
                                ? "comment"
                                : "comments"}
                            </span>
                            <span className={styles.likeCount}>
                              {thread.like_count ?? 0}{" "}
                              {thread.like_count === 1 ? "vote" : "votes"}
                            </span>
                            <span className={styles.timeAgo}>
                              {timeAgo(thread.created_at)}
                            </span>
                          </div>
                        </div>
                      </article>
                    </Link>
                  ))
                )}
              </div>

              {/* PAGINATION */}
              {threads.length > 0 && (
                <div className={styles.pagination}>
                  <button
                    className={styles.pageButton}
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ← Previous
                  </button>
                  <span className={styles.pageInfo}>
                    Page {page} of {lastPage}
                  </span>
                  <button
                    className={styles.pageButton}
                    disabled={page === lastPage}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}

          {/* CATEGORIES */}
          {activeTab === "categories" && (
            <div className={styles.categoryGrid}>
              {categories.length === 0
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className={styles.categoryCard}>
                      <div className={styles.categoryNameSkeleton} />
                      <div className={styles.categoryDescSkeleton} />
                    </div>
                  ))
                : categories.map((category: Category) => (
                    <Link
                      key={category.id}
                      to={`/categories/${category.slug}/threads`}
                      className={styles.categoryLink}
                    >
                      <article className={styles.categoryCard}>
                        <h3 className={styles.categoryName}>{category.name}</h3>
                        {category.description && (
                          <p className={styles.categoryDescription}>
                            {category.description}
                          </p>
                        )}
                        <div className={styles.categoryMeta}>
                          <span className={styles.threadCount}>
                            🧵 {category.threads_count ?? 0} threads
                          </span>
                        </div>
                        <span className={styles.categoryArrow}>→</span>
                      </article>
                    </Link>
                  ))}
            </div>
          )}
        </main>

        {/* SIDEBAR */}
        <aside className={styles.sidebar}>
          <h3 className={styles.sidebarTitle}>Most active users</h3>
          <div className={styles.userList}>
            {activeUsersWithPoints.length === 0
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={styles.userItem}>
                    <div className={styles.userAvatarSkeleton} />
                    <div className={styles.userInfoSkeleton}>
                      <div className={styles.userNameSkeleton} />
                      <div className={styles.userStatsSkeleton} />
                    </div>
                  </div>
                ))
              : activeUsersWithPoints.map((user) => (
                  <div key={user.id} className={styles.userItem}>
                    <div className={styles.userAvatar}>
                      <span>{getUserInitials(user.name)}</span>
                    </div>
                    <div className={styles.userInfo}>
                      <span className={styles.userName}>{user.name}</span>
                      <span className={styles.userStats}>
                        {user.postCount} posts · {user.points} pts
                      </span>
                    </div>
                  </div>
                ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Home;
