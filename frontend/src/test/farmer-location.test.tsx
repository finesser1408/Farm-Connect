import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RegisterPage from "@/pages/RegisterPage";
import FarmerProfile from "@/pages/farmer/FarmerProfile";
import ProductDetails from "@/pages/ProductDetails";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { productService } from "@/lib/services/product-service";

vi.mock("@/lib/auth-context", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: vi.fn(),
  getAuthErrorMessage: (err: unknown) => (err instanceof Error ? err.message : "Error"),
}));

vi.mock("@/lib/cart-context", () => ({
  CartProvider: ({ children }: { children: ReactNode }) => children,
  useCart: vi.fn(),
}));

vi.mock("@/components/Navbar", () => ({
  default: () => <nav>Navbar</nav>,
}));

vi.mock("@/components/Footer", () => ({
  default: () => <footer>Footer</footer>,
}));

vi.mock("@/lib/services/product-service", () => ({
  productService: {
    getProductBySlug: vi.fn(),
    getProducts: vi.fn(),
  },
}));

describe("Farmer location support", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCart).mockReturnValue({
      items: [],
      addItem: vi.fn(),
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
      syncCart: vi.fn(),
      totalItems: 0,
      totalPrice: 0,
    } as ReturnType<typeof useCart>);
  });

  it("submits trimmed farmer location during registration", async () => {
    const registerMock = vi.fn().mockResolvedValue(true);
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      register: registerMock,
      updateProfile: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /Farmer/i }));
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: "Tariro Moyo" } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "tariro@example.com" } });
    fireEvent.change(screen.getByLabelText(/Farm Name/i), { target: { value: "Green Valley" } });
    fireEvent.change(screen.getByLabelText(/Location/i), { target: { value: "  Harare  " } });
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: "password123" } });

    fireEvent.submit(screen.getByRole("button", { name: /Create Account/i }).closest("form")!);

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_type: "farmer",
          farm_name: "Green Valley",
          location: "Harare",
        })
      );
    });
  });

  it("allows farmers to view and update their location on FarmerProfile", async () => {
    const updateProfileMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 1,
        email: "farmer@example.com",
        username: "farmer@example.com",
        first_name: "Tariro",
        last_name: "Moyo",
        user_type: "farmer",
        is_staff: false,
        phone: "+263771234567",
        farmer_profile: {
          farm_name: "Green Valley",
          location: "Harare",
          description: "Fresh produce",
        },
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      updateProfile: updateProfileMock,
      logout: vi.fn(),
    });

    render(<FarmerProfile />);

    const locationInput = screen.getByLabelText(/Location/i) as HTMLInputElement;
    expect(locationInput.value).toBe("Harare");

    fireEvent.change(locationInput, { target: { value: "  Mutare  " } });
    fireEvent.submit(screen.getByRole("button", { name: /Save Changes/i }).closest("form")!);

    await waitFor(() => {
      expect(updateProfileMock).toHaveBeenCalledWith({
        farmer_profile: { location: "Mutare" },
      });
    });
    expect(await screen.findByText("Location updated.")).toBeInTheDocument();
  });

  it("displays farmer location and farmer name on ProductDetails and keeps cart actions working", async () => {
    const addItemMock = vi.fn();
    vi.mocked(useCart).mockReturnValue({
      items: [],
      addItem: addItemMock,
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
      syncCart: vi.fn(),
      totalItems: 0,
      totalPrice: 0,
    } as ReturnType<typeof useCart>);

    vi.mocked(productService.getProductBySlug).mockResolvedValue({
      id: 10,
      farmer_name: "Tariro Moyo",
      farmer_location: "Chitungwiza",
      category: 1,
      category_details: { id: 1, name: "Vegetables", slug: "vegetables", description: "" },
      name: "Fresh Tomatoes",
      slug: "fresh-tomatoes",
      description: "Ripe tomatoes",
      price: "2.50",
      stock: 12,
      image: null,
      is_available: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    });
    vi.mocked(productService.getProducts).mockResolvedValue([]);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/product/fresh-tomatoes"]}>
          <Routes>
            <Route path="/product/:id" element={<ProductDetails />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText("Chitungwiza")).toBeInTheDocument();
    expect(screen.getByText("Farmer: Tariro Moyo")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Add to Cart/i }));
    expect(addItemMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "10",
        name: "Fresh Tomatoes",
        farmer: "Tariro Moyo",
      })
    );
    expect(screen.getByRole("button", { name: /Buy Now/i })).toBeInTheDocument();
  });

  it("displays fallback messages when farmer location and name are missing on ProductDetails", async () => {
    vi.mocked(productService.getProductBySlug).mockResolvedValue({
      id: 11,
      farmer_name: "",
      farmer_location: "",
      category: null,
      category_details: null,
      name: "Legacy Maize",
      slug: "legacy-maize",
      description: "Dried maize",
      price: "5.00",
      stock: 5,
      image: null,
      is_available: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/product/legacy-maize"]}>
          <Routes>
            <Route path="/product/:id" element={<ProductDetails />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText("Location not provided")).toBeInTheDocument();
    expect(screen.getByText("Farmer: Farmer name unavailable")).toBeInTheDocument();
  });
});
