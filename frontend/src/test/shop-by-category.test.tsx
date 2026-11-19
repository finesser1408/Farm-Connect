import { useEffect, type ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import ShopByCategorySection from "@/components/ShopByCategorySection";
import { productService, type Category, type Product } from "@/lib/services/product-service";
import {
  calculateApproximateTownDistanceKm,
  formatApproximateDistance,
} from "@/lib/zimbabwe-locations";

let carouselIndex = 0;
let carouselMaxIndex = 1;
const emblaListeners: Record<string, Set<() => void>> = {};

function emitEmbla(event: string) {
  emblaListeners[event]?.forEach((cb) => cb());
}

const scrollNextMock = vi.fn(() => {
  if (carouselIndex < carouselMaxIndex) {
    carouselIndex += 1;
    emitEmbla("select");
  }
});
const scrollPrevMock = vi.fn(() => {
  if (carouselIndex > 0) {
    carouselIndex -= 1;
    emitEmbla("select");
  }
});
const emblaOnMock = vi.fn((event: string, cb: () => void) => {
  if (!emblaListeners[event]) emblaListeners[event] = new Set();
  emblaListeners[event].add(cb);
});
const emblaOffMock = vi.fn((event: string, cb: () => void) => {
  emblaListeners[event]?.delete(cb);
});

const mockCarouselApi = {
  scrollNext: scrollNextMock,
  scrollPrev: scrollPrevMock,
  canScrollNext: () => carouselIndex < carouselMaxIndex,
  canScrollPrev: () => carouselIndex > 0,
  on: emblaOnMock,
  off: emblaOffMock,
};

vi.mock("@/components/ui/carousel", () => ({
  Carousel: ({
    children,
    setApi,
  }: {
    children: ReactNode;
    setApi?: (api: typeof mockCarouselApi) => void;
  }) => {
    useEffect(() => {
      setApi?.(mockCarouselApi);
    }, [setApi]);
    return <div data-testid="mock-carousel">{children}</div>;
  },
  CarouselContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CarouselItem: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => (
    <div data-testid="carousel-item" className={className}>
      {children}
    </div>
  ),
}));

vi.mock("@/lib/services/product-service", () => ({
  productService: {
    getProducts: vi.fn(),
  },
}));

const categories: Category[] = [
  { id: 1, name: "Vegetables", slug: "vegetables", description: "Fresh vegetables" },
  { id: 2, name: "Fruits", slug: "fruits", description: "Fresh fruits" },
  { id: 3, name: "Grains", slug: "grains", description: "Local grains" },
];

const vegetableProducts: Product[] = [
  {
    id: 101,
    farmer_email: "farmer1@example.com",
    farmer_name: "Mr. Farmer",
    farmer_location: "Harare",
    category: 1,
    category_details: categories[0],
    name: "Madomasi",
    slug: "madomasi",
    description: "Fresh red tomatoes",
    price: "3.50",
    stock: 15,
    image: null,
    is_available: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 102,
    farmer_email: "farmer2@example.com",
    farmer_name: "Tariro Moyo",
    farmer_location: "Mutare",
    category: 1,
    category_details: categories[0],
    name: "Covo",
    slug: "covo",
    description: "Leafy greens",
    price: "1.25",
    stock: 20,
    image: null,
    is_available: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const singleFruitProduct: Product[] = [
  {
    id: 201,
    farmer_email: "farmer3@example.com",
    farmer_name: "",
    farmer_location: "Unknown Village",
    category: 2,
    category_details: categories[1],
    name: "Mazhanje",
    slug: "mazhanje",
    description: "Wild loquats",
    price: "2.00",
    stock: 10,
    image: null,
    is_available: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="/"
            element={
              <ShopByCategorySection
                categories={categories}
                categoryImages={{}}
                fallbackCategoryImage="/placeholder.svg"
              />
            }
          />
          <Route path="/product/:id" element={<div>Product Details Destination</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Zimbabwe town distance utility", () => {
  it("calculates approximate straight-line distances for known towns and handles unknown/missing values safely", () => {
    expect(calculateApproximateTownDistanceKm("Harare", "Harare")).toBe(0);
    expect(formatApproximateDistance(0)).toContain("approx. straight-line");

    const harareToMutare = calculateApproximateTownDistanceKm("Harare", "Mutare, Zimbabwe");
    expect(harareToMutare).not.toBeNull();
    expect(harareToMutare!).toBeGreaterThan(150);
    expect(harareToMutare!).toBeLessThan(300);

    expect(calculateApproximateTownDistanceKm("Harare", "Unknown Village")).toBeNull();
    expect(calculateApproximateTownDistanceKm("", "Harare")).toBeNull();
    expect(calculateApproximateTownDistanceKm("Harare", "")).toBeNull();
  });
});

describe("Interactive Shop by Category section", () => {
  beforeAll(() => {
    class MockIntersectionObserver {
      private callback: IntersectionObserverCallback;
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
      }
      observe(target: Element) {
        this.callback(
          [{ isIntersecting: true, target } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        );
      }
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    carouselIndex = 0;
    carouselMaxIndex = 1;
    Object.keys(emblaListeners).forEach((k) => delete emblaListeners[k]);
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("expands Types of [Category], fetches category products, supports switching and closing without duplicate fetches", async () => {
    vi.mocked(productService.getProducts).mockImplementation(async (params) => {
      if (params?.category === "vegetables") return vegetableProducts;
      if (params?.category === "fruits") return singleFruitProduct;
      return [];
    });

    renderSection();

    fireEvent.click(screen.getByRole("button", { name: /Vegetables/i }));

    expect(await screen.findByText("Types of Vegetables")).toBeInTheDocument();
    expect(await screen.findByText("Madomasi")).toBeInTheDocument();
    expect(screen.getByText("Covo")).toBeInTheDocument();
    expect(productService.getProducts).toHaveBeenCalledWith({
      category: "vegetables",
      page_size: 24,
    });

    // Switch to Grains (empty state)
    fireEvent.click(screen.getByRole("button", { name: /Grains/i }));
    expect(await screen.findByText("Types of Grains")).toBeInTheDocument();
    expect(await screen.findByText("No products available in Grains yet.")).toBeInTheDocument();

    // Switch back to Vegetables — should reuse cache (no second fetch for vegetables)
    fireEvent.click(screen.getByRole("button", { name: /Vegetables/i }));
    expect(await screen.findByText("Types of Vegetables")).toBeInTheDocument();
    const vegCalls = vi
      .mocked(productService.getProducts)
      .mock.calls.filter(([p]) => p?.category === "vegetables");
    expect(vegCalls).toHaveLength(1);

    // Close expanded section
    fireEvent.click(screen.getByRole("button", { name: /Close Types of Vegetables/i }));
    await waitFor(() => {
      expect(screen.queryByText("Types of Vegetables")).not.toBeInTheDocument();
    });
  });

  it("renders error state and allows retrying", async () => {
    vi.mocked(productService.getProducts)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(vegetableProducts);

    renderSection();

    fireEvent.click(screen.getByRole("button", { name: /Vegetables/i }));
    expect(
      await screen.findByText("Unable to load Vegetables products right now."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));
    expect(await screen.findByText("Madomasi")).toBeInTheDocument();
  });

  it("auto-advances every 5 seconds, reverses at the end with 4 products (3 visible on desktop), supports manual arrows, and skips autoplay for a single product", async () => {
    vi.mocked(productService.getProducts).mockImplementation(async (params) => {
      if (params?.category === "vegetables") return vegetableProducts;
      if (params?.category === "fruits") return singleFruitProduct;
      return [];
    });

    renderSection();

    // Open multi-product category
    fireEvent.click(screen.getByRole("button", { name: /Vegetables/i }));
    expect(await screen.findByText("Madomasi")).toBeInTheDocument();

    // Desktop shows 3 visible cards (lg:basis-1/3, never xl:basis-1/4)
    const items = screen.getAllByTestId("carousel-item");
    expect(items[0].className).toContain("lg:basis-1/3");
    expect(items[0].className).not.toContain("xl:basis-1/4");

    // Manual arrows work and respect boundaries
    fireEvent.click(await screen.findByRole("button", { name: "Next product" }));
    expect(scrollNextMock).toHaveBeenCalledTimes(1);
    expect(carouselIndex).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: "Previous product" }));
    expect(scrollPrevMock).toHaveBeenCalledTimes(1);
    expect(carouselIndex).toBe(0);

    // Switch to single-product category — no manual arrows
    fireEvent.click(screen.getByRole("button", { name: /Fruits/i }));
    expect(await screen.findByText("Mazhanje")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next product" })).not.toBeInTheDocument();
    expect(screen.getByText("Unknown Village")).toBeInTheDocument();
    expect(screen.getByText("Farmer: Farmer name unavailable")).toBeInTheDocument();

    // Switch back to Vegetables with fake timers to verify ping-pong 5-second autoplay
    // Simulating 4 products with 3 visible on desktop => 2 positions: 0 ([1,2,3]) <-> 1 ([2,3,4])
    vi.useFakeTimers();
    carouselIndex = 0;
    carouselMaxIndex = 1;
    scrollNextMock.mockClear();
    scrollPrevMock.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /Vegetables/i }));

    // Position 1 (0) -> Position 2 (1)
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(scrollNextMock).toHaveBeenCalledTimes(1);
    expect(carouselIndex).toBe(1);

    // At final position (1) -> reverses direction back to Position 1 (0)
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(scrollPrevMock).toHaveBeenCalledTimes(1);
    expect(carouselIndex).toBe(0);

    // At start position (0) -> reverses forward again to Position 2 (1)
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(scrollNextMock).toHaveBeenCalledTimes(2);
    expect(carouselIndex).toBe(1);
  });

  it("shows approximate straight-line distance when customer town is selected and opens Product Preview Modal with Shop CTA", async () => {
    vi.mocked(productService.getProducts).mockResolvedValue(vegetableProducts);

    renderSection();

    fireEvent.click(screen.getByRole("button", { name: /Vegetables/i }));
    expect(await screen.findByText("Madomasi")).toBeInTheDocument();

    // Select customer town
    fireEvent.change(screen.getByLabelText(/Your city\/town/i), {
      target: { value: "Harare" },
    });

    expect(screen.getByText(/Same city\/town \(approx\. straight-line\)/i)).toBeInTheDocument();
    expect(screen.getByText(/km away \(approx\. straight-line\)/i)).toBeInTheDocument();

    // Click product card to open preview modal
    fireEvent.click(screen.getByRole("button", { name: /Madomasi/i }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Shop Madomasi/i })).toBeInTheDocument();
    expect(screen.queryByText(/Get Directions/i)).not.toBeInTheDocument();

    // Click CTA navigates to existing product details route
    fireEvent.click(screen.getByRole("button", { name: /Shop Madomasi/i }));
    expect(await screen.findByText("Product Details Destination")).toBeInTheDocument();
  });
});
