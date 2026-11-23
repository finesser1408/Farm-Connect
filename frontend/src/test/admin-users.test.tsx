import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AdminLayout from "@/layouts/AdminLayout";
import AdminUsers from "@/pages/admin/AdminUsers";
import { useAuth, type User } from "@/lib/auth-context";
import { adminService, type AdminUser } from "@/lib/services/admin-service";

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", MockResizeObserver);
});

const toastMock = vi.fn();
let mockIsMobile = false;

vi.mock("@/lib/auth-context", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: vi.fn(),
  getAuthErrorMessage: (err: unknown) => (err instanceof Error ? err.message : "Request failed"),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockIsMobile,
}));

vi.mock("@/lib/services/admin-service", () => ({
  adminService: {
    getUsers: vi.fn(),
    updateUserRole: vi.fn(),
    updateUserStatus: vi.fn(),
  },
}));

const superAdminUser: AdminUser = {
  id: 1,
  email: "super@farmconnect.co.zw",
  username: "superadmin",
  first_name: "Tariro",
  last_name: "Chief",
  user_type: "admin",
  is_staff: true,
  is_superuser: true,
  is_active: true,
  is_verified: true,
  admin_role: "super_admin",
  created_at: "2026-10-01T08:00:00Z",
};

const otherSuperAdmin: AdminUser = {
  id: 2,
  email: "super2@farmconnect.co.zw",
  username: "superadmin2",
  first_name: "Second",
  last_name: "Super",
  user_type: "admin",
  is_staff: true,
  is_superuser: true,
  is_active: true,
  is_verified: true,
  admin_role: "super_admin",
  created_at: "2026-10-02T08:00:00Z",
};

const generalAdminUser: AdminUser = {
  id: 3,
  email: "moderator@farmconnect.co.zw",
  username: "generaladmin",
  first_name: "Rudo",
  last_name: "Mod",
  user_type: "admin",
  is_staff: true,
  is_superuser: false,
  is_active: true,
  is_verified: true,
  admin_role: "general_admin",
  created_at: "2026-10-05T08:00:00Z",
};

const customerUser: AdminUser = {
  id: 4,
  email: "buyer@example.com",
  username: "buyer",
  first_name: "Jane",
  last_name: "Shopper",
  user_type: "customer",
  is_staff: false,
  is_superuser: false,
  is_active: true,
  is_verified: false,
  admin_role: null,
  created_at: "2026-10-10T08:00:00Z",
};

const suspendedFarmerUser: AdminUser = {
  id: 5,
  email: "farmer@example.com",
  username: "farmer1",
  first_name: "Tendai",
  last_name: "Grower",
  user_type: "farmer",
  is_staff: false,
  is_superuser: false,
  is_active: false,
  is_verified: true,
  admin_role: null,
  created_at: "2026-10-12T08:00:00Z",
  farmer_profile: {
    farm_name: "Mazowe Greens",
    location: "Mazowe",
    description: "",
  },
};

function mockCurrentUser(user: User) {
  vi.mocked(useAuth).mockReturnValue({
    user,
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    register: vi.fn(),
    updateProfile: vi.fn(),
    logout: vi.fn(),
  });
}

