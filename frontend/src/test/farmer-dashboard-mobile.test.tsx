import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FarmerLayout from "@/layouts/FarmerLayout";
import FarmerDashboard from "@/pages/farmer/FarmerDashboard";
import AddProduct from "@/pages/farmer/AddProduct";
import { useAuth } from "@/lib/auth-context";
import { productService } from "@/lib/services/product-service";
import { orderService } from "@/lib/services/order-service";

vi.mock("@/lib/auth-context", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: vi.fn(),
  getAuthErrorMessage: (err: unknown) => (err instanceof Error ? err.message : "Error"),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => true,
}));

vi.mock("@/lib/services/product-service", () => ({
  productService: {
    getProducts: vi.fn(),
    getCategories: vi.fn(),
    createProduct: vi.fn(),
  },
}));

vi.mock("@/lib/services/order-service", () => ({
  orderService: {
    getFarmerOrders: vi.fn(),
  },
}));

describe("Farmer Dashboard mobile navigation & responsiveness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();

    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 1,
        email: "farmer@example.com",
        username: "farmer@example.com",
        first_name: "Tariro",
        last_name: "Moyo",
        user_type: "farmer",
        is_staff: false,
        farmer_profile: {
          farm_name: "Green Valley",
          location: "Harare",
          description: "",
        },
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      updateProfile: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(productService.getProducts).mockResolvedValue([]);
    vi.mocked(productService.getCategories).mockResolvedValue([
      { id: 1, name: "Vegetables", slug: "vegetables", description: "" },
    ]);
    vi.mocked(orderService.getFarmerOrders).mockResolvedValue([]);
  });

  it("opens mobile drawer, closes it automatically when selecting Add Product, and displays the form", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/farmer"]}>
          <Routes>
            <Route path="/farmer" element={<FarmerLayout />}>
              <Route index element={<FarmerDashboard />} />
              <Route path="products/new" element={<AddProduct />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Farm Dashboard")).toBeInTheDocument();
    expect(
      await screen.findByText(/No orders yet\. They will appear here/i),
    ).toBeInTheDocument();

    // Open mobile navigation drawer
    fireEvent.click(screen.getByRole("button", { name: /Toggle navigation menu/i }));

    const addProductLink = await screen.findByRole("link", { name: /Add Product/i });
    expect(addProductLink).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Close navigation menu/i })).toBeInTheDocument();

    // Select Add Product -> drawer closes and AddProduct form renders
    fireEvent.click(addProductLink);

    expect(await screen.findByText("Add New Product")).toBeInTheDocument();
    expect(screen.getByLabelText(/Product Name/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Publish Product/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Close navigation menu/i })).not.toBeInTheDocument();
    });
  });
});

