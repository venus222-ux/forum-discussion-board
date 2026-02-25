import { Link, NavLink, useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { useState, useEffect } from "react";
import styles from "../styles/Navbar.module.css";
import Echo from "laravel-echo";
import Pusher from "pusher-js";

export default function Navbar() {
  const { isAuth, setIsAuth, theme, toggleTheme, user, setUser } = useStore();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [score, setScore] = useState(user?.reputation || 0);
  const [scoreHighlight, setScoreHighlight] = useState(false);

  // ------------------- Scroll listener -------------------
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ------------------- Pusher/Echo for live reputation -------------------
  useEffect(() => {
    if (!isAuth || !user?.id) return;

    const echo = new Echo({
      broadcaster: "pusher",
      key: import.meta.env.VITE_PUSHER_APP_KEY || "72f70b3c1eb4247fc505",
      cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || "eu",
      forceTLS: true,
    });

    const channel = echo.private(`App.Models.User.${user.id}`);
    channel.listen("UserReputationUpdated", (event: any) => {
      if (event.reputation !== undefined) {
        setScore(event.reputation);
        setScoreHighlight(true); // trigger highlight animation
        setUser((prev) => ({ ...prev, reputation: event.reputation }));

        // Remove highlight after 1s
        setTimeout(() => setScoreHighlight(false), 1000);
      }
    });

    return () => {
      echo.leaveChannel(`App.Models.User.${user.id}`);
      echo.disconnect();
    };
  }, [isAuth, user?.id, setUser]);

  const handleLogout = () => {
    setIsAuth(false);
    navigate("/login");
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const getUserInitials = () => {
    if (!user?.name) return "?";
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ""}`}>
      <div className={styles.container}>
        {/* Logo */}
        <Link to="/" className={styles.logo}>
          <span className={styles.logoText}>Typeform</span>
        </Link>

        {/* Desktop Navigation - Left tabs */}
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

        {/* Right side actions */}
        <div className={styles.rightActions}>
          <Link
            to={isAuth ? "/user/dashboard" : "/login"}
            className={styles.createPostBtn}
          >
            Create a post
          </Link>

          {/* Desktop Score */}
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
              </div>
            </div>
          ) : (
            <Link to="/login" className={styles.loginBtn}>
              Log in
            </Link>
          )}

          <button
            className={styles.themeToggle}
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>

        {/* Mobile menu button */}
        <button
          className={styles.mobileMenuBtn}
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <span
            className={`${styles.hamburger} ${isMenuOpen ? styles.open : ""}`}
          />
        </button>

        {/* Mobile Menu */}
        <div
          className={`${styles.mobileMenu} ${isMenuOpen ? styles.menuOpen : ""}`}
        >
          {isAuth && (
            <Link to="/dashboard?create=true" className={styles.createButton}>
              + New Thread
            </Link>
          )}

          {isAuth ? (
            <>
              {/* Mobile Score */}
              {score > 0 && (
                <div
                  className={`${styles.mobileScore} ${
                    scoreHighlight ? styles.scoreHighlight : ""
                  }`}
                >
                  ⭐ {score}
                </div>
              )}

              <div className={styles.mobileUserInfo}>
                <div className={styles.mobileAvatar}>{getUserInitials()}</div>
                <span className={styles.mobileUserName}>
                  {user?.name || "User"}
                </span>
              </div>
              <NavLink
                to="/dashboard"
                className={styles.mobileNavLink}
                onClick={toggleMenu}
              >
                📊 Dashboard
              </NavLink>
              <NavLink
                to="/profile"
                className={styles.mobileNavLink}
                onClick={toggleMenu}
              >
                👤 Profile
              </NavLink>
              <NavLink
                to="/settings"
                className={styles.mobileNavLink}
                onClick={toggleMenu}
              >
                ⚙️ Settings
              </NavLink>
              <button
                onClick={() => {
                  handleLogout();
                  toggleMenu();
                }}
                className={styles.mobileLogoutBtn}
              >
                🚪 Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className={styles.mobileLoginBtn}
              onClick={toggleMenu}
            >
              Log in
            </Link>
          )}

          <div className={styles.mobileThemeSection}>
            <span>Theme</span>
            <button
              className={styles.mobileThemeToggle}
              onClick={() => {
                toggleTheme();
                toggleMenu();
              }}
            >
              {theme === "light" ? "🌙 Dark" : "☀️ Light"}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
