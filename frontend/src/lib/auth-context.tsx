import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { isAxiosError } from "axios";
import apiClient from "./api-client";

export type UserRole = "customer" | "farmer" | "admin";

export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  user_type: UserRole;
  is_staff: boolean;
  phone?: string;
  farmer_profile?: { farm_name: string; location: string; description: string } | null;
  customer_profile?: { address: string; city: string } | null;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  password_confirm: string;
  phone: string;
  user_type: UserRole;
  first_name: string;
  last_name: string;
  farm_name?: string;
  location?: string;
  farm_description?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await apiClient.get<User>("/auth/profile/");
      setUser(response.data);
    } catch (error) {
      console.error("Failed to fetch profile", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const tokens = localStorage.getItem("auth_tokens");
    if (tokens) {
      fetchProfile();
    } else {
      setIsLoading(false);
    }
  }, [fetchProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiClient.post("/auth/login/", { email, password });
    const { access, refresh, user: userData } = response.data;

    localStorage.setItem("auth_tokens", JSON.stringify({ access, refresh }));
    setUser(userData);
    return true;
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const response = await apiClient.post("/auth/register/", data);
    const { access, refresh, user: userData } = response.data;

    localStorage.setItem("auth_tokens", JSON.stringify({ access, refresh }));
    setUser(userData);
    return true;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("auth_tokens");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function getAuthErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return "An unexpected error occurred.";
  if (!error.response) return "Cannot reach the server. Check your connection and try again.";

  const data = error.response.data;
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const messages = Object.entries(data as Record<string, unknown>)
      .flatMap(([field, value]) => {
        const values = Array.isArray(value) ? value : [value];
        return values.map((message) => `${field}: ${String(message)}`);
      });
    if (messages.length) return messages.join(" ");
  }
  return `Request failed with status ${error.response.status}.`;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
