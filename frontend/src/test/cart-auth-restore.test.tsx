import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CartProvider, useCart } from "@/lib/cart-context";
import { useAuth, type User } from "@/lib/auth-context";
import apiClient from "@/lib/api-client";

vi.mock("@/lib/auth-context", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const guestItems = [{
  id: "17",
  name: "Guest tomatoes",
  price: 4,
  image: "",
  farmer: "Test farmer",
  quantity: 2,
}];

const serverCart = {
  items: [{
    product: {
      id: 17,
      name: "Guest tomatoes",
      price: "4.00",
      image: null,
      farmer_name: "Test farmer",
    },
    quantity: 2,
  }],
};

function CartContents({ children }: { children?: ReactNode }) {
  const { items } = useCart();
  return (
    <>
      <p>{items.map((item) => `${item.name}: ${item.quantity}`).join(", ") || "Cart empty"}</p>
      {children}
    </>
  );
}

function customerUser(): User {
  return {
    id: 1,
    email: "customer@example.com",
    username: "customer",
    first_name: "Customer",
    last_name: "User",
    user_type: "customer",
    is_staff: false,
  };
}

describe("guest cart restoration after authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("guest_cart", JSON.stringify(guestItems));
    vi.mocked(useAuth).mockReturnValue({
      user: customerUser(),
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: { items: [] } })
      .mockResolvedValueOnce({ data: { items: [] } })
      .mockResolvedValueOnce({ data: serverCart });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });
  });

  it("merges the saved guest cart into the customer cart and clears the guest copy", async () => {
    render(
      <CartProvider>
        <CartContents />
      </CartProvider>,
    );

    expect(await screen.findByText("Guest tomatoes: 2")).toBeInTheDocument();
    expect(apiClient.patch).toHaveBeenCalledWith("/cart/items/17/", { quantity: 2 });
    await waitFor(() => expect(localStorage.getItem("guest_cart")).toBeNull());
  });
});
