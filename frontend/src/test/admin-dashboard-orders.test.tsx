import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminOrders from "@/pages/admin/AdminOrders";
import { adminService, type AdminDashboardStats } from "@/lib/services/admin-service";
import { orderService, type Order } from "@/lib/services/order-service";
import type { Product } from "@/lib/services/product-service";

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", MockResizeObserver);
});

vi.mock("@/lib/auth-context", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  getAuthErrorMessage: (err: unknown) => (err instanceof Error ? err.message : "Request failed"),
}));

vi.mock("@/lib/services/admin-service", () => ({
  adminService: {
    getDashboardStats: vi.fn(),
  },
}));

vi.mock("@/lib/services/order-service", () => ({
  orderService: {
    getAdminOrders: vi.fn(),
  },
}));

const sampleStats: AdminDashboardStats = {
  total_users: 32,
  total_farmers: 21,
  total_products: 21,
  total_orders: 3,
  verified_payments_enabled: false,
  verified_sales_total: null,
  monthly_activity: [
    { month: "Jun 2026", month_key: "2026-06", orders: 0 },
    { month: "Jul 2026", month_key: "2026-07", orders: 0 },
    { month: "Aug 2026", month_key: "2026-08", orders: 0 },
    { month: "Sep 2026", month_key: "2026-09", orders: 1 },
    { month: "Oct 2026", month_key: "2026-10", orders: 0 },
    { month: "Nov 2026", month_key: "2026-11", orders: 2 },
  ],
};

function makeProduct(id: number, name: string, price: string): Product {
  return {
    id,
    farmer_id: 2,
    farmer_name: "Green Farm",
    farmer_location: "Harare",
    category: 1,
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    description: name,
    price,
    stock: 10,
    image: null,
    is_available: true,
    created_at: "2026-11-20T08:00:00Z",
    updated_at: "2026-11-20T08:00:00Z",
  };
}

const sampleOrders: Order[] = [
  {
    id: 101,
    customer: "alice@example.com",
    first_name: "Alice",
    last_name: "Moyo",
    email: "alice@example.com",
    address: "12 Samora Machel Ave",
    postal_code: "00263",
    city: "Harare",
    total_amount: "18.50",
    status: "paid",
    payment_method: "Ecocash (simulated)",
    payment_status: "completed",
    created_at: "2026-11-23T10:30:00Z",
    items: [
      {
        id: 501,
        product: makeProduct(1, "Organic Spinach", "3.50"),
        price: "3.50",
        quantity: 2,
        get_cost: "7.00",
        status: "accepted",
      },
      {
        id: 502,
        product: makeProduct(2, "Sweet Potatoes", "6.50"),
        price: "6.50",
        quantity: 1,
        get_cost: "6.50",
        status: "pending",
      },
    ],
  },
  {
    id: 102,
    customer: "brian@example.com",
    first_name: "Brian",
    last_name: "Dube",
    email: "brian@example.com",
    address: "44 Churchill Rd",
    postal_code: "00263",
    city: "Bulawayo",
    total_amount: "11.00",
    status: "pending",
    payment_method: "Cash on Delivery",
    payment_status: "pending",
    created_at: "2026-11-24T09:15:00Z",
    items: [
      {
        id: 503,
        product: makeProduct(3, "Red Onions", "6.00"),
        price: "6.00",
        quantity: 1,
        get_cost: "6.00",
        status: "pending",
      },
    ],
  },
];

describe("Section 4.19 — AdminDashboard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders real database statistics, displays Not available for unverified sales, and removes decorative buttons", async () => {
    vi.mocked(adminService.getDashboardStats).mockResolvedValue(sampleStats);

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(/Loading dashboard statistics/i);

    expect(await screen.findByText("32")).toBeInTheDocument();
    expect(screen.getAllByText("21")).toHaveLength(2);
    expect(screen.getByText("Total Sales (Verified)")).toBeInTheDocument();
    expect(screen.getByText("Not available")).toBeInTheDocument();
    expect(screen.getByText("Payment verification not yet enabled")).toBeInTheDocument();
    expect(screen.getByText(/Total non-cancelled orders: 3/i)).toBeInTheDocument();

    // Decorative ADM-004 buttons and demo status text must not exist
    for (const label of ["Block", "Unblock", "Verify", "Reject"]) {
      expect(screen.queryByRole("button", { name: label })).not.toBeInTheDocument();
    }
    expect(screen.queryByText(/Status: Active/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Status: Blocked/i)).not.toBeInTheDocument();
  });

  it("renders explicit 0 values and empty activity message when database counts are zero", async () => {
    vi.mocked(adminService.getDashboardStats).mockResolvedValue({
      total_users: 0,
      total_farmers: 0,
      total_products: 0,
      total_orders: 0,
      verified_payments_enabled: false,
      verified_sales_total: null,
      monthly_activity: sampleStats.monthly_activity.map((m) => ({ ...m, orders: 0 })),
    });

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>,
    );

    expect(await screen.findAllByText("0")).toHaveLength(3);
    expect(screen.getByText(/No order activity recorded in the last 6 months/i)).toBeInTheDocument();
  });

  it("displays error alert and retries on Try Again click", async () => {
    vi.mocked(adminService.getDashboardStats).mockRejectedValueOnce(new Error("Stats service down"));

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>,
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Stats service down");

    vi.mocked(adminService.getDashboardStats).mockResolvedValueOnce(sampleStats);
    fireEvent.click(screen.getByRole("button", { name: /Try Again/i }));
    expect(await screen.findByText("32")).toBeInTheDocument();
  });
});

