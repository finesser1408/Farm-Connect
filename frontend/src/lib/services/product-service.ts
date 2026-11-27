import apiClient from "../api-client";

export type ProductModerationStatus = "active" | "hidden" | "removed";

export type SellingUnitCode =
  | "kg"
  | "l"
  | "g"
  | "piece"
  | "head"
  | "bunch"
  | "bundle"
  | "tray"
  | "crate"
  | "bag"
  | "bucket"
  | "bird";

export interface SellingUnitOption {
  value: SellingUnitCode;
  label: string;
  shortLabel: string;
  group: "Weight & Volume" | "Countable";
  isCountable: boolean;
  requiresDescription: boolean;
  packagePlaceholder?: string;
  examplePrice: string;
  exampleStock: string;
  exampleMinOrder: string;
}

export const SELLING_UNIT_OPTIONS: SellingUnitOption[] = [
  {
    value: "kg",
    label: "Kilogram (kg)",
    shortLabel: "kg",
    group: "Weight & Volume",
    isCountable: false,
    requiresDescription: false,
    examplePrice: "1.50",
    exampleStock: "50",
    exampleMinOrder: "0.5",
  },
  {
    value: "l",
    label: "Litre (L)",
    shortLabel: "L",
    group: "Weight & Volume",
    isCountable: false,
    requiresDescription: false,
    examplePrice: "1.20",
    exampleStock: "25",
    exampleMinOrder: "0.5",
  },
  {
    value: "g",
    label: "Gram (g)",
    shortLabel: "g",
    group: "Countable",
    isCountable: true,
    requiresDescription: false,
    examplePrice: "2.00",
    exampleStock: "500",
    exampleMinOrder: "100",
  },
  {
    value: "piece",
    label: "Piece",
    shortLabel: "piece",
    group: "Countable",
    isCountable: true,
    requiresDescription: false,
    examplePrice: "0.75",
    exampleStock: "100",
    exampleMinOrder: "1",
  },
  {
    value: "head",
    label: "Head",
    shortLabel: "head",
    group: "Countable",
    isCountable: true,
    requiresDescription: false,
    examplePrice: "1.00",
    exampleStock: "40",
    exampleMinOrder: "1",
  },
  {
    value: "bunch",
    label: "Bunch",
    shortLabel: "bunch",
    group: "Countable",
    isCountable: true,
    requiresDescription: false,
    examplePrice: "1.00",
    exampleStock: "30",
    exampleMinOrder: "1",
  },
  {
    value: "bundle",
    label: "Bundle",
    shortLabel: "bundle",
    group: "Countable",
    isCountable: true,
    requiresDescription: false,
    examplePrice: "1.50",
    exampleStock: "25",
    exampleMinOrder: "1",
  },
  {
    value: "tray",
    label: "Tray",
    shortLabel: "tray",
    group: "Countable",
    isCountable: true,
    requiresDescription: true,
    packagePlaceholder: "e.g. 30 eggs",
    examplePrice: "4.50",
    exampleStock: "12",
    exampleMinOrder: "1",
  },
  {
    value: "crate",
    label: "Crate",
    shortLabel: "crate",
    group: "Countable",
    isCountable: true,
    requiresDescription: true,
    packagePlaceholder: "e.g. 20 kg or 12 bottles",
    examplePrice: "15.00",
    exampleStock: "10",
    exampleMinOrder: "1",
  },
  {
    value: "bag",
    label: "Bag",
    shortLabel: "bag",
    group: "Countable",
    isCountable: true,
    requiresDescription: true,
    packagePlaceholder: "e.g. 10 kg or 50 kg",
    examplePrice: "8.00",
    exampleStock: "20",
    exampleMinOrder: "1",
  },
  {
    value: "bucket",
    label: "Bucket",
    shortLabel: "bucket",
    group: "Countable",
    isCountable: true,
    requiresDescription: true,
    packagePlaceholder: "e.g. 20 L or 10 kg",
    examplePrice: "12.00",
    exampleStock: "15",
    exampleMinOrder: "1",
  },
  {
    value: "bird",
    label: "Bird",
    shortLabel: "bird",
    group: "Countable",
    isCountable: true,
    requiresDescription: false,
    examplePrice: "7.00",
    exampleStock: "25",
    exampleMinOrder: "1",
  },
];

export const WEIGHT_AND_VOLUME_UNITS = SELLING_UNIT_OPTIONS.filter(
  (opt) => opt.group === "Weight & Volume",
);

export const COUNTABLE_SELLING_UNITS = SELLING_UNIT_OPTIONS.filter(
  (opt) => opt.group === "Countable",
);

export function getSellingUnitOption(unit?: string | null): SellingUnitOption | undefined {
  if (!unit) return undefined;
  return SELLING_UNIT_OPTIONS.find((opt) => opt.value === unit);
}

export function isContinuousSellingUnit(unit?: string | null): boolean {
  return unit === "kg" || unit === "l";
}

export function isPackagedUnitRequiringDescription(unit?: string | null): boolean {
  return unit === "tray" || unit === "crate" || unit === "bag" || unit === "bucket";
}

export function formatProductUnitDisplay(
  unit?: string | null,
  unitDescription?: string | null,
): string {
  if (!unit) return "";
  const option = getSellingUnitOption(unit);
  const shortLabel = option ? option.shortLabel : unit;
  const trimmedDesc = (unitDescription || "").trim();
  return trimmedDesc ? `${shortLabel} (${trimmedDesc})` : shortLabel;
}

const TWO_DECIMAL_PATTERN = /^\d+(\.\d{1,2})?$/;
const WHOLE_NUMBER_PATTERN = /^\d+(\.0+)?$/;

