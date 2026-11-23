import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AdminLayout from "@/layouts/AdminLayout";
import AdminFarmers from "@/pages/admin/AdminFarmers";
import { useAuth, type User } from "@/lib/auth-context";
import { adminService, type AdminFarmer } from "@/lib/services/admin-service";

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
    getFarmers: vi.fn(),
    createFarmer: vi.fn(),
    approveFarmer: vi.fn(),
    suspendFarmer: vi.fn(),
    reactivateFarmer: vi.fn(),
  },
}));

const generalAdminUser: User = {
  id: 3,
  email: "moderator@farmconnect.co.zw",
  username: "generaladmin",
  first_name: "Rudo",
  last_name: "Mod",
  user_type: "admin",
  is_staff: true,
  is_superuser: false,
  is_active: true,
  admin_role: "general_admin",
};

const pendingFarmer: AdminFarmer = {
  id: 10,
  user_id: 10,
  profile_id: 100,
  first_name: "Kudzai",
  last_name: "Chipo",
  full_name: "Kudzai Chipo",
  email: "kudzai@farm.co.zw",
  phone: "+263771111111",
  username: "kudzai@farm.co.zw",
  is_active: true,
  farm_name: "Chipo Homestead",
  location: "Mutare",
  description: "Vegetables",
  status: "pending",
  status_reason: "",
  status_updated_at: null,
  product_count: 0,
  created_at: "2026-11-20T09:00:00Z",
};

const approvedFarmer: AdminFarmer = {
  id: 11,
  user_id: 11,
  profile_id: 101,
  first_name: "Nyasha",
  last_name: "Moyo",
  full_name: "Nyasha Moyo",
  email: "nyasha@farm.co.zw",
  phone: "+263772222222",
  username: "nyasha@farm.co.zw",
  is_active: true,
  farm_name: "Moyo Valley",
  location: "Harare",
  description: "Tomatoes",
  status: "approved",
  status_reason: "",
  status_updated_at: null,
  product_count: 4,
  created_at: "2026-11-18T09:00:00Z",
};

const suspendedFarmer: AdminFarmer = {
  id: 12,
  user_id: 12,
  profile_id: 102,
  first_name: "Tariro",
  last_name: "Shumba",
  full_name: "Tariro Shumba",
  email: "tariro@farm.co.zw",
  phone: "+263773333333",
  username: "tariro@farm.co.zw",
  is_active: true,
  farm_name: "Shumba Acres",
  location: "Gweru",
  description: "Maize",
  status: "suspended",
  status_reason: "Audit",
  status_updated_at: "2026-11-21T09:00:00Z",
  product_count: 2,
  created_at: "2026-11-15T09:00:00Z",
};

