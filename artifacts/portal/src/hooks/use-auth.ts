import { create } from "zustand";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, User } from "@workspace/api-client-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

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
    localStorage.removeItem("portal_token");
    set({ token: null });
    window.location.href = "/login";
  },
}));

export function useAuth() {
  const { token, setToken, logout } = useAuthStore();
  const [, setLocation] = useLocation();

  const { data: user, isLoading, isError, error } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    }
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
