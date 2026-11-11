import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import LoginPage from "@/pages/LoginPage";
import { useAuth, type User } from "@/lib/auth-context";

vi.mock("@/lib/auth-context", () => ({
  useAuth: vi.fn(),
  getAuthErrorMessage: () => "Login failed",
}));

vi.mock("@/components/Navbar", () => ({
  default: () => null,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function customerUser(): User {
  return {
    id: 1,
    email: "customer@example.com",
    username: "customer",
    first_name: "Customer",
    last_name: "User",
    user_type: "customer",
    is_staff: false,
  };
}

describe("login redirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a customer to checkout after successful login", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: customerUser(),
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={[{
        pathname: "/login",
        state: { from: { pathname: "/checkout" } },
      }]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/checkout" element={<p>Checkout delivery information</p>} />
          <Route path="/customer" element={<p>Customer dashboard</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Checkout delivery information")).toBeInTheDocument();
    expect(screen.queryByText("Customer dashboard")).not.toBeInTheDocument();
  });

  it("keeps the existing role dashboard destination without a checkout redirect", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: customerUser(),
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/customer" element={<p>Customer dashboard</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Customer dashboard")).toBeInTheDocument();
  });
});