export interface ProductListingFormValues {
  name: string;
  category?: string;
  requireCategory?: boolean;
  unit: string;
  unit_description: string;
  price: string;
  stock: string;
  min_order_quantity: string;
  description?: string;
  requireDescription?: boolean;
}

export function validateProductListingForm(values: ProductListingFormValues): string | null {
  if (!values.name.trim()) {
    return "Product name is required.";
  }
  if (values.requireCategory && !values.category) {
    return "Please select a category.";
  }
  const unitOption = getSellingUnitOption(values.unit);
  if (!unitOption) {
    return "Please select a valid selling unit before publishing.";
  }

  const trimmedUnitDesc = (values.unit_description || "").trim();
  if (trimmedUnitDesc.length > 40) {
    return "Package size / details cannot exceed 40 characters.";
  }
  if (unitOption.requiresDescription && !trimmedUnitDesc) {
    return `Package size / details are required for ${unitOption.label} listings (e.g. 10 kg, 30 eggs, 20 L).`;
  }

  const rawPrice = (values.price || "").trim();
  if (!rawPrice || !TWO_DECIMAL_PATTERN.test(rawPrice) || Number(rawPrice) <= 0) {
    return "Enter a valid price per unit greater than $0.00 (up to 2 decimal places).";
  }

  const rawStock = (values.stock || "").trim();
  if (!rawStock || Number.isNaN(Number(rawStock)) || Number(rawStock) < 0) {
    return "Available stock must be 0 or greater.";
  }
  if (!TWO_DECIMAL_PATTERN.test(rawStock)) {
    return "Available stock cannot have more than 2 decimal places.";
  }
  if (unitOption.isCountable && !WHOLE_NUMBER_PATTERN.test(rawStock)) {
    return `Available stock must be a whole number for ${unitOption.label} listings.`;
  }

  const rawMinOrder = (values.min_order_quantity || "").trim();
  if (!rawMinOrder || Number.isNaN(Number(rawMinOrder)) || Number(rawMinOrder) <= 0) {
    return "Minimum order quantity must be greater than 0.";
  }
  if (!TWO_DECIMAL_PATTERN.test(rawMinOrder)) {
    return "Minimum order quantity cannot have more than 2 decimal places.";
  }
  if (unitOption.isCountable && !WHOLE_NUMBER_PATTERN.test(rawMinOrder)) {
    return `Minimum order quantity must be a whole number for ${unitOption.label} listings.`;
  }

  if (values.requireDescription && !(values.description || "").trim()) {
    return "Product description is required.";
  }

  return null;
}

export interface Product {
  id: number;
  farmer_id?: number;
  farmer_name: string;
  farmer_location: string;
  farmer_status?: string;
  category: number | null;
  category_details: Category | null;
  name: string;
  slug: string;
  description: string;
  price: string;
  stock: number;
  unit?: SellingUnitCode | null;
  unit_display?: string | null;
  unit_description?: string;
  formatted_unit?: string;
  is_countable_unit?: boolean;
  min_order_quantity?: number;
  image: string | null;
  is_available: boolean;
  moderation_status?: ProductModerationStatus;
  moderation_reason?: string;
  moderated_at?: string | null;
  moderated_by?: number | null;
  moderated_by_email?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ProductQueryParams {
  available?: "all" | "true" | "false";
  category?: string;
  farmer?: string;
  farmer_id?: number;
  location?: string;
  max_price?: number;
  min_price?: number;
  moderation_status?: "all" | ProductModerationStatus;
  ordering?: "price" | "-price" | "created_at" | "-created_at" | "name" | "-name";
  page?: number;
  page_size?: number;
  price?: number;
  search?: string;
}

export interface ProductInput {
  farmer_id?: number;
  name: string;
  price: string;
  stock: number;
  unit?: SellingUnitCode;
  unit_description?: string;
  min_order_quantity?: number;
  description: string;
  category: number | null;
}

export const productService = {
  getProducts: async (params?: ProductQueryParams) => {
    // Django can return either a raw list or a paginated object depending on setup.
    const response = await apiClient.get<Product[] | PaginatedResponse<Product>>("/products/", { params });
    return response.data;
  },

  getProductBySlug: async (slug: string) => {
    const response = await apiClient.get<Product>(`/products/${slug}/`);
    return response.data;
  },

  getCategories: async () => {
    const response = await apiClient.get<Category[]>("/products/categories/");
    return response.data;
  },

  createProduct: async (data: FormData | ProductInput) => {
    const response = await apiClient.post<Product>("/products/", data, {
      headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    return response.data;
  },

  updateProduct: async (slug: string, data: FormData | Partial<ProductInput>) => {
    const response = await apiClient.patch<Product>(`/products/${slug}/`, data, {
      headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    return response.data;
  },

  hideProduct: async (slug: string, reason?: string) => {
    const response = await apiClient.patch<Product>(`/products/${slug}/hide/`, {
      reason: reason?.trim() || "",
    });
    return response.data;
  },

  restoreProduct: async (slug: string, reason?: string) => {
    const response = await apiClient.patch<Product>(`/products/${slug}/restore/`, {
      reason: reason?.trim() || "",
    });
    return response.data;
  },

  removeProduct: async (slug: string, reason?: string) => {
    const response = await apiClient.patch<Product>(`/products/${slug}/remove/`, {
      reason: reason?.trim() || "",
    });
    return response.data;
  },

  deleteProduct: async (slug: string) => {
    await apiClient.delete(`/products/${slug}/`);
  },
};
