import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthStore {
  isAuthenticated: boolean;
  user: { id: string; email: string; name: string } | null;
  token: string | null;

  login: (user: { id: string; email: string; name: string }, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      token: null,

      login: (user, token) =>
        set({ isAuthenticated: true, user, token }),

      logout: () =>
        set({ isAuthenticated: false, user: null, token: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
      }),
    }
  )
);
