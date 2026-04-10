import { create } from "zustand";
import { useGetMe, User } from "@workspace/api-client-react";
import { useEffect } from "react";
import { getLocaleFromPath, withLocale } from "@/lib/i18n";

interface AuthState {
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("portal_token"),
  setToken: (token) => {
    if (token) {
      localStorage.setItem("portal_token", token);
    } else {
      localStorage.removeItem("portal_token");
    }
    set({ token });
  },
  logout: () => {
    const locale = getLocaleFromPath(window.location.pathname);
    localStorage.removeItem("portal_token");
    set({ token: null });
    window.location.href = withLocale("/login", locale);
  },
}));

export function useAuth() {
  const { token, setToken, logout } = useAuthStore();

  const { data: user, isLoading, isError } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    },
  });

  useEffect(() => {
    if (isError) {
      logout();
    }
  }, [isError, logout]);

  return {
    user: user as User | undefined,
    isLoading: isLoading && !!token,
    isAuthenticated: !!user,
    token,
    setToken,
    logout,
  };
}
