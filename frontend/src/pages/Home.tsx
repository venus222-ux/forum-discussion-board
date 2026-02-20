import { Link } from "react-router-dom";
import { useStore } from "../store/useStore";
import { useState } from "react";
import API from "../api";
import styles from "../styles/Home.module.css";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

import { useQuery } from "@tanstack/react-query";

interface Thread {
  id: number;
  title: string;
  slug: string;
  content: string;
  created_at: string;
  user: { id: number; name: string };
  category: { id: string; name: string; slug: string };
  reply_count?: number;
  like_count?: number;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

interface ActiveUser {
  id: number;
  name: string;
  threads_count: number;
  postCount: number;
}

const Home = () => {
  const { isAuth } = useStore();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<
    "conversations" | "help" | "categories"
  >("conversations");

  // Threads query
  const { data: threadsData, isLoading: threadsLoading } = useQuery({
    queryKey: ["threads", page],
    queryFn: async () => {
      const res = await API.get(`/threads/recent?page=${page}`);
      return res.data;
    },
    keepPreviousData: true,
    staleTime: 1000 * 60 * 2,
    enabled: activeTab === "conversations",
  });

  const threads = threadsData?.data || [];
  const lastPage = threadsData?.last_page || 1;

  // Active users query
  const { data: usersData } = useQuery({
    queryKey: ["activeUsers"],
    queryFn: async () => {
      const res = await API.get("/users/most-active");
      return res.data.map((u: any) => ({
        ...u,
        postCount: u.threads_count ?? 0,
      }));
    },
    staleTime: 1000 * 60 * 5,
  });

  const activeUsers = usersData || [];

  // Categories query
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await API.get("/categories");
      return res.data;
    },
    enabled: activeTab === "categories",
  });

  const categories = categoriesData || [];

  const getUserInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const timeAgo = (date: string) => (date ? dayjs(date).fromNow() : "unknown");

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.logo}># Typeforum</h1>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "conversations" ? styles.activeTab : ""}`}
            onClick={() => {
              setActiveTab("conversations");
              setPage(1);
            }}
          >
            Conversations
          </button>
          <button
            className={`${styles.tab} ${activeTab === "help" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("help")}
          >
            Help others
          </button>
          <button
            className={`${styles.tab} ${activeTab === "categories" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("categories")}
          >
            Categories
          </button>
        </div>
        {isAuth && (
          <Link to="/threads/create" className={styles.createButton}>
            + New Thread
          </Link>
        )}
      </header>

      {/* Main content */}
      <div className={styles.mainGrid}>
        <main className={styles.mainContent}>
          {/* Conversations tab */}
          {activeTab === "conversations" && (
            <>
              <div className={styles.threadList}>
                {threadsLoading ? (
                  // Skeleton loaders
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={styles.threadCard}>
                      <div className={styles.avatarSkeleton} />
                      <div className={styles.threadContent}>
                        <div className={styles.metaSkeleton} />
                        <div className={styles.titleSkeleton} />
                        <div className={styles.previewSkeleton} />
                        <div className={styles.footerSkeleton} />
                      </div>
                    </div>
                  ))
                ) : threads.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>No conversations yet.</p>
                    {isAuth && (
                      <Link
                        to="/threads/create"
                        className={styles.createButton}
                      >
                        Start a conversation
                      </Link>
                    )}
                  </div>
                ) : (
                  threads.map((thread: Thread) => (
                    <Link
                      key={thread.id}
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
                              {thread.reply_count ?? 0} replies
                            </span>
                            <span className={styles.likeCount}>
                              {thread.like_count ?? 0} likes
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

              {/* Pagination */}
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

          {/* Help tab */}
          {activeTab === "help" && (
            <div className={styles.helpCenter}>
              <h3>🤝 Help others</h3>
              <p>This section is under construction. Check back soon!</p>
            </div>
          )}

          {/* Categories tab */}
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
                        <span className={styles.categoryArrow}>→</span>
                      </article>
                    </Link>
                  ))}
            </div>
          )}
        </main>

        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <h3 className={styles.sidebarTitle}>Most active users</h3>
          <div className={styles.userList}>
            {activeUsers.length === 0
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={styles.userItem}>
                    <div className={styles.userAvatarSkeleton} />
                    <div className={styles.userInfoSkeleton}>
                      <div className={styles.userNameSkeleton} />
                      <div className={styles.userStatsSkeleton} />
                    </div>
                  </div>
                ))
              : activeUsers.map((user: ActiveUser) => (
                  <div key={user.id} className={styles.userItem}>
                    <div className={styles.userAvatar}>
                      <span>{getUserInitials(user.name)}</span>
                    </div>
                    <div className={styles.userInfo}>
                      <span className={styles.userName}>{user.name}</span>
                      <span className={styles.userStats}>
                        {user.postCount} posts
                      </span>
                    </div>
                  </div>
                ))}
          </div>
          <div className={styles.sidebarFooter}>
            <Link to="/users" className={styles.viewAllLink}>
              View all users →
            </Link>
          </div>

          {!isAuth && (
            <div className={styles.loginPrompt}>
              <p>Join the conversation</p>
              <div className={styles.promptButtons}>
                <Link to="/login" className={styles.loginButton}>
                  Log in
                </Link>
                <Link to="/register" className={styles.registerButton}>
                  Sign up
                </Link>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default Home;
