import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AdminLayout from "@/layouts/AdminLayout";
import AdminReviews from "@/pages/admin/AdminReviews";
import { useAuth, type User } from "@/lib/auth-context";
import {
  adminService,
  type AdminPlatformTestimonial,
  type AdminProductReview,
} from "@/lib/services/admin-service";

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", MockResizeObserver);
});

const toastMock = vi.fn();

vi.mock("@/lib/auth-context", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: vi.fn(),
  getAuthErrorMessage: (err: unknown) => (err instanceof Error ? err.message : "Request failed"),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/lib/services/admin-service", () => ({
  adminService: {
    getProductReviews: vi.fn(),
    moderateProductReview: vi.fn(),
    getTestimonials: vi.fn(),
    moderateTestimonial: vi.fn(),
  },
}));

const generalAdmin: User = {
  id: 3,
  email: "moderator@farmconnect.co.zw",
  username: "generaladmin",
  first_name: "Rudo",
  last_name: "Mod",
  user_type: "admin",
  is_staff: true,
  is_superuser: false,
  admin_role: "general_admin",
};

const pendingReview: AdminProductReview = {
  id: 101,
  product: 10,
  product_name: "Organic Tomatoes",
  product_slug: "organic-tomatoes",
  customer_id: 21,
  customer_email: "alice@example.com",
  customer_name: "Alice Moyo",
  rating: 5,
  title: "Very fresh",
  comment: "Crisp red tomatoes arrived on time.",
  status: "pending",
  verified_purchase: false,
  moderated_by: null,
  moderated_by_email: null,
  moderated_at: null,
  created_at: "2026-11-20T09:00:00Z",
  updated_at: "2026-11-20T09:00:00Z",
};

const approvedReview: AdminProductReview = {
  ...pendingReview,
  id: 102,
  status: "approved",
  moderated_by: 3,
  moderated_by_email: "moderator@farmconnect.co.zw",
  moderated_at: "2026-11-21T10:00:00Z",
};

const pendingTestimonial: AdminPlatformTestimonial = {
  id: 201,
  customer_id: 22,
  customer_email: "brian@example.com",
  customer_name: "Brian Dube",
  effective_display_name: "Brian D.",
  display_name: "Brian D.",
  role_or_title: "Home Cook",
  rating: 4,
  comment: "Easy ordering directly from local farmers.",
  consent_public: true,
  status: "pending",
  is_verified_buyer: false,
  moderated_by: null,
  moderated_by_email: null,
  moderated_at: null,
  created_at: "2026-11-22T08:00:00Z",
  updated_at: "2026-11-22T08:00:00Z",
};

