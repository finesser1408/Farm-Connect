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

const PLURAL_UNIT_NOUNS: Record<string, [string, string]> = {
  kg: ["kg", "kg"],
  l: ["L", "L"],
  g: ["g", "g"],
  piece: ["piece", "pieces"],
  head: ["head", "heads"],
  bunch: ["bunch", "bunches"],
  bundle: ["bundle", "bundles"],
  tray: ["tray", "trays"],
  crate: ["crate", "crates"],
  bag: ["bag", "bags"],
  bucket: ["bucket", "buckets"],
  bird: ["bird", "birds"],
};

export function formatQuantityNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "0";
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  const rounded = Math.round((num + Number.EPSILON) * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded);
}

export function formatQuantityWithUnit(
  quantity: number | string | null | undefined,
  unit?: string | null,
  unitDescription?: string | null,
): string {
  const qtyStr = formatQuantityNumber(quantity);
  if (!unit) return qtyStr;
  const num = Number(quantity);
  const pair = PLURAL_UNIT_NOUNS[unit];
  const baseUnit = pair
    ? Math.abs(num - 1) < 1e-9
      ? pair[0]
      : pair[1]
    : getSellingUnitOption(unit)?.shortLabel || unit;
  const trimmedDesc = (unitDescription || "").trim();
  return trimmedDesc ? `${qtyStr} ${baseUnit} (${trimmedDesc})` : `${qtyStr} ${baseUnit}`;
}

export function formatAvailableStockText(
  stock: number | string | null | undefined,
  unit?: string | null,
  isAvailable = true,
): string {
  const num = Number(stock ?? 0);
  if (!isAvailable || !Number.isFinite(num) || num <= 0) {
    return "Out of stock";
  }
  const qtyStr = formatQuantityNumber(num);
  if (!unit) {
    return `${qtyStr} available`;
  }
  const pair = PLURAL_UNIT_NOUNS[unit];
  const unitNoun = pair
    ? Math.abs(num - 1) < 1e-9
      ? pair[0]
      : pair[1]
    : getSellingUnitOption(unit)?.shortLabel || unit;
  return `${qtyStr} ${unitNoun} available`;
}

export function roundCurrencyCents(value: number | string): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function calculateLineSubtotalCents(
  unitPrice: number | string,
  quantity: number | string,
): number {
  const priceNum = Number(unitPrice);
  const qtyNum = Number(quantity);
  if (!Number.isFinite(priceNum) || !Number.isFinite(qtyNum)) return 0;
  return roundCurrencyCents(priceNum * qtyNum);
}

export function roundQuantityHundredths(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

const TWO_DECIMAL_PATTERN = /^\d+(\.\d{1,2})?$/;
const WHOLE_NUMBER_PATTERN = /^\d+(\.0+)?$/;

export interface CustomerQuantityValidationInput {
  rawQuantity: string | number;
  unit?: string | null;
  unitDescription?: string | null;
  minOrderQuantity?: number | string | null;
  stock?: number | string | null;
  isAvailable?: boolean;
}

export function validateCustomerOrderQuantity(
  input: CustomerQuantityValidationInput,
): string | null {
  const {
    rawQuantity,
    unit,
    unitDescription,
    minOrderQuantity = 1,
    stock,
    isAvailable = true,
  } = input;

  const stockNum = stock !== undefined && stock !== null ? Number(stock) : undefined;
  if (!isAvailable || (stockNum !== undefined && stockNum <= 0)) {
    return "This product is currently out of stock.";
  }

  if (
    isPackagedUnitRequiringDescription(unit) &&
    unitDescription !== undefined &&
    !(unitDescription || "").trim()
  ) {
    return "This product listing has an incomplete package description and cannot be purchased right now.";
  }

  const rawStr = String(rawQuantity ?? "").trim();
  if (!rawStr) {
    return "Enter a valid quantity greater than 0.";
  }

  const qtyNum = Number(rawStr);
  if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
    return "Quantity must be greater than 0.";
  }

  if (!TWO_DECIMAL_PATTERN.test(rawStr)) {
    return "Quantity cannot have more than 2 decimal places.";
  }

  const isContinuous = isContinuousSellingUnit(unit);
  if (!isContinuous && !WHOLE_NUMBER_PATTERN.test(rawStr)) {
    const unitLabel = getSellingUnitOption(unit)?.label || "this product";
    return `Whole-number quantities are required for ${unitLabel} listings.`;
  }

  const unitDisplay = formatProductUnitDisplay(unit, unitDescription);
  const minNum = Number(minOrderQuantity ?? 1);
  if (Number.isFinite(minNum) && minNum > 0 && qtyNum + 1e-9 < minNum) {
    return `Minimum order quantity is ${formatQuantityNumber(minNum)}${unitDisplay ? ` ${unitDisplay}` : ""}.`;
  }

  if (stockNum !== undefined && Number.isFinite(stockNum) && qtyNum - 1e-9 > stockNum) {
    return `Requested quantity exceeds available stock (${formatQuantityNumber(stockNum)}${unitDisplay ? ` ${unitDisplay}` : ""}).`;
  }

  return null;
}

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
