// src/store/useStore.ts
import { create } from "zustand";
import { refreshToken } from "../api";

type Role = "user" | "moderator" | "admin" | null;

interface User {
  id: number | string;
  name: string;
  email?: string;
  role?: Role | string;
}

interface AppState {
  isAuth: boolean;
  token: string | null;
  role: Role;
  user: User | null;

  theme: "light" | "dark";

  // Auth helpers
  setAuth: (token: string, role: Role | undefined, user: User) => void;
  logout: () => void;
  setUser: (user: User | null) => void;

  setIsAuth: (auth: boolean, token?: string) => void;
  setToken: (token: string | null) => void;

  toggleTheme: () => void;
  startTokenRefreshLoop: () => void;
}

let refreshInterval: ReturnType<typeof setInterval> | null = null;

export const useStore = create<AppState>((set, get) => {
  // ==================== INITIAL STATE (with role fallback) ====================
  const savedToken = localStorage.getItem("token");
  let savedUser: User | null = null;
  try {
    const savedUserStr = localStorage.getItem("user");
    savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
  } catch (e) {
    console.warn("Failed to parse saved user from localStorage");
  }

  const savedRoleStr = localStorage.getItem("role");
  const initialRole: Role =
    (savedRoleStr as Role) ||
    null ||
    (savedUser?.role
      ? (String(savedUser.role).toLowerCase().trim() as Role)
      : null) ||
    null;

  return {
    // ------------------- INITIAL STATE -------------------
    isAuth: !!savedToken,
    token: savedToken,
    role: initialRole,
    user: savedUser,

    theme: (localStorage.getItem("theme") as "light" | "dark") || "light",

    // ------------------- SET AUTH (main fix) -------------------
    setAuth: (token, roleParam, user) => {
      // Normalize role + fallback to user.role if param is missing/undefined
      const normalizedRole: Role = roleParam
        ? (roleParam.toLowerCase().trim() as Role)
        : user?.role
          ? (String(user.role).toLowerCase().trim() as Role)
          : null;

      localStorage.setItem("token", token);
      if (normalizedRole) {
        localStorage.setItem("role", normalizedRole);
      } else {
        localStorage.removeItem("role");
      }

      if (user && user.id) {
        localStorage.setItem("user", JSON.stringify(user));
      }

      set({
        isAuth: true,
        token,
        role: normalizedRole,
        user: user && user.id ? user : null,
      });
    },

    // ------------------- LOGOUT -------------------
    logout: () => {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("user");

      if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
      }

      set({
        isAuth: false,
        token: null,
        role: null,
        user: null,
      });
    },

    // ------------------- SET USER (now syncs role) -------------------
    setUser: (newUser) => {
      let newRole: Role = null;
      if (newUser) {
        newRole = newUser.role
          ? (String(newUser.role).toLowerCase().trim() as Role)
          : null;

        localStorage.setItem("user", JSON.stringify(newUser));
        if (newRole) localStorage.setItem("role", newRole);
        else localStorage.removeItem("role");
      } else {
        localStorage.removeItem("user");
        localStorage.removeItem("role");
      }

      set({
        user: newUser,
        role: newRole,
      });
    },

    // ------------------- OTHER HELPERS (unchanged) -------------------
    setIsAuth: (auth, token) => {
      if (auth && token) {
        localStorage.setItem("token", token);
        set({ isAuth: true, token });
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("user");
        set({ isAuth: false, token: null, role: null, user: null });
      }
    },

    setToken: (token) => {
      if (token) {
        localStorage.setItem("token", token);
        set({ token });
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("user");
        set({ token: null, role: null, user: null });
      }
    },

    toggleTheme: () => {
      set((state) => {
        const newTheme = state.theme === "light" ? "dark" : "light";
        localStorage.setItem("theme", newTheme);
        document.documentElement.setAttribute("data-bs-theme", newTheme);
        return { theme: newTheme };
      });
    },

    startTokenRefreshLoop: () => {
      if (refreshInterval) return;

      refreshInterval = setInterval(
        async () => {
          const token = localStorage.getItem("token");
          if (!token) return;

          try {
            const res = await refreshToken();
            const newToken = res.data.token;
            const user = res.data.user;

            get().setToken(newToken);
            get().setUser(user); // ← now correctly updates role too
          } catch {
            get().logout();
            window.location.replace("/login");
          }
        },
        4 * 60 * 1000,
      );
    },
  };
});
