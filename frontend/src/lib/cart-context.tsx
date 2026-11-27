import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "./auth-context";
import apiClient from "./api-client";
import {
  calculateLineSubtotalCents,
  formatProductUnitDisplay,
  isContinuousSellingUnit,
  roundCurrencyCents,
  roundQuantityHundredths,
  validateCustomerOrderQuantity,
  type SellingUnitCode,
} from "./product-units";

export interface CartItem {
  id: string;
  slug?: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  farmer: string;
  quantity: number;
  unit?: SellingUnitCode | null;
  unit_description?: string;
  formatted_unit?: string;
  is_countable_unit?: boolean;
  min_order_quantity?: number;
  stock?: number;
  is_available?: boolean;
  priceChanged?: boolean;
  unitChanged?: boolean;
  previousFormattedUnit?: string;
  validationError?: string | null;
}

export type AddCartItemInput = Omit<CartItem, "quantity"> & {
  quantity?: number;
};

interface ApiCartProduct {
  id: number;
  slug?: string;
  name: string;
  price: string;
  stock?: number;
  unit?: SellingUnitCode | null;
  unit_description?: string;
  formatted_unit?: string;
  is_countable_unit?: boolean;
  min_order_quantity?: number;
  is_available?: boolean;
  image: string | null;
  farmer_name: string;
}

interface ApiCart {
  items: Array<{
    id?: number;
    product: ApiCartProduct;
    quantity: number;
    price?: string;
    total_price?: string;
  }>;
  total_amount?: string;
}

