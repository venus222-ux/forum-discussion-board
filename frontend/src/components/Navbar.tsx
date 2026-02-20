import { Link, NavLink, useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { useState, useEffect } from "react";
import styles from "../styles/Navbar.module.css";

export default function Navbar() {
  const { isAuth, setIsAuth, theme, toggleTheme, user } = useStore();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

        {/* Desktop Navigation - Left side tabs */}
        <div className={styles.navTabs}>
          <NavLink
            to="/activity"
            className={({ isActive }) =>
              `${styles.tabLink} ${isActive ? styles.activeTab : ""}`
            }
          >
            Activity
          </NavLink>
          <NavLink
            to="/library"
            className={({ isActive }) =>
              `${styles.tabLink} ${isActive ? styles.activeTab : ""}`
            }
          >
            Library
          </NavLink>
          <NavLink
            to="/typeform-qa"
            className={({ isActive }) =>
              `${styles.tabLink} ${isActive ? styles.activeTab : ""}`
            }
          >
            Typeform Q&A
          </NavLink>
          <NavLink
            to="/videoask-qa"
            className={({ isActive }) =>
              `${styles.tabLink} ${isActive ? styles.activeTab : ""}`
            }
          >
            VideoAsk Q&A
          </NavLink>
        </div>

        {/* Right side actions */}
        <div className={styles.rightActions}>
          <Link
            to={isAuth ? "/dashboard" : "/login"}
            className={styles.createPostBtn}
          >
            Create a post
          </Link>

          {isAuth ? (
            // User menu for logged in
            <div className={styles.userMenu}>
              <div className={styles.avatar}>{getUserInitials()}</div>
              <div className={styles.dropdown}>
                <NavLink to="/dashboard" className={styles.dropdownItem}>
                  📊 Dashboard
                </NavLink>
                <NavLink to="/profile" className={styles.dropdownItem}>
                  👤 My Profile
                </NavLink>
                <NavLink to="/settings" className={styles.dropdownItem}>
                  ⚙️ Settings
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
            // Login button for logged out
            <Link to="/login" className={styles.loginBtn}>
              Log in
            </Link>
          )}

          {/* Theme toggle */}
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
          <NavLink
            to="/activity"
            className={({ isActive }) =>
              `${styles.mobileNavLink} ${isActive ? styles.mobileActive : ""}`
            }
            onClick={toggleMenu}
          >
            Activity
          </NavLink>
          <NavLink
            to="/library"
            className={({ isActive }) =>
              `${styles.mobileNavLink} ${isActive ? styles.mobileActive : ""}`
            }
            onClick={toggleMenu}
          >
            Library
          </NavLink>
          <NavLink
            to="/typeform-qa"
            className={({ isActive }) =>
              `${styles.mobileNavLink} ${isActive ? styles.mobileActive : ""}`
            }
            onClick={toggleMenu}
          >
            Typeform Q&A
          </NavLink>
          <NavLink
            to="/videoask-qa"
            className={({ isActive }) =>
              `${styles.mobileNavLink} ${isActive ? styles.mobileActive : ""}`
            }
            onClick={toggleMenu}
          >
            VideoAsk Q&A
          </NavLink>

          <div className={styles.mobileCreatePost}>
            <Link
              to={isAuth ? "/dashboard" : "/login"}
              className={styles.mobileCreatePostBtn}
              onClick={toggleMenu}
            >
              Create a post
            </Link>
          </div>

          {isAuth ? (
            <>
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
