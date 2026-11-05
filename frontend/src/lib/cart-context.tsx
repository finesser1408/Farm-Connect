import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./auth-context";
import apiClient from "./api-client";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  farmer: string;
  quantity: number;
}

interface ApiCart {
  items: Array<{
    product: { id: number; name: string; price: string; image: string | null; farmer_name: string };
    quantity: number;
  }>;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  syncCart: (items?: CartItem[]) => Promise<void>;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const GUEST_CART_KEY = "guest_cart";
const CartContext = createContext<CartContextType | undefined>(undefined);

function fromApiCart(cart: ApiCart): CartItem[] {
  return cart.items.map(({ product, quantity }) => ({
    id: String(product.id),
    name: product.name,
    price: Number(product.price),
    image: product.image || "",
    farmer: product.farmer_name,
    quantity,
  }));
}

function readGuestCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]") as CartItem[];
  } catch (error) {
    console.error("Could not read the saved guest cart", error);
    localStorage.removeItem(GUEST_CART_KEY);
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const syncQueue = useRef<Promise<void>>(Promise.resolve());
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const syncCart = useCallback((requestedItems?: CartItem[]) => {
    if (!user?.id) return Promise.resolve();
    const desiredItems = requestedItems ?? itemsRef.current;

    const operation = syncQueue.current.then(async () => {
      const current = await apiClient.get<ApiCart>("/cart/");
      const desiredIds = new Set(desiredItems.map((item) => item.id));
      for (const item of current.data.items) {
        if (!desiredIds.has(String(item.product.id))) {
          await apiClient.delete(`/cart/items/${item.product.id}/`);
        }
      }
      for (const item of desiredItems) {
        await apiClient.patch(`/cart/items/${item.id}/`, { quantity: item.quantity });
      }
      const updated = await apiClient.get<ApiCart>("/cart/");
      setItems(fromApiCart(updated.data));
    });

    syncQueue.current = operation.catch((error) => {
      console.error("Could not synchronize cart with the server", error);
    });
    return operation;
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    const loadCart = async () => {
      if (!user) {
        setItems(readGuestCart());
        return;
      }

      try {
        const response = await apiClient.get<ApiCart>("/cart/");
        const serverItems = fromApiCart(response.data);
        const guestItems = readGuestCart();
        const merged = new Map(serverItems.map((item) => [item.id, item]));
        for (const guestItem of guestItems) {
          const existing = merged.get(guestItem.id);
          merged.set(guestItem.id, {
            ...guestItem,
            quantity: guestItem.quantity + (existing?.quantity || 0),
          });
        }

        if (guestItems.length) {
          await syncCart([...merged.values()]);
          localStorage.removeItem(GUEST_CART_KEY);
        } else if (active) {
          setItems(serverItems);
        }
      } catch (error) {
        console.error("Could not load the server cart", error);
      }
    };

    void loadCart();
    return () => {
      active = false;
    };
  }, [syncCart, user]);

  const updateItems = useCallback((nextItems: CartItem[]) => {
    setItems(nextItems);
    if (user) {
      void syncCart(nextItems).catch(() => undefined);
    } else {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(nextItems));
    }
  }, [syncCart, user]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">) => {
    const existing = items.find((current) => current.id === item.id);
    updateItems(existing
      ? items.map((current) => current.id === item.id
        ? { ...current, quantity: current.quantity + 1 }
        : current)
      : [...items, { ...item, quantity: 1 }]);
  }, [items, updateItems]);

  const removeItem = useCallback((id: string) => {
    updateItems(items.filter((item) => item.id !== id));
  }, [items, updateItems]);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    updateItems(quantity <= 0
      ? items.filter((item) => item.id !== id)
      : items.map((item) => item.id === id ? { ...item, quantity } : item));
  }, [items, updateItems]);

  const clearCart = useCallback(() => {
    updateItems([]);
    localStorage.removeItem(GUEST_CART_KEY);
  }, [updateItems]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQuantity, syncCart, clearCart, totalItems, totalPrice,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
