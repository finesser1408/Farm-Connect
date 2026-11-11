import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import RoleProtectedRoute from "@/components/RoleProtectedRoute";
import { useAuth, type User, type UserRole } from "@/lib/auth-context";

vi.mock("@/lib/auth-context", () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function LoginPage() {
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from;
  return <p>Login page; return to {from?.pathname ?? "default"}</p>;
}

function makeUser(user_type: UserRole, is_staff = false): User {
  return {
    id: 1,
    email: "user@example.com",
    username: "user",
    first_name: "Test",
    last_name: "User",
    user_type,
    is_staff,
  };
}

function renderProtectedRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<p>Home page</p>} />
        <Route path="/farmer" element={
          <RoleProtectedRoute role="farmer"><p>Farmer page</p></RoleProtectedRoute>
        } />
        <Route path="/customer" element={<RoleProtectedRoute role="customer" />}>
          <Route index element={<p>Customer page</p>} />
          <Route path="orders" element={<p>Customer orders</p>} />
        </Route>
        <Route path="/admin" element={
          <RoleProtectedRoute role="admin"><p>Admin page</p></RoleProtectedRoute>
        } />
        <Route path="/checkout" element={
          <RoleProtectedRoute role="customer"><p>Checkout page</p></RoleProtectedRoute>
        } />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RoleProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("waits for the server profile before redirecting", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderProtectedRoute("/farmer");

    expect(screen.getByText("Loading FarmConnect...")).toBeInTheDocument();
    expect(screen.queryByText(/Login page/)).not.toBeInTheDocument();
    expect(screen.queryByText("Farmer page")).not.toBeInTheDocument();
  });

  it.each(["farmer", "customer", "admin"] as const)(
    "redirects unauthenticated users from %s routes to login",
    async (path) => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderProtectedRoute(`/${path}`);

    expect(await screen.findByText(/Login page/)).toBeInTheDocument();
    },
  );

  it("preserves checkout as the login return path for anonymous visitors", async () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderProtectedRoute("/checkout");

    expect(await screen.findByText("Login page; return to /checkout")).toBeInTheDocument();
    expect(screen.queryByText("Checkout page")).not.toBeInTheDocument();
  });

  it.each([
    ["customer", "/farmer", "Customer page"],
    ["farmer", "/admin", "Farmer page"],
    ["admin", "/customer", "Admin page"],
  ] as const)("redirects a %s from a different role's route", async (
    _userRole,
    path,
    expectedPage,
  ) => {
    mockedUseAuth.mockReturnValue({
      user: makeUser(_userRole),
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderProtectedRoute(path);

    expect(await screen.findByText(expectedPage)).toBeInTheDocument();
  });

  it("allows a server-verified farmer into farmer routes", () => {
    mockedUseAuth.mockReturnValue({
      user: makeUser("farmer"),
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderProtectedRoute("/farmer");

    expect(screen.getByText("Farmer page")).toBeInTheDocument();
  });

  it("renders nested customer routes through the guard outlet", () => {
    mockedUseAuth.mockReturnValue({
      user: makeUser("customer"),
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderProtectedRoute("/customer/orders");

    expect(screen.getByText("Customer orders")).toBeInTheDocument();
  });

  it("allows a staff user into admin routes, matching Django admin permissions", () => {
    mockedUseAuth.mockReturnValue({
      user: makeUser("customer", true),
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderProtectedRoute("/admin");

    expect(screen.getByText("Admin page")).toBeInTheDocument();
  });
});