function renderAdminReviews(initialPath = "/admin/reviews") {
  vi.mocked(useAuth).mockReturnValue({
    user: generalAdmin,
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    register: vi.fn(),
    updateProfile: vi.fn(),
    logout: vi.fn(),
  });
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="reviews" element={<AdminReviews />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("Admin Reviews & Testimonials Moderation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    window.scrollTo = vi.fn();
    vi.mocked(adminService.getProductReviews).mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [pendingReview],
    });
    vi.mocked(adminService.getTestimonials).mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [pendingTestimonial],
    });
  });

  it("shows Reviews & Testimonials link in AdminLayout sidebar and renders pending reviews", async () => {
    renderAdminReviews();

    const navLink = screen.getByRole("link", { name: /Reviews & Testimonials/i });
    expect(navLink).toHaveAttribute("href", "/admin/reviews");

    expect(await screen.findAllByText("Organic Tomatoes")).not.toHaveLength(0);
    expect(screen.getAllByText("Alice Moyo")).not.toHaveLength(0);
    expect(screen.getAllByText("alice@example.com")).not.toHaveLength(0);
    expect(adminService.getProductReviews).toHaveBeenCalledWith({
      page: 1,
      page_size: 12,
      status: "pending",
    });
  });

  it("switches to Platform Testimonials tab and filters by status without repeating current action", async () => {
    vi.mocked(adminService.getProductReviews)
      .mockResolvedValueOnce({
        count: 1,
        next: null,
        previous: null,
        results: [pendingReview],
      })
      .mockResolvedValueOnce({
        count: 1,
        next: null,
        previous: null,
        results: [approvedReview],
      });

    renderAdminReviews();
    await screen.findAllByText("Organic Tomatoes");

    // Filter product reviews to Approved -> only Reject button should be rendered (no Approve)
    fireEvent.click(screen.getByRole("button", { name: "Approved" }));
    await waitFor(() =>
      expect(adminService.getProductReviews).toHaveBeenLastCalledWith({
        page: 1,
        page_size: 12,
        status: "approved",
      }),
    );
    expect(screen.queryByRole("button", { name: /^Approve$/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Reject$/i })).not.toHaveLength(0);

    // Switch to Platform Testimonials tab (Radix Tabs activates on mouseDown/focus)
    const testimonialsTab = screen.getByRole("tab", { name: "Platform Testimonials" });
    fireEvent.mouseDown(testimonialsTab);
    fireEvent.click(testimonialsTab);
    expect(await screen.findAllByText("Brian Dube")).not.toHaveLength(0);
    expect(adminService.getTestimonials).toHaveBeenCalledWith({
      page: 1,
      page_size: 12,
      status: "pending",
    });
  });

  it("approves a pending product review through the confirmation dialog with optional reason", async () => {
    vi.mocked(adminService.moderateProductReview).mockResolvedValue(approvedReview);
    renderAdminReviews();
    await screen.findAllByText("Organic Tomatoes");

    const approveButtons = screen.getAllByRole("button", { name: /^Approve$/i });
    fireEvent.click(approveButtons[0]);

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Approve submission?")).toBeInTheDocument();

    const reasonInput = within(dialog).getByLabelText(/Audit Note \/ Reason/i);
    fireEvent.change(reasonInput, { target: { value: "Verified genuine review" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^Approve$/i }));

    await waitFor(() =>
      expect(adminService.moderateProductReview).toHaveBeenCalledWith(
        101,
        "approved",
        "Verified genuine review",
      ),
    );
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Submission approved" }),
    );
  });

  it("rejects a pending platform testimonial through the confirmation dialog", async () => {
    vi.mocked(adminService.moderateTestimonial).mockResolvedValue({
      ...pendingTestimonial,
      status: "rejected",
    });

    renderAdminReviews();
    await screen.findAllByText("Organic Tomatoes");
    const testimonialsTab = screen.getByRole("tab", { name: "Platform Testimonials" });
    fireEvent.mouseDown(testimonialsTab);
    fireEvent.click(testimonialsTab);
    await screen.findAllByText("Brian Dube");

    const rejectButtons = screen.getAllByRole("button", { name: /^Reject$/i });
    fireEvent.click(rejectButtons[0]);

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Reject submission?")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /^Reject$/i }));

    await waitFor(() =>
      expect(adminService.moderateTestimonial).toHaveBeenCalledWith(201, "rejected", ""),
    );
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Submission rejected" }),
    );
  });

  it("handles pagination controls and search", async () => {
    vi.mocked(adminService.getProductReviews).mockResolvedValue({
      count: 25,
      next: "/api/v1/reviews/admin/products/?page=2",
      previous: null,
      results: [pendingReview],
    });

    renderAdminReviews();
    await screen.findAllByText("Organic Tomatoes");
    expect(screen.getByText(/Page 1 of 3/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    await waitFor(() =>
      expect(adminService.getProductReviews).toHaveBeenLastCalledWith({
        page: 2,
        page_size: 12,
        status: "pending",
      }),
    );

    const searchInput = screen.getByPlaceholderText(/Customer, email, product, or text/i);
    fireEvent.change(searchInput, { target: { value: "Tomatoes" } });
    fireEvent.submit(searchInput.closest("form")!);

    await waitFor(() =>
      expect(adminService.getProductReviews).toHaveBeenLastCalledWith({
        page: 1,
        page_size: 12,
        status: "pending",
        search: "Tomatoes",
      }),
    );
  });

  it("displays loading and error retry states cleanly", async () => {
    vi.mocked(adminService.getProductReviews).mockRejectedValueOnce(new Error("Server unavailable"));

    renderAdminReviews();
    expect(screen.getByRole("status")).toHaveTextContent(/Loading product reviews/i);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Server unavailable");

    vi.mocked(adminService.getProductReviews).mockResolvedValueOnce({
      count: 1,
      next: null,
      previous: null,
      results: [pendingReview],
    });
    fireEvent.click(screen.getByRole("button", { name: /Try Again/i }));
    expect(await screen.findAllByText("Organic Tomatoes")).not.toHaveLength(0);
  });
});
