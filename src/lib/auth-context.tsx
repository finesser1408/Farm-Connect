import React, { createContext, useContext, useState, useCallback } from "react";

export type UserRole = "customer" | "farmer" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  farmName?: string;
  farmLocation?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  register: (user: Omit<User, "id">, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo
const mockUsers: (User & { password: string })[] = [
  { id: "u1", name: "John Customer", email: "customer@test.com", role: "customer", phone: "+263 77 111 1111", password: "password" },
  { id: "u2", name: "Jane Farmer", email: "farmer@test.com", role: "farmer", phone: "+263 77 222 2222", farmName: "Green Valley Farm", farmLocation: "Harare", password: "password" },
  { id: "u3", name: "Admin User", email: "admin@test.com", role: "admin", phone: "+263 77 333 3333", password: "password" },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback((email: string, password: string) => {
    const found = mockUsers.find((u) => u.email === email && u.password === password);
    if (found) {
      const { password: _, ...userData } = found;
      setUser(userData);
      return true;
    }
    return false;
  }, []);

  const register = useCallback((userData: Omit<User, "id">, _password: string) => {
    const newUser: User = { ...userData, id: `u${Date.now()}` };
    setUser(newUser);
    return true;
  }, []);

  const logout = useCallback(() => setUser(null), []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
