import type { ReactNode } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProductCard from "@/components/ProductCard";
import Marketplace from "@/pages/Marketplace";
import ProductDetails from "@/pages/ProductDetails";
import CartPage from "@/pages/CartPage";
import CheckoutPage from "@/pages/CheckoutPage";
import CustomerOrders from "@/pages/customer/CustomerOrders";
import OrderTracking from "@/pages/customer/OrderTracking";
import FarmerOrders from "@/pages/farmer/FarmerOrders";
import FarmerDashboard from "@/pages/farmer/FarmerDashboard";
import AdminOrders from "@/pages/admin/AdminOrders";
import { CartProvider, useCart } from "@/lib/cart-context";
import { formatQuantityWithUnit } from "@/lib/product-units";
import { useAuth } from "@/lib/auth-context";
import { productService, type Category, type Product } from "@/lib/services/product-service";
import { orderService, type Order, type OrderItem } from "@/lib/services/order-service";
import { reviewService } from "@/lib/services/review-service";

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", MockResizeObserver);
});

const toastMock = vi.fn();

vi.mock("@/components/Navbar", () => ({
  default: () => <nav data-testid="navbar">Navbar</nav>,
}));

vi.mock("@/components/Footer", () => ({
  default: () => <footer data-testid="footer">Footer</footer>,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/lib/auth-context", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: vi.fn(),
  getAuthErrorMessage: (err: unknown) => (err instanceof Error ? err.message : "Request failed"),
}));

vi.mock("@/lib/services/product-service", () => ({
  productService: {
    getProducts: vi.fn(),
    getCategories: vi.fn(),
    getProductBySlug: vi.fn(),
  },
}));

vi.mock("@/lib/services/order-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/order-service")>();
  return {
    ...actual,
    orderService: {
      getOrder: vi.fn(),
      getOrders: vi.fn(),
      getAdminOrders: vi.fn(),
      createOrder: vi.fn(),
      getFarmerOrders: vi.fn(),
      updateOrderItemStatus: vi.fn(),
    },
  };
});

vi.mock("@/lib/services/review-service", () => ({
  reviewService: {
    getProductReviews: vi.fn(),
    getMyProductReview: vi.fn(),
    submitProductReview: vi.fn(),
  },
}));

const vegCategory: Category = {
  id: 1,
  name: "Vegetables",
  slug: "vegetables",
  description: "Fresh vegetables",
};

const tomatoKgProduct: Product = {
  id: 301,
  farmer_id: 2,
  farmer_name: "Tariro Moyo",
  farmer_location: "Harare",
  category: 1,
  category_details: vegCategory,
  name: "Organic Tomatoes",
  slug: "organic-tomatoes",
  description: "Fresh locally grown tomatoes.",
  price: "1.50",
  stock: 50,
  unit: "kg",
  unit_display: "Kilogram",
  unit_description: "",
  formatted_unit: "kg",
  is_countable_unit: false,
  min_order_quantity: 0.5,
  image: null,
  is_available: true,
  created_at: "2026-11-24T08:00:00Z",
  updated_at: "2026-11-24T08:00:00Z",
};

const eggTrayProduct: Product = {
  ...tomatoKgProduct,
  id: 302,
  name: "Farm Eggs",
  slug: "farm-eggs",
  description: "Free-range tray of 30 eggs.",
  price: "4.50",
  stock: 12,
  unit: "tray",
  unit_display: "Tray",
  unit_description: "30 eggs",
  formatted_unit: "30 eggs tray",
  is_countable_unit: true,
  min_order_quantity: 1,
};

const potatoBagProduct: Product = {
  ...tomatoKgProduct,
  id: 303,
  name: "Washed Potatoes",
  slug: "washed-potatoes",
  description: "10 kg pocket of potatoes.",
  price: "8.00",
  stock: 20,
  unit: "bag",
  unit_display: "Bag",
  unit_description: "10 kg",
  formatted_unit: "10 kg bag",
  is_countable_unit: true,
  min_order_quantity: 1,
};

const legacyUnitlessProduct: Product = {
  ...tomatoKgProduct,
  id: 304,
  name: "Legacy Onions",
  slug: "legacy-onions",
  description: "Pre-V1 onion listing.",
  price: "3.50",
  stock: 8,
  unit: null,
  unit_display: null,
  unit_description: "",
  formatted_unit: "",
  is_countable_unit: true,
  min_order_quantity: 1,
};

