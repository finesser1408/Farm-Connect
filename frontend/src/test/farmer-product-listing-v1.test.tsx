import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AddProduct from "@/pages/farmer/AddProduct";
import FarmerProducts from "@/pages/farmer/FarmerProducts";
import { useAuth } from "@/lib/auth-context";
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
    createObjectURL: vi.fn(() => "blob:farmer-preview-url"),
    revokeObjectURL: vi.fn(),
  });
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

vi.mock("@/lib/services/product-service", () => ({
  productService: {
    getProducts: vi.fn(),
    getCategories: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
  },
}));

const sampleCategories: Category[] = [
  { id: 1, name: "Vegetables", slug: "vegetables", description: "Fresh vegetables" },
  { id: 2, name: "Livestock & Poultry", slug: "livestock-poultry", description: "Eggs & poultry" },
];

const existingTomatoProduct: Product = {
  id: 101,
  farmer_id: 1,
  farmer_name: "Tariro Moyo",
  farmer_location: "Harare",
  farmer_status: "approved",
  category: 1,
  category_details: sampleCategories[0],
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
  moderation_status: "active",
  created_at: "2026-11-24T10:00:00Z",
  updated_at: "2026-11-24T10:00:00Z",
};

const legacyUnitlessProduct: Product = {
  ...existingTomatoProduct,
  id: 102,
  name: "Legacy Butternut",
  slug: "legacy-butternut",
  price: "3.00",
  stock: 15,
  unit: null,
  unit_display: null,
  unit_description: "",
  formatted_unit: "",
  is_countable_unit: true,
  min_order_quantity: 1,
};

function renderFarmerRoutes(initialPath: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/farmer/products" element={<FarmerProducts />} />
          <Route path="/farmer/products/new" element={<AddProduct />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...utils, invalidateSpy };
}

