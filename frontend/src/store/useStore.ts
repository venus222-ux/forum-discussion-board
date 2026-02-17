import { create } from "zustand";
import { refreshToken } from "../api";

interface AppState {
  isAuth: boolean;
  token: string | null;
  theme: "light" | "dark";
  setIsAuth: (auth: boolean, token?: string) => void;
  setToken: (token: string | null) => void;
  toggleTheme: () => void;
  startTokenRefreshLoop: () => void;
}

let refreshInterval: NodeJS.Timeout | null = null;

export const useStore = create<AppState>((set, get) => ({
  isAuth: !!localStorage.getItem("token"),
  token: localStorage.getItem("token"),
  theme: (localStorage.getItem("theme") as "light" | "dark") || "light",

  setIsAuth: (auth, token) => {
    if (auth && token) {
      localStorage.setItem("token", token);
      set({ isAuth: true, token });
    } else {
      localStorage.removeItem("token");
      set({ isAuth: false, token: null });
      if (refreshInterval) clearInterval(refreshInterval);
    }
  },

  setToken: (token) => {
    if (token) {
      localStorage.setItem("token", token);
      set({ token });
    } else {
      localStorage.removeItem("token");
      set({ token: null });
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
        if (!localStorage.getItem("token")) return;
        try {
          const res = await refreshToken();
          const newToken = res.data.token;
          get().setToken(newToken);
        } catch {
          get().setIsAuth(false);
          window.location.replace("/login");
        }
      },
      4 * 60 * 1000,
    );
  },
}));