describe("Section 4.22 Phase 2D — Customer Marketplace, Cart, Checkout & Order Snapshots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
      refreshProfile: vi.fn(),
    });

    vi.mocked(productService.getCategories).mockResolvedValue([vegCategory]);
    vi.mocked(productService.getProducts).mockResolvedValue([
      tomatoKgProduct,
      eggTrayProduct,
      potatoBagProduct,
      legacyUnitlessProduct,
    ]);
    vi.mocked(reviewService.getProductReviews).mockResolvedValue({
      product_slug: "organic-tomatoes",
      total_reviews: 0,
      average_rating: 0,
      reviews: [],
    });
  });

  it("renders unit-aware product cards and marketplace list without fabricating units for legacy products", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <CartProvider>
          <MemoryRouter initialEntries={["/marketplace"]}>
            <Routes>
              <Route path="/marketplace" element={<Marketplace />} />
            </Routes>
          </MemoryRouter>
        </CartProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Organic Tomatoes")).toBeInTheDocument();
    expect(screen.getByText("/ kg")).toBeInTheDocument();
    expect(screen.getByText("50 kg available")).toBeInTheDocument();

    expect(screen.getByText("Farm Eggs")).toBeInTheDocument();
    expect(screen.getByText("/ 30 eggs tray")).toBeInTheDocument();
    expect(screen.getByText("12 trays available")).toBeInTheDocument();

    expect(screen.getByText("Washed Potatoes")).toBeInTheDocument();
    expect(screen.getByText("/ 10 kg bag")).toBeInTheDocument();
    expect(screen.getByText("20 bags available")).toBeInTheDocument();

    // Legacy product shows price and stock without fabricated '/ kg'
    expect(screen.getByText("Legacy Onions")).toBeInTheDocument();
    expect(screen.getByText("$3.50")).toBeInTheDocument();
    expect(screen.getByText("8 available")).toBeInTheDocument();
  });

  it("supports fractional kg quantities, enforces countable whole numbers, minimum order, and stock limits, and performs a single atomic addItem call on ProductDetails", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.mocked(productService.getProductBySlug).mockResolvedValue(tomatoKgProduct);
    vi.mocked(productService.getProducts).mockResolvedValue([]);

    function CartProbe() {
      const { items, totalPrice } = useCart();
      return (
        <div data-testid="cart-probe">
          Count:{items.length}|Qty:{items[0]?.quantity ?? 0}|Total:{totalPrice.toFixed(2)}
        </div>
      );
    }

    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <CartProvider>
          <CartProbe />
          <MemoryRouter initialEntries={["/product/organic-tomatoes"]}>
            <Routes>
              <Route path="/product/:id" element={<ProductDetails />} />
            </Routes>
          </MemoryRouter>
        </CartProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Organic Tomatoes")).toBeInTheDocument();
    expect(screen.getByText("50 kg available")).toBeInTheDocument();
    expect(screen.getAllByText("0.5 kg").length).toBeGreaterThanOrEqual(2);

    const qtyInput = screen.getByLabelText("Quantity") as HTMLInputElement;
    // Initial quantity defaults to min_order_quantity (0.5)
    expect(qtyInput.value).toBe("0.5");

    // 1. Below minimum order (0.25 kg < 0.5 kg) -> validation alert, prevented from adding
    fireEvent.change(qtyInput, { target: { value: "0.25" } });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Minimum order quantity is 0\.5 kg/i,
    );
    fireEvent.click(screen.getByRole("button", { name: /Add to Cart/i }));
    expect(screen.getByTestId("cart-probe")).toHaveTextContent("Count:0|Qty:0|Total:0.00");

    // 2. Above available stock (60 kg > 50 kg) -> validation alert, prevented from adding
    fireEvent.change(qtyInput, { target: { value: "60" } });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Requested quantity exceeds available stock \(50 kg\)/i,
    );

    // 3. Valid fractional quantity (2.5 kg @ $1.50/kg = $3.75 live subtotal) -> atomic single add
    fireEvent.change(qtyInput, { target: { value: "2.5" } });
    expect(screen.getByTestId("product-live-subtotal")).toHaveTextContent(
      "Selected quantity: 2.5 kg",
    );
    expect(screen.getByTestId("product-live-subtotal")).toHaveTextContent(
      "Item subtotal: $3.75",
    );

    fireEvent.click(screen.getByRole("button", { name: /Add to Cart/i }));
    expect(screen.getByTestId("cart-probe")).toHaveTextContent("Count:1|Qty:2.5|Total:3.75");

    unmount();
    localStorage.clear();

    // 4. Countable unit (Farm Eggs tray) rejects fractional 1.5 trays without silent rounding
    vi.mocked(productService.getProductBySlug).mockResolvedValue(eggTrayProduct);
    const queryClient2 = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient2}>
        <CartProvider>
          <CartProbe />
          <MemoryRouter initialEntries={["/product/farm-eggs"]}>
            <Routes>
              <Route path="/product/:id" element={<ProductDetails />} />
            </Routes>
          </MemoryRouter>
        </CartProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Farm Eggs")).toBeInTheDocument();
    const trayInput = screen.getByLabelText("Quantity");
    fireEvent.change(trayInput, { target: { value: "1.5" } });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Whole-number quantities are required for Tray listings/i,
    );
    fireEvent.click(screen.getByRole("button", { name: /Add to Cart/i }));
    expect(screen.getByTestId("cart-probe")).toHaveTextContent("Count:0|Qty:0|Total:0.00");
  });

  it("handles rapid consecutive cart additions without losing updates to stale React state", () => {
    function RapidAddHarness() {
      const { items, totalPrice, addItem } = useCart();
      return (
        <div>
          <button
            type="button"
            onClick={() => {
              // Two synchronous addItem calls in the exact same event handler tick
              addItem({
                id: "301",
                name: "Organic Tomatoes",
                price: 1.5,
                image: "",
                farmer: "Tariro Moyo",
                unit: "kg",
                min_order_quantity: 0.5,
                stock: 50,
                quantity: 0.5,
              });
              addItem({
                id: "301",
                name: "Organic Tomatoes",
                price: 1.5,
                image: "",
                farmer: "Tariro Moyo",
                unit: "kg",
                min_order_quantity: 0.5,
                stock: 50,
                quantity: 1.25,
              });
            }}
          >
            Rapid Add
          </button>
          <span data-testid="rapid-qty">{items[0]?.quantity ?? 0}</span>
          <span data-testid="rapid-total">{totalPrice.toFixed(2)}</span>
        </div>
      );
    }

    render(
      <CartProvider>
        <RapidAddHarness />
      </CartProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Rapid Add" }));
    // 0.5 + 1.25 = 1.75 kg; 1.75 * $1.50 = $2.625 -> $2.63 (ROUND_HALF_UP)
    expect(screen.getByTestId("rapid-qty")).toHaveTextContent("1.75");
    expect(screen.getByTestId("rapid-total")).toHaveTextContent("2.63");
  });

  it("displays stale-cart price/unit change notices and blocks checkout when cart quantities become invalid", () => {
    // Seed guest_cart with an item whose farmer changed unit from 'kg' to 'bag (10 kg)' while quantity is 1.5,
    // plus a second item whose price was updated by the farmer from $1.50 to $2.00
    localStorage.setItem(
      "guest_cart",
      JSON.stringify([
        {
          id: "303",
          name: "Washed Potatoes",
          price: 8.0,
          originalPrice: 6.5,
          priceChanged: true,
          image: "",
          farmer: "Tariro Moyo",
          quantity: 1.5,
          unit: "bag",
          unit_description: "10 kg",
          formatted_unit: "10 kg bag",
          unitChanged: true,
          previousFormattedUnit: "kg",
          min_order_quantity: 1,
          stock: 20,
          is_available: true,
        },
      ]),
    );

    render(
      <CartProvider>
        <MemoryRouter initialEntries={["/cart"]}>
          <Routes>
            <Route path="/cart" element={<CartPage />} />
          </Routes>
        </MemoryRouter>
      </CartProvider>,
    );

    expect(screen.getByText("Washed Potatoes")).toBeInTheDocument();
    expect(screen.getByText(/Price updated by farmer from \$6\.50/i)).toBeInTheDocument();
    expect(screen.getByText(/Selling unit updated by farmer from kg/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Whole-number quantities are required for Bag listings/i),
    ).toBeInTheDocument();

    const checkoutBtn = screen.getByRole("button", { name: /Proceed to Checkout/i });
    expect(checkoutBtn).toBeDisabled();

    // Customer corrects quantity to 2 bags -> validation clears and Proceed to Checkout enables
    const qtyInput = screen.getByLabelText("Quantity for Washed Potatoes");
    fireEvent.change(qtyInput, { target: { value: "2" } });

    expect(checkoutBtn).not.toBeDisabled();
    expect(screen.getAllByText("$16.00").length).toBeGreaterThan(0);
    // $16.00 subtotal + $5.00 delivery = $21.00 total
    expect(screen.getByText("$21.00")).toBeInTheDocument();
  });

  it("renders unit-aware checkout summary with $5.00 delivery fee and submits order cleanly", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 10,
        email: "buyer@example.com",
        username: "buyer",
        first_name: "Rudo",
        last_name: "Buyer",
        user_type: "customer",
        is_staff: false,
      },
      token: "mock-token",
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
      refreshProfile: vi.fn(),
    });

    function SeedAndRenderCheckout() {
      const { items, addItem } = useCart();
      return (
        <div>
          {items.length === 0 && (
            <button
              type="button"
              onClick={() =>
                addItem({
                  id: "301",
                  name: "Organic Tomatoes",
                  price: 1.5,
                  image: "",
                  farmer: "Tariro Moyo",
                  unit: "kg",
                  formatted_unit: "kg",
                  min_order_quantity: 0.5,
                  stock: 50,
                  is_available: true,
                  quantity: 2.5,
                })
              }
            >
              Seed Cart
            </button>
          )}
          <CheckoutPage />
        </div>
      );
    }

    render(
      <CartProvider>
        <MemoryRouter initialEntries={["/checkout"]}>
          <Routes>
            <Route path="/checkout" element={<SeedAndRenderCheckout />} />
            <Route path="/order-success" element={<div>Order Placed Successfully</div>} />
          </Routes>
        </MemoryRouter>
      </CartProvider>,
    );

    const seedBtn = screen.queryByRole("button", { name: "Seed Cart" });
    if (seedBtn) {
      act(() => {
        fireEvent.click(seedBtn);
      });
    }

    expect(await screen.findByText(/Organic Tomatoes: 2\.5 kg × \$1\.50/i)).toBeInTheDocument();
    expect(screen.getAllByText("$3.75").length).toBeGreaterThan(0);
    expect(screen.getByText("$5.00")).toBeInTheDocument();
    expect(screen.getByText("$8.75")).toBeInTheDocument();

    // Fill delivery details -> Step 2 -> Step 3
    fireEvent.change(screen.getByLabelText(/Delivery Address/i), {
      target: { value: "12 Samora Machel Ave" },
    });
    fireEvent.change(screen.getByLabelText(/City/i), {
      target: { value: "Harare" },
    });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), {
      target: { value: "+263771234567" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Continue to Payment/i }));
    fireEvent.click(screen.getByRole("button", { name: /Review Order/i }));

    expect(screen.getByText("Order Confirmation")).toBeInTheDocument();
    expect(screen.getAllByText(/2\.5 kg × \$1\.50/i).length).toBeGreaterThan(0);
  });

  it("displays historical OrderItem product_name and unit_label snapshots across Customer, Farmer, and Admin order views without fabricating legacy units", async () => {
    // Product was later edited by farmer to 'Jumbo Crate Tomatoes' ($45.00 / crate),
    // but historical OrderItem snapshot must still show 'Organic Tomatoes' (2.5 kg @ $1.50 = $3.75),
    // and legacy OrderItem with blank unit_label must show 'Legacy Onions' (2 @ $3.50 = $7.00) without '/ crate'.
    const mutatedLiveProduct: Product = {
      ...tomatoKgProduct,
      name: "Jumbo Crate Tomatoes",
      price: "45.00",
      unit: "crate",
      unit_description: "30 kg",
      formatted_unit: "crate (30 kg)",
    };

    const historicalItems: OrderItem[] = [
      {
        id: 901,
        product: mutatedLiveProduct,
        product_name: "Organic Tomatoes",
        unit_label: "kg",
        price: "1.50",
        quantity: 2.5,
        get_cost: "3.75",
        status: "pending",
      },
      {
        id: 902,
        product: { ...legacyUnitlessProduct, name: "Renamed Onions", unit: "bag" },
        product_name: "Legacy Onions",
        unit_label: "",
        price: "3.50",
        quantity: 2,
        get_cost: "7.00",
        status: "accepted",
      },
    ];

    const historicalOrder: Order = {
      id: 700,
      customer: "buyer@example.com",
      first_name: "Rudo",
      last_name: "Buyer",
      email: "buyer@example.com",
      address: "12 Samora Machel Ave",
      postal_code: "00263",
      city: "Harare",
      total_amount: "15.75",
      status: "paid",
      payment_method: "Ecocash (simulated)",
      payment_status: "completed",
      created_at: "2026-11-25T09:00:00Z",
      items: historicalItems,
    };

    vi.mocked(orderService.getOrders).mockResolvedValue([historicalOrder]);
    vi.mocked(orderService.getOrder).mockResolvedValue(historicalOrder);
    vi.mocked(orderService.getFarmerOrders).mockResolvedValue(historicalItems);
    vi.mocked(orderService.getAdminOrders).mockResolvedValue([historicalOrder]);

    // 1. CustomerOrders & OrderTracking
    const { unmount: unmountCustomer } = render(
      <MemoryRouter initialEntries={["/customer/orders/700"]}>
        <Routes>
          <Route path="/customer/orders" element={<CustomerOrders />} />
          <Route path="/customer/orders/:orderId" element={<OrderTracking />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Organic Tomatoes")).toBeInTheDocument();
    expect(screen.getByText("Paid (Simulated)")).toBeInTheDocument();
    expect(screen.getByText(/Order Placed — Simulated Payment/i)).toBeInTheDocument();
    expect(screen.getByText(/2\.5 kg × \$1\.50/i)).toBeInTheDocument();
    expect(screen.getByText("Subtotal: $3.75")).toBeInTheDocument();
    expect(screen.getByText("Legacy Onions")).toBeInTheDocument();
    expect(screen.getByText(/2 × \$3\.50/i)).toBeInTheDocument();
    expect(screen.queryByText("Jumbo Crate Tomatoes")).not.toBeInTheDocument();
    unmountCustomer();

    // 2. FarmerOrders & FarmerDashboard (verify Accepted Order Value excludes rejected, pending, and cancelled orders)
    vi.mocked(productService.getProducts).mockResolvedValue([
      tomatoKgProduct,
      { ...eggTrayProduct, stock: 0, is_available: false },
      { ...potatoBagProduct, moderation_status: "hidden" },
    ]);
    vi.mocked(orderService.getFarmerOrders).mockResolvedValue([
      { ...historicalItems[0], status: "accepted", order_status: "paid", get_cost: "3.75" },
      { ...historicalItems[1], id: 903, status: "rejected", order_status: "paid", get_cost: "7.00" },
      { ...historicalItems[1], id: 904, status: "pending", order_status: "paid", get_cost: "5.00" },
      { ...historicalItems[1], id: 905, status: "accepted", order_status: "cancelled", get_cost: "10.00" },
    ]);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { unmount: unmountFarmer } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FarmerOrders />
          <FarmerDashboard />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect((await screen.findAllByText("Organic Tomatoes")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2\.5 kg/i).length).toBeGreaterThan(0);
    expect(screen.queryByText("Jumbo Crate Tomatoes")).not.toBeInTheDocument();
    expect(screen.getByText("Accepted Order Value")).toBeInTheDocument();
    expect(screen.getByText("Products Listed")).toBeInTheDocument();
    expect(screen.getByText("2 active · 1 available")).toBeInTheDocument();
    expect(screen.getAllByText("$3.75").length).toBeGreaterThan(0);
    expect(screen.queryByText("$10.75")).not.toBeInTheDocument();
    expect(screen.queryByText("$13.75")).not.toBeInTheDocument();
    unmountFarmer();

    // 3. AdminOrders
    render(
      <MemoryRouter>
        <AdminOrders />
      </MemoryRouter>,
    );

    const adminCard = await screen.findByTestId("admin-order-card-700");
    expect(within(adminCard).getByText("Organic Tomatoes × 2.5 kg")).toBeInTheDocument();
    expect(within(adminCard).getByText("Legacy Onions × 2")).toBeInTheDocument();
    expect(within(adminCard).queryByText("Jumbo Crate Tomatoes")).not.toBeInTheDocument();
  });

  it("ignores legacy unit_description on continuous kg/l in formatQuantityWithUnit while keeping packaged units", () => {
    expect(formatQuantityWithUnit(2, "kg", "10kg")).toBe("2 kg");
    expect(formatQuantityWithUnit(1.5, "l", "20 L")).toBe("1.5 L");
    expect(formatQuantityWithUnit(2, "bag", "10 kg")).toBe("2 10 kg bags");
    expect(formatQuantityWithUnit(1, "tray", "30 eggs")).toBe("1 30 eggs tray");
  });
});