interface CartContextType {
  items: CartItem[];
  isLoading?: boolean;
  addItem: (item: AddCartItemInput, explicitQuantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  syncCart: (items?: CartItem[]) => Promise<void>;
  clearCart: () => void;
  acknowledgeItemChanges?: (id: string) => void;
  totalItems: number;
  totalPrice: number;
  hasInvalidItems?: boolean;
}

const GUEST_CART_KEY = "guest_cart";
const CartContext = createContext<CartContextType | undefined>(undefined);

function enrichCartItemValidation(item: CartItem): CartItem {
  const formattedUnit =
    item.unit !== undefined
      ? formatProductUnitDisplay(item.unit, item.unit_description)
      : item.formatted_unit || "";
  const validationError =
    item.stock !== undefined ||
    item.min_order_quantity !== undefined ||
    item.unit !== undefined ||
    item.is_available !== undefined
      ? validateCustomerOrderQuantity({
          rawQuantity: item.quantity,
          unit: item.unit,
          unitDescription: item.unit_description,
          minOrderQuantity: item.min_order_quantity ?? 1,
          stock: item.stock,
          isAvailable: item.is_available ?? true,
        })
      : item.validationError ?? null;

  return {
    ...item,
    formatted_unit: formattedUnit,
    is_countable_unit:
      item.is_countable_unit ??
      (item.unit !== undefined ? !isContinuousSellingUnit(item.unit) : undefined),
    validationError,
  };
}

function fromApiCart(cart: ApiCart, previousItems: CartItem[] = []): CartItem[] {
  const prevById = new Map(previousItems.map((item) => [item.id, item]));
  return cart.items.map(({ product, quantity, price }) => {
    const id = String(product.id);
    const prev = prevById.get(id);
    const livePrice = Number(price ?? product.price);
    const liveFormattedUnit = formatProductUnitDisplay(
      product.unit,
      product.unit_description,
    );

    const priceChanged =
      prev !== undefined && Math.abs(prev.price - livePrice) >= 0.005
        ? true
        : Boolean(prev?.priceChanged);
    const originalPrice =
      prev !== undefined && Math.abs(prev.price - livePrice) >= 0.005
        ? prev.originalPrice ?? prev.price
        : prev?.originalPrice;

    const prevUnitDisplay = prev
      ? formatProductUnitDisplay(prev.unit, prev.unit_description) ||
        prev.formatted_unit ||
        ""
      : "";
    const unitChanged =
      prev !== undefined &&
      Boolean(prevUnitDisplay) &&
      prevUnitDisplay !== liveFormattedUnit
        ? true
        : Boolean(prev?.unitChanged);
    const previousFormattedUnit =
      prev !== undefined &&
      Boolean(prevUnitDisplay) &&
      prevUnitDisplay !== liveFormattedUnit
        ? prev.previousFormattedUnit || prevUnitDisplay
        : prev?.previousFormattedUnit;

    // If a local edit failed validation on the server, preserve the customer's attempted quantity
    // so they can see the validation error and correct it rather than silently losing their input.
    const effectiveQuantity =
      prev?.validationError && prev.quantity !== quantity ? prev.quantity : Number(quantity);

    return enrichCartItemValidation({
      id,
      slug: product.slug ?? prev?.slug,
      name: product.name,
      price: livePrice,
      originalPrice,
      image: product.image || "",
      farmer: product.farmer_name,
      quantity: roundQuantityHundredths(effectiveQuantity),
      unit: product.unit ?? null,
      unit_description: product.unit_description ?? "",
      formatted_unit: liveFormattedUnit,
      is_countable_unit:
        product.is_countable_unit ?? !isContinuousSellingUnit(product.unit),
      min_order_quantity:
        product.min_order_quantity !== undefined ? Number(product.min_order_quantity) : 1,
      stock: product.stock !== undefined ? Number(product.stock) : prev?.stock,
      is_available: product.is_available ?? true,
      priceChanged,
      unitChanged,
      previousFormattedUnit,
    });
  });
}

function readGuestCart(): CartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]") as CartItem[];
    return Array.isArray(raw) ? raw.map(enrichCartItemValidation) : [];
  } catch (error) {
    console.error("Could not read the saved guest cart", error);
    localStorage.removeItem(GUEST_CART_KEY);
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const syncQueue = useRef<Promise<void>>(Promise.resolve());
  const itemsRef = useRef<CartItem[]>(items);

  const commitItemsState = useCallback((nextItems: CartItem[]) => {
    itemsRef.current = nextItems;
    setItems(nextItems);
  }, []);

  const syncCart = useCallback(
    (requestedItems?: CartItem[]) => {
      if (!user?.id) return Promise.resolve();
      const desiredSnapshot = requestedItems ?? itemsRef.current;

      const operation = syncQueue.current.then(async () => {
        const latestDesired = requestedItems ?? itemsRef.current ?? desiredSnapshot;
        const current = await apiClient.get<ApiCart>("/cart/");
        const desiredIds = new Set(latestDesired.map((item) => item.id));
        for (const item of current.data.items) {
          if (!desiredIds.has(String(item.product.id))) {
            await apiClient.delete(`/cart/items/${item.product.id}/`);
          }
        }
        for (const item of latestDesired) {
          if (!item.validationError) {
            try {
              await apiClient.patch(`/cart/items/${item.id}/`, { quantity: item.quantity });
            } catch (patchError) {
              console.warn(`Could not sync cart item ${item.id}`, patchError);
            }
          }
        }
        const updated = await apiClient.get<ApiCart>("/cart/");
        const mergedServerItems = fromApiCart(updated.data, itemsRef.current);

        // Preserve any un-persisted local items that currently have a validation error so they are not silently dropped
        const serverIds = new Set(mergedServerItems.map((i) => i.id));
        for (const localItem of itemsRef.current) {
          if (!serverIds.has(localItem.id) && localItem.validationError) {
            mergedServerItems.push(localItem);
          }
        }

        commitItemsState(mergedServerItems);
      });

      syncQueue.current = operation.catch((error) => {
        console.error("Could not synchronize cart with the server", error);
      });
      return operation;
    },
    [commitItemsState, user?.id],
  );

  useEffect(() => {
    let active = true;
    const loadCart = async () => {
      if (!user) {
        commitItemsState(readGuestCart());
        return;
      }

      setIsLoading(true);
      try {
        const response = await apiClient.get<ApiCart>("/cart/");
        const serverItems = fromApiCart(response.data, itemsRef.current);
        const guestItems = readGuestCart();
        const merged = new Map(serverItems.map((item) => [item.id, item]));
        for (const guestItem of guestItems) {
          const existing = merged.get(guestItem.id);
          const nextQty = roundQuantityHundredths(
            guestItem.quantity + (existing?.quantity || 0),
          );
          merged.set(
            guestItem.id,
            enrichCartItemValidation({
              ...(existing || guestItem),
              quantity: nextQty,
            }),
          );
        }

        if (guestItems.length) {
          const mergedList = [...merged.values()];
          commitItemsState(mergedList);
          await syncCart(mergedList);
          localStorage.removeItem(GUEST_CART_KEY);
        } else if (active) {
          commitItemsState(serverItems);
        }
      } catch (error) {
        console.error("Could not load the server cart", error);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadCart();
    return () => {
      active = false;
    };
  }, [commitItemsState, syncCart, user]);

  const applyItemsMutation = useCallback(
    (updater: (currentItems: CartItem[]) => CartItem[]) => {
      const nextItems = updater(itemsRef.current).map(enrichCartItemValidation);
      commitItemsState(nextItems);
      if (user) {
        void syncCart(nextItems).catch(() => undefined);
      } else {
        localStorage.setItem(GUEST_CART_KEY, JSON.stringify(nextItems));
      }
    },
    [commitItemsState, syncCart, user],
  );

  const addItem = useCallback(
    (item: AddCartItemInput, explicitQuantity?: number) => {
      const rawAddQty =
        explicitQuantity ?? item.quantity ?? item.min_order_quantity ?? 1;
      const qtyToAdd = roundQuantityHundredths(Number(rawAddQty));
      if (!Number.isFinite(qtyToAdd) || qtyToAdd <= 0) return;

      applyItemsMutation((currentItems) => {
        const existing = currentItems.find((current) => current.id === item.id);
        if (existing) {
          const nextQuantity = roundQuantityHundredths(existing.quantity + qtyToAdd);
          return currentItems.map((current) =>
            current.id === item.id
              ? {
                  ...current,
                  ...item,
                  quantity: nextQuantity,
                }
              : current,
          );
        }
        return [
          ...currentItems,
          {
            ...item,
            quantity: qtyToAdd,
          },
        ];
      });
    },
    [applyItemsMutation],
  );

  const removeItem = useCallback(
    (id: string) => {
      applyItemsMutation((currentItems) => currentItems.filter((item) => item.id !== id));
    },
    [applyItemsMutation],
  );

  const updateQuantity = useCallback(
    (id: string, quantity: number) => {
      applyItemsMutation((currentItems) => {
        if (quantity <= 0) {
          return currentItems.filter((item) => item.id !== id);
        }
        const roundedQty = roundQuantityHundredths(quantity);
        return currentItems.map((item) =>
          item.id === id ? { ...item, quantity: roundedQty } : item,
        );
      });
    },
    [applyItemsMutation],
  );

  const acknowledgeItemChanges = useCallback(
    (id: string) => {
      const nextItems = itemsRef.current.map((item) =>
        item.id === id
          ? {
              ...item,
              priceChanged: false,
              originalPrice: undefined,
              unitChanged: false,
              previousFormattedUnit: undefined,
            }
          : item,
      );
      commitItemsState(nextItems);
      if (!user) {
        localStorage.setItem(GUEST_CART_KEY, JSON.stringify(nextItems));
      }
    },
    [commitItemsState, user],
  );

  const clearCart = useCallback(() => {
    applyItemsMutation(() => []);
    localStorage.removeItem(GUEST_CART_KEY);
  }, [applyItemsMutation]);

  const totalItems = roundQuantityHundredths(
    items.reduce((sum, item) => sum + item.quantity, 0),
  );
  const totalPrice = roundCurrencyCents(
    items.reduce(
      (sum, item) => sum + calculateLineSubtotalCents(item.price, item.quantity),
      0,
    ),
  );
  const hasInvalidItems = items.some((item) => Boolean(item.validationError));

  return (
    <CartContext.Provider
      value={{
        items,
        isLoading,
        addItem,
        removeItem,
        updateQuantity,
        syncCart,
        clearCart,
        acknowledgeItemChanges,
        totalItems,
        totalPrice,
        hasInvalidItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