describe("Section 4.19 — AdminOrders Responsive Cards & Grouped Table", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("groups multiple products under their parent order in both mobile cards and desktop rows without repeating order total per item", async () => {
    vi.mocked(orderService.getAdminOrders).mockResolvedValue(sampleOrders);

    render(
      <MemoryRouter>
        <AdminOrders />
      </MemoryRouter>,
    );

    const mobileCard101 = await screen.findByTestId("admin-order-card-101");
    expect(within(mobileCard101).getByText("Order #101")).toBeInTheDocument();
    expect(within(mobileCard101).getByText("Alice Moyo")).toBeInTheDocument();
    expect(within(mobileCard101).getByText("alice@example.com")).toBeInTheDocument();
    expect(within(mobileCard101).getByText(/Organic Spinach × 2/i)).toBeInTheDocument();
    expect(within(mobileCard101).getByText(/Sweet Potatoes × 1/i)).toBeInTheDocument();
    expect(within(mobileCard101).getByText("Ecocash (simulated)")).toBeInTheDocument();
    // Order total appears exactly once inside the 2-item mobile card
    expect(within(mobileCard101).getAllByText(/\$18\.50/)).toHaveLength(1);

    const desktopRow101 = screen.getByTestId("admin-order-row-101");
    expect(within(desktopRow101).getByText("#101")).toBeInTheDocument();
    expect(within(desktopRow101).getByText(/Organic Spinach × 2/i)).toBeInTheDocument();
    expect(within(desktopRow101).getByText(/Sweet Potatoes × 1/i)).toBeInTheDocument();
    // Order total appears exactly once in the desktop table row for a 2-item order
    expect(within(desktopRow101).getAllByText("$18.50")).toHaveLength(1);
  });

  it("supports searching by order number, customer, or product and filtering by status", async () => {
    vi.mocked(orderService.getAdminOrders).mockResolvedValue(sampleOrders);

    render(
      <MemoryRouter>
        <AdminOrders />
      </MemoryRouter>,
    );

    await screen.findByTestId("admin-order-card-101");
    expect(screen.getByTestId("admin-order-card-102")).toBeInTheDocument();

    // Filter by product name "Sweet Potatoes" -> only Order #101 remains
    const searchInput = screen.getByLabelText(/Search Orders/i);
    fireEvent.change(searchInput, { target: { value: "Sweet Potatoes" } });
    expect(screen.getByTestId("admin-order-card-101")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-order-card-102")).not.toBeInTheDocument();

    // Clear search and filter by status "pending" -> only Order #102 remains
    fireEvent.click(screen.getByRole("button", { name: /Clear/i }));
    fireEvent.change(screen.getByLabelText(/Order Status/i), { target: { value: "pending" } });
    expect(screen.queryByTestId("admin-order-card-101")).not.toBeInTheDocument();
    expect(screen.getByTestId("admin-order-card-102")).toBeInTheDocument();
  });

  it("handles error and retry states on AdminOrders", async () => {
    vi.mocked(orderService.getAdminOrders).mockRejectedValueOnce(new Error("Orders unavailable"));

    render(
      <MemoryRouter>
        <AdminOrders />
      </MemoryRouter>,
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Orders unavailable");

    vi.mocked(orderService.getAdminOrders).mockResolvedValueOnce(sampleOrders);
    fireEvent.click(screen.getByRole("button", { name: /Try Again/i }));
    expect(await screen.findByTestId("admin-order-card-101")).toBeInTheDocument();
  });
});
