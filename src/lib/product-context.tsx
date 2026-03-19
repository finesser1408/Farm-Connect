import React, { createContext, useContext, useState, useCallback } from "react";
import { Product, products as initialProducts } from "./mock-data";

interface ProductContextType {
  products: Product[];
  addProduct: (product: Omit<Product, "id" | "rating" | "reviews">) => void;
  removeProduct: (id: string) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);

  const addProduct = useCallback((product: Omit<Product, "id" | "rating" | "reviews">) => {
    const newProduct: Product = {
      ...product,
      id: Date.now().toString(), // simple id generation
      rating: 0,
      reviews: 0,
    };
    setProducts((prev) => [...prev, newProduct]);
  }, []);

  const removeProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, ...updates } : p));
  }, []);

  return (
    <ProductContext.Provider value={{ products, addProduct, removeProduct, updateProduct }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error("useProducts must be used within a ProductProvider");
  }
  return context;
}