import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AdminLayout from "@/layouts/AdminLayout";
import AdminFarmers from "@/pages/admin/AdminFarmers";
import AdminProducts from "@/pages/admin/AdminProducts";
import { useAuth, type User } from "@/lib/auth-context";
import { adminService, type AdminFarmer } from "@/lib/services/admin-service";
import { productService, type Category, type Product } from "@/lib/services/product-service";

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", MockResizeObserver);
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => "blob:mock-preview"),
    revokeObjectURL: vi.fn(),
  });
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

vi.mock("@/lib/services/product-service", () => ({
  productService: {
    getProducts: vi.fn(),
    getCategories: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    hideProduct: vi.fn(),
    restoreProduct: vi.fn(),
    removeProduct: vi.fn(),
    deleteProduct: vi.fn(),
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
  product_count: 2,
  created_at: "2026-11-18T09:00:00Z",
};

const suspendedFarmer: AdminFarmer = {
  ...approvedFarmer,
  id: 12,
  user_id: 12,
  profile_id: 102,
  first_name: "Tendai",
  last_name: "Dube",
  full_name: "Tendai Dube",
  email: "tendai@farm.co.zw",
  farm_name: "Paused Plot",
  status: "suspended",
  product_count: 1,
};

const sampleCategories: Category[] = [
  { id: 1, name: "Vegetables", slug: "vegetables", description: "Fresh vegetables" },
  { id: 2, name: "Fruits", slug: "fruits", description: "Orchard fruits" },
];

const activeProduct: Product = {
  id: 50,
  farmer_id: 11,
  farmer_name: "Nyasha Moyo",
  farmer_location: "Harare",
  farmer_status: "approved",
  category: 1,
  category_details: sampleCategories[0],
  name: "Heirloom Tomatoes",
  slug: "heirloom-tomatoes",
  description: "Vine-ripened red tomatoes",
  price: "4.50",
  stock: 20,
  unit: "kg",
  unit_display: "Kilogram",
  unit_description: "",
  formatted_unit: "kg",
  is_countable_unit: false,
  min_order_quantity: 1,
  image: null,
  is_available: true,
  moderation_status: "active",
  moderation_reason: "",
  moderated_at: null,
  moderated_by: null,
  moderated_by_email: null,
  created_at: "2026-11-20T09:00:00Z",
  updated_at: "2026-11-20T09:00:00Z",
};

const hiddenProduct: Product = {
  ...activeProduct,
  id: 51,
  name: "Organic Spinach",
  slug: "organic-spinach",
  moderation_status: "hidden",
  moderation_reason: "Pending quality check",
};

const removedProduct: Product = {
  ...activeProduct,
  id: 52,
  name: "Discontinued Kale",
  slug: "discontinued-kale",
  moderation_status: "removed",
  moderation_reason: "Season ended",
};

function renderAdminProducts(user: User = generalAdminUser) {
  vi.mocked(useAuth).mockReturnValue({
    user,
    token: "mock-token",
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    refreshProfile: vi.fn(),
  });

  return render(
    <MemoryRouter initialEntries={["/admin/products"]}>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="products" element={<AdminProducts />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function renderAdminFarmers(user: User = generalAdminUser) {
  vi.mocked(useAuth).mockReturnValue({
    user,
    token: "mock-token",
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    refreshProfile: vi.fn(),
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

describe("Admin Product Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMobile = false;
    vi.mocked(productService.getCategories).mockResolvedValue(sampleCategories);
    vi.mocked(adminService.getFarmers).mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: [approvedFarmer, suspendedFarmer],
    });
    vi.mocked(productService.getProducts).mockResolvedValue({
      count: 3,
      next: null,
      previous: null,
      results: [activeProduct, hiddenProduct, removedProduct],
    });
  });

  it("loads central product listings with search, farmer, category, and moderation filters", async () => {
    renderAdminProducts();

    await waitFor(() => {
      expect(screen.getAllByText("Heirloom Tomatoes").length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText("Organic Spinach").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Discontinued Kale").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Archived (orders & reviews preserved)").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Moderation"), {
      target: { value: "hidden" },
    });

    await waitFor(() => {
      expect(productService.getProducts).toHaveBeenLastCalledWith(
        expect.objectContaining({
          available: "all",
          moderation_status: "hidden",
          page: 1,
        }),
      );
    });

    fireEvent.change(screen.getByLabelText("Farmer"), {
      target: { value: "11" },
    });

    await waitFor(() => {
      expect(productService.getProducts).toHaveBeenLastCalledWith(
        expect.objectContaining({
          farmer_id: 11,
          moderation_status: "hidden",
        }),
      );
    });
  });

  it("allows admin to add a product only for approved farmers", async () => {
    vi.mocked(productService.createProduct).mockResolvedValue({
      ...activeProduct,
      id: 60,
      name: "Sweet Corn",
      slug: "sweet-corn",
    });

    renderAdminProducts();

    await waitFor(() => {
      expect(screen.getAllByText("Heirloom Tomatoes").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: /add product/i }));

    const dialog = await screen.findByRole("dialog");
    const farmerSelect = within(dialog).getByLabelText(/approved farmer/i);
    // Suspended farmer must not be offered as an eligible target
    expect(within(farmerSelect).queryByText(/tendai dube/i)).not.toBeInTheDocument();

    fireEvent.change(farmerSelect, { target: { value: "11" } });
    fireEvent.change(within(dialog).getByLabelText(/product name/i), {
      target: { value: "Sweet Corn" },
    });
    fireEvent.change(within(dialog).getByLabelText(/price/i), {
      target: { value: "3.25" },
    });
    fireEvent.change(within(dialog).getByLabelText(/stock/i), {
      target: { value: "15" },
    });
    fireEvent.change(within(dialog).getByLabelText(/description/i), {
      target: { value: "Fresh morning harvest corn" },
    });

    fireEvent.click(within(dialog).getByRole("button", { name: /create product/i }));

    await waitFor(() => {
      expect(productService.createProduct).toHaveBeenCalledTimes(1);
    });

    const submittedForm = vi.mocked(productService.createProduct).mock.calls[0][0] as FormData;
    expect(submittedForm.get("farmer_id")).toBe("11");
    expect(submittedForm.get("name")).toBe("Sweet Corn");
    expect(submittedForm.get("price")).toBe("3.25");
    expect(submittedForm.get("stock")).toBe("15");
  });

  it("supports edit, hide, restore, and soft-remove moderation flows with confirmation", async () => {
    vi.mocked(productService.updateProduct).mockResolvedValue({
      ...activeProduct,
      name: "Updated Tomatoes",
    });
    vi.mocked(productService.hideProduct).mockResolvedValue({
      ...activeProduct,
      moderation_status: "hidden",
    });
    vi.mocked(productService.restoreProduct).mockResolvedValue({
      ...hiddenProduct,
      moderation_status: "active",
    });
    vi.mocked(productService.removeProduct).mockResolvedValue({
      ...activeProduct,
      moderation_status: "removed",
    });

    renderAdminProducts();

    await waitFor(() => {
      expect(screen.getAllByText("Heirloom Tomatoes").length).toBeGreaterThan(0);
    });

    // Edit active product
    fireEvent.click(screen.getAllByRole("button", { name: "Edit Heirloom Tomatoes" })[0]);
    const editDialog = await screen.findByRole("dialog");
    fireEvent.change(within(editDialog).getByLabelText(/product name/i), {
      target: { value: "Updated Tomatoes" },
    });
    fireEvent.click(within(editDialog).getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(productService.updateProduct).toHaveBeenCalledWith(
        "heirloom-tomatoes",
        expect.any(FormData),
      );
    });

    // Hide active product with audit note
    fireEvent.click(screen.getAllByRole("button", { name: "Hide Heirloom Tomatoes" })[0]);
    const hideDialog = await screen.findByRole("alertdialog");
    fireEvent.change(within(hideDialog).getByLabelText(/audit note/i), {
      target: { value: "Quality review" },
    });
    fireEvent.click(within(hideDialog).getByRole("button", { name: "Hide Product" }));

    await waitFor(() => {
      expect(productService.hideProduct).toHaveBeenCalledWith("heirloom-tomatoes", "Quality review");
    });

    // Restore hidden product
    fireEvent.click(screen.getAllByRole("button", { name: "Restore Organic Spinach" })[0]);
    const restoreDialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(restoreDialog).getByRole("button", { name: "Restore Product" }));

    await waitFor(() => {
      expect(productService.restoreProduct).toHaveBeenCalledWith("organic-spinach", "");
    });

    // Remove product safely
    fireEvent.click(screen.getAllByRole("button", { name: "Remove Heirloom Tomatoes" })[0]);
    const removeDialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(removeDialog).getByRole("button", { name: "Remove Product" }));

    await waitFor(() => {
      expect(productService.removeProduct).toHaveBeenCalledWith("heirloom-tomatoes", "");
    });
  });

  it("opens selected farmer products from AdminFarmers with locked farmer context and blocks adding for suspended farmer", async () => {
    renderAdminFarmers();

    await waitFor(() => {
      expect(screen.getAllByText("Nyasha Moyo").length).toBeGreaterThan(0);
    });

    // Open Approved Farmer's products
    fireEvent.click(screen.getAllByRole("button", { name: "View products for Nyasha Moyo" })[0]);

    await waitFor(() => {
      expect(screen.getByText("Nyasha Moyo — Products")).toBeInTheDocument();
    });
    expect(productService.getProducts).toHaveBeenLastCalledWith(
      expect.objectContaining({
        farmer_id: 11,
        available: "all",
      }),
    );

    // Add Product dialog locks farmer instead of rendering selector
    fireEvent.click(screen.getByRole("button", { name: /add product/i }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByLabelText(/approved farmer/i)).not.toBeInTheDocument();
    expect(within(dialog).getByText(/nyasha moyo \(moyo valley\)/i)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /cancel/i }));

    // Return to Farmers list and check Suspended Farmer
    fireEvent.click(screen.getByRole("button", { name: /back to farmers/i }));
    await waitFor(() => {
      expect(screen.getByText("Farmer Management")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole("button", { name: "View products for Tendai Dube" })[0]);
    await waitFor(() => {
      expect(screen.getByText("Tendai Dube — Products")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /add product/i })).toBeDisabled();
    expect(screen.getByText(/farmer must be approved before adding products/i)).toBeInTheDocument();
  });

  it("renders responsive mobile product cards without breaking actions", async () => {
    mockIsMobile = true;
    renderAdminProducts();

    await waitFor(() => {
      expect(screen.getAllByText("Heirloom Tomatoes").length).toBeGreaterThan(0);
    });

    expect(screen.getAllByRole("button", { name: "Hide Heirloom Tomatoes" }).length).toBeGreaterThan(0);
  });

  it("displays legacy unitless warning in admin edit dialog and requires a selling unit before saving", async () => {
    const legacyProduct: Product = {
      ...activeProduct,
      id: 77,
      name: "Legacy Test Cabbage",
      slug: "legacy-test-cabbage",
      unit: null,
      formatted_unit: "",
    };
    vi.mocked(productService.getProducts).mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [legacyProduct],
    });
    vi.mocked(productService.updateProduct).mockResolvedValue({
      ...legacyProduct,
      unit: "head",
      formatted_unit: "head",
    });

    renderAdminProducts();

    await waitFor(() => {
      expect(screen.getAllByText("Legacy Test Cabbage").length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText(/No unit/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: "Edit Legacy Test Cabbage" })[0]);
    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByText(/Legacy Product Without Selling Unit/i)).toBeInTheDocument();

    // Attempting to save without selecting a unit is blocked
    fireEvent.click(within(dialog).getByRole("button", { name: /save changes/i }));
    expect(await within(dialog).findByText(/Please select a valid selling unit/i)).toBeInTheDocument();
    expect(productService.updateProduct).not.toHaveBeenCalled();

    // Select 'head' unit and save
    fireEvent.change(within(dialog).getByLabelText(/selling unit/i), {
      target: { value: "head" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(productService.updateProduct).toHaveBeenCalledWith(
        "legacy-test-cabbage",
        expect.any(FormData),
      );
    });
    const payload = vi.mocked(productService.updateProduct).mock.calls[0][1] as FormData;
    expect(payload.get("unit")).toBe("head");
  });
});
