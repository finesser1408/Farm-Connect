import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import { useAuth } from "@/lib/auth-context";

vi.mock("@/lib/auth-context", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: vi.fn(),
}));

vi.mock("@/lib/cart-context", () => ({
  CartProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/lib/product-context", () => ({
  ProductProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/components/ui/toaster", () => ({ Toaster: () => null }));
vi.mock("@/components/ui/sonner", () => ({ Toaster: () => null }));

vi.mock("../pages/Marketplace", () => ({
  default: () => <p>Marketplace public page</p>,
}));

vi.mock("../pages/ProductDetails", () => ({
  default: () => <p>Product details public page</p>,
}));

vi.mock("../pages/CartPage", () => ({
  default: () => <p>Guest cart public page</p>,
}));

vi.mock("../pages/CheckoutPage", () => ({
  default: () => <p>Checkout public page</p>,
}));

vi.mock("../pages/LoginPage", () => ({
  default: () => <p>Login page</p>,
}));

describe("public shopping routes", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
  });

  it.each([
    ["/marketplace", "Marketplace public page"],
    ["/product/test-product", "Product details public page"],
    ["/cart", "Guest cart public page"],
  ])("keeps %s accessible without role guards", async (path, expectedPage) => {
    window.history.replaceState({}, "", path);

    render(<App />);

    expect(await screen.findByText(expectedPage)).toBeInTheDocument();
  });

  it("redirects anonymous checkout visitors to login before showing checkout", async () => {
    window.history.replaceState({}, "", "/checkout");

    render(<App />);

    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Checkout public page")).not.toBeInTheDocument();
  });
});
