import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { useNotificationStore } from "../store/useNotificationStore";
import styles from "../styles/Navbar.module.css";
import echo from "../echo";

export default function Navbar() {
  const { isAuth, user, role, theme, toggleTheme, setIsAuth } = useStore();
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    fetchNotifications,
    addRealtimeNotification,
    markAsRead,
    clearAll,
    cursor,
    hasMore,
  } = useNotificationStore();

  const [scrolled, setScrolled] = useState(false);
  const [score, setScore] = useState(user?.reputation || 0);
  const [scoreHighlight, setScoreHighlight] = useState(false);

  // ------------------- Scroll effect -------------------
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ------------------- Initial fetch -------------------
  useEffect(() => {
    if (!isAuth) return;
    fetchNotifications();
  }, [isAuth]);

  // ------------------- Realtime Notifications -------------------
  useEffect(() => {
    if (!isAuth || !user?.id) return;

    const channel = echo.private(`App.Models.User.${user.id}`);

    channel.notification((notification: any) => {
      addRealtimeNotification({
        id: notification.id,
        type: notification.type,
        read_at: null,
        created_at: new Date().toISOString(),
        data: notification.data,
      });
    });

    return () => {
      echo.leave(`App.Models.User.${user.id}`);
    };
  }, [isAuth, user?.id]);

  const handleLogout = () => {
    setIsAuth(false);
    navigate("/login");
  };

  const getUserInitials = () =>
    user?.name
      ? user.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .substring(0, 2)
      : "?";

  // ------------------- Infinite Scroll -------------------
  const handleScrollNotifications = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 20 && hasMore) {
      fetchNotifications(cursor);
    }
  };

  // ------------------- Render notification -------------------
  const renderNotification = (n: any) => {
    const data = n.data;

    if (data?.message) return data.message;

    switch (data?.type) {
      case "thread_comment":
        return `💬 ${data.actor_name} commented on "${data.thread_title}"`;
      case "thread_reply":
        return `↩️ ${data.actor_name} replied to your comment`;
      case "comment_liked":
        return `👍 ${data.actor_name} liked your comment`;
      case "best_answer":
        return `🏆 Your comment was selected as best answer`;
      default:
        return "New notification";
    }
  };

  return (
    <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ""}`}>
      <div className={styles.container}>
        {/* Logo */}
        <Link to="/" className={styles.logo}>
          <span className={styles.logoText}>Typeform</span>
        </Link>

        {/* Desktop Nav */}
        <div className={styles.navTabs}>
          <NavLink
            to="/"
            className={({ isActive }) =>
              `${styles.tabLink} ${isActive ? styles.activeTab : ""}`
            }
          >
            Home
          </NavLink>
        </div>

        {/* Right Side */}
        <div className={styles.rightActions}>
          <Link
            to={isAuth ? "/dashboard" : "/login"}
            className={styles.createPostBtn}
          >
            Create a post
          </Link>

          {isAuth && score > 0 && (
            <div
              className={`${styles.userScore} ${
                scoreHighlight ? styles.scoreHighlight : ""
              }`}
            >
              ⭐ {score}
            </div>
          )}

          {isAuth ? (
            <div className={styles.userMenu}>
              <div className={styles.avatar}>{getUserInitials()}</div>

              <div className={styles.dropdown}>
                <NavLink to="/dashboard" className={styles.dropdownItem}>
                  📊 Dashboard
                </NavLink>

                <NavLink to="/profile" className={styles.dropdownItem}>
                  👤 My Profile
                </NavLink>

                <div className={styles.dropdownDivider} />

                <button
                  onClick={handleLogout}
                  className={`${styles.dropdownItem} ${styles.logoutBtn}`}
                >
                  🚪 Logout
                </button>

                {/* ---------------- Notifications ---------------- */}
                <div className={styles.notificationWrapper}>
                  <button className={styles.bell}>
                    🔔 {unreadCount > 0 && <span>{unreadCount}</span>}
                  </button>

                  <div
                    className={styles.notificationDropdown}
                    onScroll={handleScrollNotifications}
                  >
                    {notifications.length === 0 && (
                      <div className={styles.notificationItem}>
                        No notifications
                      </div>
                    )}

                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          markAsRead(n.id);
                          if (n.data?.link) navigate(n.data.link); // optional link
                        }}
                        className={`${styles.notificationItem} ${!n.read_at ? styles.unread : ""}`}
                      >
                        {n.data?.message || renderNotification(n)}
                      </div>
                    ))}

                    {hasMore && (
                      <div className={styles.notificationItem}>Loading...</div>
                    )}

                    {notifications.length > 0 && (
                      <button
                        onClick={clearAll}
                        className={`${styles.dropdownItem} ${styles.clearAllBtn}`}
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Link to="/login" className={styles.loginBtn}>
              Log in
            </Link>
          )}

          <button className={styles.themeToggle} onClick={toggleTheme}>
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>
      </div>
    </nav>
  );
}