function renderAdminUsers(user: User) {
  mockCurrentUser(user);
  return render(
    <MemoryRouter initialEntries={["/admin/users"]}>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="users" element={<AdminUsers />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("Admin User Management", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockIsMobile = false;
    window.scrollTo = vi.fn();
    vi.mocked(adminService.getUsers).mockResolvedValue({
      count: 5,
      next: null,
      previous: null,
      results: [superAdminUser, otherSuperAdmin, generalAdminUser, customerUser, suspendedFarmerUser],
    });
  });

  it("displays database users for Super Admin and enforces self and Super Admin protection", async () => {
    renderAdminUsers(superAdminUser);

    expect(await screen.findAllByText("Jane Shopper")).not.toHaveLength(0);
    expect(screen.getAllByText("buyer@example.com")).not.toHaveLength(0);
    expect(screen.getAllByText("Rudo Mod")).not.toHaveLength(0);
    expect(screen.getAllByText("Tendai Grower")).not.toHaveLength(0);

    // Self & another Super Admin should be marked protected/your account
    expect(screen.getAllByText("Your Account")).not.toHaveLength(0);
    expect(screen.getAllByText("Protected")).not.toHaveLength(0);

    // Eligible users have action buttons
    expect(screen.getAllByRole("button", { name: /Make Admin/i })).not.toHaveLength(0);
    expect(screen.getAllByRole("button", { name: /Revoke Admin/i })).not.toHaveLength(0);
    expect(screen.getAllByRole("button", { name: /Suspend/i })).not.toHaveLength(0);
    expect(screen.getAllByRole("button", { name: /Reactivate/i })).not.toHaveLength(0);
  });

  it("allows Super Admin to promote a customer to General Admin with confirmation", async () => {
    const promotedCustomer: AdminUser = {
      ...customerUser,
      user_type: "admin",
      is_staff: true,
      admin_role: "general_admin",
    };

    vi.mocked(adminService.updateUserRole).mockResolvedValue(promotedCustomer);
    vi.mocked(adminService.getUsers)
      .mockResolvedValueOnce({
        count: 2,
        next: null,
        previous: null,
        results: [superAdminUser, customerUser],
      })
      .mockResolvedValueOnce({
        count: 2,
        next: null,
        previous: null,
        results: [superAdminUser, promotedCustomer],
      });

    renderAdminUsers(superAdminUser);

    const makeAdminButtons = await screen.findAllByRole("button", { name: /Make Admin/i });
    fireEvent.click(makeAdminButtons[0]);

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByRole("heading", { name: "Promote to General Admin" })).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText(/Audit Note/i), {
      target: { value: "Operations lead" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /Promote to General Admin/i }));

    await waitFor(() => {
      expect(adminService.updateUserRole).toHaveBeenCalledWith(4, "general_admin", "Operations lead");
    });
    expect(await screen.findAllByRole("button", { name: /Revoke Admin/i })).not.toHaveLength(0);
  });

  it("allows Super Admin to suspend a General Admin and updates the row immediately", async () => {
    const suspendedAdmin: AdminUser = { ...generalAdminUser, is_active: false };
    vi.mocked(adminService.updateUserStatus).mockResolvedValue(suspendedAdmin);
    vi.mocked(adminService.getUsers)
      .mockResolvedValueOnce({
        count: 2,
        next: null,
        previous: null,
        results: [superAdminUser, generalAdminUser],
      })
      .mockResolvedValueOnce({
        count: 2,
        next: null,
        previous: null,
        results: [superAdminUser, suspendedAdmin],
      });

    renderAdminUsers(superAdminUser);

    const suspendButtons = await screen.findAllByRole("button", { name: /Suspend/i });
    fireEvent.click(suspendButtons[0]);

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Suspend User Account")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /Suspend Account/i }));

    await waitFor(() => {
      expect(adminService.updateUserStatus).toHaveBeenCalledWith(3, false, "");
    });
    expect(await screen.findAllByRole("button", { name: /Reactivate/i })).not.toHaveLength(0);
  });

  it("hides privileged role and status management controls from General Admins", async () => {
    renderAdminUsers(generalAdminUser);

    expect(await screen.findAllByText("Jane Shopper")).not.toHaveLength(0);
    expect(screen.getByText("General Admin (View Only)")).toBeInTheDocument();
    expect(screen.getAllByText("View only")).not.toHaveLength(0);

    expect(screen.queryByRole("button", { name: /Make Admin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Revoke Admin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Suspend/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reactivate/i })).not.toBeInTheDocument();
  });

  it("supports search, role filter, status filter, and pagination", async () => {
    vi.mocked(adminService.getUsers).mockResolvedValue({
      count: 20,
      next: "/api/v1/auth/admin/users/?page=2",
      previous: null,
      results: [customerUser],
    });

    renderAdminUsers(superAdminUser);
    await screen.findAllByText("Jane Shopper");

    // Role filter
    fireEvent.change(screen.getByLabelText("Role"), { target: { value: "customer" } });
    await waitFor(() => {
      expect(adminService.getUsers).toHaveBeenLastCalledWith({
        page: 1,
        page_size: 12,
        role: "customer",
      });
    });

    // Status filter
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "active" } });
    await waitFor(() => {
      expect(adminService.getUsers).toHaveBeenLastCalledWith({
        page: 1,
        page_size: 12,
        role: "customer",
        status: "active",
      });
    });

    // Search
    fireEvent.change(screen.getByLabelText("Search Users"), { target: { value: "Jane" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => {
      expect(adminService.getUsers).toHaveBeenLastCalledWith({
        page: 1,
        page_size: 12,
        search: "Jane",
        role: "customer",
        status: "active",
      });
    });

    // Pagination Next
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    await waitFor(() => {
      expect(adminService.getUsers).toHaveBeenLastCalledWith({
        page: 2,
        page_size: 12,
        search: "Jane",
        role: "customer",
        status: "active",
      });
    });
  });

  it("renders error and empty states cleanly", async () => {
    vi.mocked(adminService.getUsers).mockRejectedValueOnce(new Error("Server error"));
    renderAdminUsers(superAdminUser);

    expect(await screen.findByText("Server error")).toBeInTheDocument();

    vi.mocked(adminService.getUsers).mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    fireEvent.click(screen.getByRole("button", { name: /Try Again/i }));
    expect(await screen.findByText("No registered users found.")).toBeInTheDocument();
  });

  it("renders mobile drawer navigation and responsive user cards cleanly", async () => {
    mockIsMobile = true;
    renderAdminUsers(superAdminUser);

    expect(await screen.findAllByText("Jane Shopper")).not.toHaveLength(0);

    // Mobile trigger opens drawer with Logout and menu links
    fireEvent.click(screen.getByRole("button", { name: /Toggle navigation menu/i }));
    expect(await screen.findByRole("button", { name: /Close navigation menu/i })).toBeInTheDocument();
    const usersLink = screen.getByRole("link", { name: /^Users$/i });
    fireEvent.click(usersLink);

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Close navigation menu/i })).not.toBeInTheDocument();
    });
  });
});