describe("Product Listing V1 — Farmer AddProduct, Preview, and Editing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 1,
        email: "farmer@example.com",
        username: "farmer@example.com",
        first_name: "Tariro",
        last_name: "Moyo",
        user_type: "farmer",
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
    vi.mocked(productService.getCategories).mockResolvedValue(sampleCategories);
    vi.mocked(productService.getProducts).mockResolvedValue([
      existingTomatoProduct,
      legacyUnitlessProduct,
    ]);
  });

  it("validates selling unit, package description, countable whole numbers, and min order without silent rounding", async () => {
    renderFarmerRoutes("/farmer/products/new");

    expect(await screen.findByText("Add New Product")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Vegetables" })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Product Name/i), {
      target: { value: "Washed Potatoes" },
    });
    fireEvent.change(screen.getByLabelText(/Category/i), {
      target: { value: "1" },
    });

    // 1. Missing selling unit is rejected
    fireEvent.change(screen.getByLabelText(/Price per Unit/i), { target: { value: "8.00" } });
    fireEvent.change(screen.getByLabelText(/Available Stock/i), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: /Publish Product/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/select a valid selling unit/i);
    expect(productService.createProduct).not.toHaveBeenCalled();

    // 2. Packaged unit ('bag') requires Package Size / Details and rejects bare numbers like '20'
    fireEvent.change(screen.getByLabelText(/Selling Unit/i), { target: { value: "bag" } });
    fireEvent.click(screen.getByRole("button", { name: /Publish Product/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Package size \/ details are required for Bag listings/i,
    );

    fireEvent.change(screen.getByLabelText(/Package Size \/ Details/i), {
      target: { value: "20" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Publish Product/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Include a unit or label in Package Size \/ Details/i,
    );

    // 3. Provide package description ('10 kg'), test countable fractional stock rejection ('20.5')
    fireEvent.change(screen.getByLabelText(/Package Size \/ Details/i), {
      target: { value: "10 kg" },
    });
    fireEvent.change(screen.getByLabelText(/Available Stock/i), { target: { value: "20.5" } });
    fireEvent.click(screen.getByRole("button", { name: /Publish Product/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Available stock must be a whole number for Bag listings/i,
    );

    // 4. Test countable fractional minimum order rejection ('0.5')
    fireEvent.change(screen.getByLabelText(/Available Stock/i), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText(/Minimum Order Quantity/i), {
      target: { value: "0.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Publish Product/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Minimum order quantity must be a whole number for Bag listings/i,
    );
    expect(productService.createProduct).not.toHaveBeenCalled();
  });

  it("shows accurate product preview for continuous units and only publishes upon explicit confirmation without duplicate image upload", async () => {
    vi.mocked(productService.createProduct).mockResolvedValue(existingTomatoProduct);

    const { invalidateSpy } = renderFarmerRoutes("/farmer/products/new");

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Vegetables" })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Product Name/i), {
      target: { value: "Organic Tomatoes" },
    });
    fireEvent.change(screen.getByLabelText(/Category/i), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText(/Selling Unit/i), {
      target: { value: "kg" },
    });
    // Package Size / Details must be disabled for continuous kg unit
    expect(screen.getByLabelText(/Package Size \/ Details/i)).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Price per Unit/i), {
      target: { value: "1.50" },
    });
    fireEvent.change(screen.getByLabelText(/Available Stock/i), {
      target: { value: "50.5" },
    });
    fireEvent.change(screen.getByLabelText(/Minimum Order Quantity/i), {
      target: { value: "0.5" },
    });
    fireEvent.change(screen.getByLabelText(/Product Description/i), {
      target: { value: "Fresh locally grown tomatoes." },
    });

    // Attach a valid image file
    const fileInput = screen.getByLabelText(/Product image/i);
    const validFile = new File(["image-bytes"], "tomatoes.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    // Open preview -> must NOT call createProduct yet
    fireEvent.click(screen.getByRole("button", { name: /Preview Listing/i }));

    const dialog = await screen.findByRole("dialog");
    const previewCard = within(dialog).getByTestId("product-preview-card");
    expect(within(previewCard).getByText("Vegetables")).toBeInTheDocument();
    expect(within(previewCard).getByText("Organic Tomatoes")).toBeInTheDocument();
    expect(within(previewCard).getByText("$1.50 / kg")).toBeInTheDocument();
    expect(within(previewCard).getByText("50.5 kg available")).toBeInTheDocument();
    expect(within(previewCard).getByText("Minimum order: 0.5 kg")).toBeInTheDocument();
    expect(within(previewCard).getByText("Fresh locally grown tomatoes.")).toBeInTheDocument();
    expect(productService.createProduct).not.toHaveBeenCalled();

    // Explicitly confirm publication
    fireEvent.click(within(dialog).getByRole("button", { name: /Confirm & Publish/i }));

    await waitFor(() => {
      expect(productService.createProduct).toHaveBeenCalledTimes(1);
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["products"] });

    const submittedData = vi.mocked(productService.createProduct).mock.calls[0][0] as FormData;
    expect(submittedData.get("name")).toBe("Organic Tomatoes");
    expect(submittedData.get("unit")).toBe("kg");
    expect(submittedData.get("price")).toBe("1.50");
    expect(submittedData.get("stock")).toBe("50.5");
    expect(submittedData.get("min_order_quantity")).toBe("0.5");
    expect(submittedData.get("image")).toBe(validFile);
  });

  it("supports farmer product editing, requires confirmation when changing selling unit, and enforces selling unit on legacy products", async () => {
    vi.mocked(productService.updateProduct).mockImplementation(async (slug, data) => {
      const fd = data as FormData;
      const base = slug === "legacy-butternut" ? legacyUnitlessProduct : existingTomatoProduct;
      return {
        ...base,
        slug,
        name: String(fd.get("name") || base.name),
        unit: (fd.get("unit") as Product["unit"]) || "kg",
        unit_description: String(fd.get("unit_description") || ""),
        price: String(fd.get("price") || base.price),
        stock: Number(fd.get("stock") || base.stock),
        min_order_quantity: Number(fd.get("min_order_quantity") || 1),
      };
    });

    renderFarmerRoutes("/farmer/products");

    await waitFor(() => {
      expect(screen.getAllByText("Organic Tomatoes").length).toBeGreaterThan(0);
    });

    // Legacy product badge is shown
    expect(screen.getAllByText(/No unit assigned/i).length).toBeGreaterThan(0);

    // 1. Edit legacy unitless product -> must show warning and require unit selection
    fireEvent.click(screen.getAllByRole("button", { name: "Edit Legacy Butternut" })[0]);
    const legacyDialog = await screen.findByRole("dialog");
    expect(
      within(legacyDialog).getByText(/Legacy Product Without Selling Unit/i),
    ).toBeInTheDocument();

    fireEvent.click(within(legacyDialog).getByRole("button", { name: /Save Changes/i }));
    expect(
      await within(legacyDialog).findByText(/Please select a valid selling unit/i),
    ).toBeInTheDocument();
    expect(productService.updateProduct).not.toHaveBeenCalled();

    fireEvent.change(within(legacyDialog).getByLabelText(/Selling Unit/i), {
      target: { value: "kg" },
    });
    fireEvent.click(within(legacyDialog).getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(productService.updateProduct).toHaveBeenCalledWith(
        "legacy-butternut",
        expect.any(FormData),
      );
    });

    // 2. Edit existing product and change unit from 'kg' to 'bag' ('10 kg') -> requires active-cart unit-change confirmation
    fireEvent.click(screen.getAllByRole("button", { name: "Edit Organic Tomatoes" })[0]);
    const editDialog = await screen.findByRole("dialog");

    fireEvent.change(within(editDialog).getByLabelText(/Selling Unit/i), {
      target: { value: "bag" },
    });
    fireEvent.change(within(editDialog).getByLabelText(/Package Size \/ Details/i), {
      target: { value: "10 kg" },
    });
    fireEvent.change(within(editDialog).getByLabelText(/Price per Unit/i), {
      target: { value: "8.00" },
    });
    fireEvent.change(within(editDialog).getByLabelText(/Available Stock/i), {
      target: { value: "20" },
    });
    fireEvent.change(within(editDialog).getByLabelText(/Minimum Order Quantity/i), {
      target: { value: "1" },
    });

    // First click shows the active-cart unit change confirmation warning
    fireEvent.click(within(editDialog).getByRole("button", { name: /Save Changes/i }));
    expect(
      await within(editDialog).findByText(/Confirm Selling Unit or Package Size Change/i),
    ).toBeInTheDocument();
    expect(productService.updateProduct).toHaveBeenCalledTimes(1); // Not called yet for Organic Tomatoes

    // Second click on 'Confirm Unit Change & Save' submits the update
    fireEvent.click(
      within(editDialog).getByRole("button", { name: /Confirm Unit Change & Save/i }),
    );

    await waitFor(() => {
      expect(productService.updateProduct).toHaveBeenCalledTimes(2);
    });
    const secondCallPayload = vi.mocked(productService.updateProduct).mock.calls[1][1] as FormData;
    expect(secondCallPayload.get("unit")).toBe("bag");
    expect(secondCallPayload.get("unit_description")).toBe("10 kg");
    expect(secondCallPayload.get("price")).toBe("8.00");
    expect(secondCallPayload.get("stock")).toBe("20");
  });
});