function renderAdminFarmers() {
  vi.mocked(useAuth).mockReturnValue({
    user: generalAdminUser,
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    register: vi.fn(),
    updateProfile: vi.fn(),
    logout: vi.fn(),
  });

  return render(
    <MemoryRouter initialEntries={["/admin/farmers"]}>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="farmers" element={<AdminFarmers />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("Admin Farmer Management", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockIsMobile = false;
    window.scrollTo = vi.fn();
    vi.mocked(adminService.getFarmers).mockResolvedValue({
      count: 3,
      next: null,
      previous: null,
      results: [pendingFarmer, approvedFarmer, suspendedFarmer],
    });
  });

  it("renders actual farmer records with status badges, location, and product counts", async () => {
    renderAdminFarmers();

    expect(await screen.findAllByText("Kudzai Chipo")).not.toHaveLength(0);
    expect(screen.getAllByText("nyasha@farm.co.zw")).not.toHaveLength(0);
    expect(screen.getAllByText("Harare")).not.toHaveLength(0);
    expect(screen.getAllByText("Pending")).not.toHaveLength(0);
    expect(screen.getAllByText("Approved")).not.toHaveLength(0);
    expect(screen.getAllByText("Suspended")).not.toHaveLength(0);
    expect(screen.getAllByText("4")).not.toHaveLength(0);
  });

  it("registers a new farmer via Add Farmer dialog and refreshes list", async () => {
    const newFarmer: AdminFarmer = {
      ...pendingFarmer,
      id: 20,
      user_id: 20,
      first_name: "Chiedza",
      last_name: "Gumbo",
      full_name: "Chiedza Gumbo",
      email: "chiedza@farm.co.zw",
      farm_name: "Gumbo Organics",
      location: "Bulawayo",
    };

    vi.mocked(adminService.createFarmer).mockResolvedValue(newFarmer);
    vi.mocked(adminService.getFarmers)
      .mockResolvedValueOnce({
        count: 1,
        next: null,
        previous: null,
        results: [approvedFarmer],
      })
      .mockResolvedValueOnce({
        count: 2,
        next: null,
        previous: null,
        results: [newFarmer, approvedFarmer],
      });

    renderAdminFarmers();
    await screen.findAllByText("Nyasha Moyo");

    fireEvent.click(screen.getByRole("button", { name: /Add Farmer/i }));
    const dialog = await screen.findByRole("dialog");

    fireEvent.change(within(dialog).getByLabelText(/First Name/i), { target: { value: "Chiedza" } });
    fireEvent.change(within(dialog).getByLabelText(/Last Name/i), { target: { value: "Gumbo" } });
    fireEvent.change(within(dialog).getByLabelText(/Email/i), { target: { value: "chiedza@farm.co.zw" } });
    fireEvent.change(within(dialog).getByLabelText(/Farm Name/i), { target: { value: "Gumbo Organics" } });
    fireEvent.change(within(dialog).getByLabelText(/Public Location/i), { target: { value: "Bulawayo" } });
    fireEvent.change(within(dialog).getByLabelText(/^Initial Password/i), { target: { value: "UniqueFarmPassword987!" } });
    fireEvent.change(within(dialog).getByLabelText(/Confirm Password/i), { target: { value: "UniqueFarmPassword987!" } });

    fireEvent.click(within(dialog).getByRole("button", { name: /Register Farmer/i }));

    await waitFor(() => {
      expect(adminService.createFarmer).toHaveBeenCalledWith({
        first_name: "Chiedza",
        last_name: "Gumbo",
        email: "chiedza@farm.co.zw",
        phone: "",
        farm_name: "Gumbo Organics",
        location: "Bulawayo",
        description: "",
        password: "UniqueFarmPassword987!",
        password_confirm: "UniqueFarmPassword987!",
      });
    });

    expect(await screen.findAllByText("Chiedza Gumbo")).not.toHaveLength(0);
  });

  it("supports approving, suspending, and reactivating farmers with confirmation dialogs", async () => {
    const approvedAfter: AdminFarmer = { ...pendingFarmer, status: "approved" };
    const suspendedAfter: AdminFarmer = { ...approvedFarmer, status: "suspended" };
    const reactivatedAfter: AdminFarmer = { ...suspendedFarmer, status: "approved" };

    vi.mocked(adminService.approveFarmer).mockResolvedValue(approvedAfter);
    vi.mocked(adminService.suspendFarmer).mockResolvedValue(suspendedAfter);
    vi.mocked(adminService.reactivateFarmer).mockResolvedValue(reactivatedAfter);

    renderAdminFarmers();
    await screen.findAllByText("Kudzai Chipo");

    // Approve pending farmer
    fireEvent.click(screen.getAllByRole("button", { name: /^Approve$/i })[0]);
    let alert = await screen.findByRole("alertdialog");
    expect(within(alert).getByRole("heading", { name: "Approve Farmer Account" })).toBeInTheDocument();
    fireEvent.change(within(alert).getByLabelText(/Audit Note/i), { target: { value: "Docs checked" } });
    fireEvent.click(within(alert).getByRole("button", { name: /Approve Farmer/i }));

    await waitFor(() => {
      expect(adminService.approveFarmer).toHaveBeenCalledWith(10, "Docs checked");
    });

    // Suspend
    fireEvent.click(screen.getAllByRole("button", { name: /^Suspend$/i })[0]);
    alert = await screen.findByRole("alertdialog");
    expect(within(alert).getByRole("heading", { name: "Suspend Farmer Account" })).toBeInTheDocument();
    fireEvent.click(within(alert).getByRole("button", { name: /Suspend Farmer/i }));

    await waitFor(() => {
      expect(adminService.suspendFarmer).toHaveBeenCalled();
    });

    // Reactivate
    fireEvent.click(screen.getAllByRole("button", { name: /^Reactivate$/i })[0]);
    alert = await screen.findByRole("alertdialog");
    expect(within(alert).getByRole("heading", { name: "Reactivate Farmer Account" })).toBeInTheDocument();
    fireEvent.click(within(alert).getByRole("button", { name: /Reactivate Farmer/i }));

    await waitFor(() => {
      expect(adminService.reactivateFarmer).toHaveBeenCalledWith(12, "");
    });
  });

  it("supports search, status filtering, and pagination", async () => {
    vi.mocked(adminService.getFarmers).mockResolvedValue({
      count: 24,
      next: "/api/v1/auth/admin/farmers/?page=2",
      previous: null,
      results: [approvedFarmer],
    });

    renderAdminFarmers();
    await screen.findAllByText("Nyasha Moyo");

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "approved" } });
    await waitFor(() => {
      expect(adminService.getFarmers).toHaveBeenLastCalledWith({
        page: 1,
        page_size: 12,
        status: "approved",
      });
    });

    fireEvent.change(screen.getByLabelText("Search Farmers"), { target: { value: "Harare" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => {
      expect(adminService.getFarmers).toHaveBeenLastCalledWith({
        page: 1,
        page_size: 12,
        search: "Harare",
        status: "approved",
      });
    });

    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    await waitFor(() => {
      expect(adminService.getFarmers).toHaveBeenLastCalledWith({
        page: 2,
        page_size: 12,
        search: "Harare",
        status: "approved",
      });
    });
  });

  it("handles mobile drawer navigation, error retry, and empty state", async () => {
    mockIsMobile = true;
    vi.mocked(adminService.getFarmers).mockRejectedValueOnce(new Error("Network timeout"));
    renderAdminFarmers();

    expect(await screen.findByText("Network timeout")).toBeInTheDocument();

    vi.mocked(adminService.getFarmers).mockResolvedValueOnce({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });

    fireEvent.click(screen.getByRole("button", { name: /Try Again/i }));
    expect(await screen.findByText("No farmer accounts found.")).toBeInTheDocument();

    // Mobile drawer auto-close check
    fireEvent.click(screen.getByRole("button", { name: /Toggle navigation menu/i }));
    expect(await screen.findByRole("button", { name: /Close navigation menu/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: /^Farmers$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Close navigation menu/i })).not.toBeInTheDocument();
    });
  });
});
