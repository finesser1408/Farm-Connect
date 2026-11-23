import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, beforeAll, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Index from "@/pages/Index";
import ProductDetails from "@/pages/ProductDetails";
import TestimonialSubmissionModal from "@/components/TestimonialSubmissionModal";
import ProductReviewSubmissionModal from "@/components/ProductReviewSubmissionModal";
import { useAuth, type User } from "@/lib/auth-context";
import { reviewService } from "@/lib/services/review-service";
import { productService } from "@/lib/services/product-service";

class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  vi.stubGlobal("ResizeObserver", MockResizeObserver);
});

vi.mock("@/lib/cart-context", () => ({
  useCart: () => ({ addItem: vi.fn(), items: [], totalPrice: 0 }),
  CartProvider: ({ children }: any) => children,
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: vi.fn(),
  getAuthErrorMessage: (err: any) => err?.message || "An error occurred",
}));

vi.mock("@/lib/services/review-service", () => ({
  reviewService: {
    getApprovedTestimonials: vi.fn(),
    getMyTestimonial: vi.fn(),
    submitTestimonial: vi.fn(),
    getProductReviews: vi.fn(),
    getMyProductReview: vi.fn(),
    submitProductReview: vi.fn(),
  },
}));

vi.mock("@/lib/services/product-service", () => ({
  productService: {
    getProducts: vi.fn(),
    getCategories: vi.fn(),
    getProductBySlug: vi.fn(),
  },
}));

vi.mock("@/components/Navbar", () => ({
  default: () => <nav data-testid="navbar">Navbar</nav>,
}));

vi.mock("@/components/Footer", () => ({
  default: () => <footer data-testid="footer">Footer</footer>,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function customerUser(): User {
  return {
    id: 1,
    email: "customer@example.com",
    username: "customer_jane",
    first_name: "Jane",
    last_name: "Doe",
    user_type: "customer",
    is_staff: false,
  };
}

describe("FarmConnect Review System — Frontend Integration", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.mocked(useAuth).mockReturnValue({
      user: customerUser(),
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      updateProfile: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(productService.getProducts).mockResolvedValue([]);
    vi.mocked(productService.getCategories).mockResolvedValue([]);
  });

  it("renders approved testimonials on the homepage with accurate star ratings and author names", async () => {
    vi.mocked(reviewService.getApprovedTestimonials).mockResolvedValue([
      {
        id: 101,
        display_name: "Tariro M.",
        role_or_title: "Home Baker",
        rating: 5,
        comment: "Fresh farm produce delivered on time every single week. Unbeatable taste!",
        is_verified_buyer: false,
        created_at: "2026-11-20T10:00:00Z",
      },
      {
        id: 102,
        display_name: "Farai K.",
        role_or_title: "Chef",
        rating: 4,
        comment: "Top notch organic spinach and tomatoes for my restaurant kitchen.",
        is_verified_buyer: false,
        created_at: "2026-11-21T12:00:00Z",
      },
    ]);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<Index />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Tariro M.")).toBeInTheDocument();
    expect(screen.getByText("Home Baker")).toBeInTheDocument();
    expect(
      screen.getByText('"Fresh farm produce delivered on time every single week. Unbeatable taste!"'),
    ).toBeInTheDocument();

    expect(screen.getByText("Farai K.")).toBeInTheDocument();
    expect(screen.getByText("Chef")).toBeInTheDocument();
  });

  it("renders an appropriate empty state on homepage when no approved testimonials exist", async () => {
    vi.mocked(reviewService.getApprovedTestimonials).mockResolvedValue([]);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<Index />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("No customer testimonials published yet.")).toBeInTheDocument();
    expect(screen.getByText(/Genuine reviews from our verified community will appear here/)).toBeInTheDocument();
    expect(screen.getByText("Be the First to Share Feedback")).toBeInTheDocument();
  });

  it("submits customer feedback via TestimonialSubmissionModal requiring consent and comment length", async () => {
    vi.mocked(reviewService.getMyTestimonial).mockResolvedValue({
      has_testimonial: false,
      testimonial: null,
    });
    vi.mocked(reviewService.submitTestimonial).mockResolvedValue({
      id: 1,
      display_name: "Jane D.",
      role_or_title: "Home Cook",
      rating: 5,
      comment: "Wonderful service connecting local farmers directly to families.",
      is_verified_buyer: false,
      created_at: "2026-11-23T08:00:00Z",
    });

    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();

    render(
      <TestimonialSubmissionModal
        open={true}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />,
    );

    expect(await screen.findByText("Share Your Experience")).toBeInTheDocument();

    const commentInput = screen.getByPlaceholderText(
      /What do you love most about FarmConnect/,
    );
    fireEvent.change(commentInput, {
      target: { value: "Wonderful service connecting local farmers directly to families." },
    });

    // Check consent checkbox
    const consentCheckbox = screen.getByRole("checkbox");
    fireEvent.click(consentCheckbox);

    // Wait for form to be enabled
    await waitFor(() => {
      expect(screen.getByText("Submit Testimonial")).not.toBeDisabled();
    });

    // Submit form
    const submitBtn = screen.getByText("Submit Testimonial");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(reviewService.submitTestimonial).toHaveBeenCalledWith({
        rating: 5,
        comment: "Wonderful service connecting local farmers directly to families.",
        display_name: "Jane D.",
        role_or_title: "",
        consent_public: true,
      });
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("renders live product reviews and aggregate ratings on ProductDetails", async () => {
    vi.mocked(productService.getProductBySlug).mockResolvedValue({
      id: 42,
      name: "Fresh Red Onions",
      slug: "fresh-red-onions",
      description: "Crisp red onions from Mazowe valley.",
      price: "2.50",
      stock: 40,
      image: null,
      is_available: true,
      farmer_name: "Tendai Shumba",
      farmer_location: "Mazowe",
      category: 1,
      category_details: { id: 1, name: "Vegetables", slug: "vegetables", description: "" },
      created_at: "2026-11-10T00:00:00Z",
      updated_at: "2026-11-10T00:00:00Z",
    });

    vi.mocked(reviewService.getProductReviews).mockResolvedValue({
      product_slug: "fresh-red-onions",
      total_reviews: 2,
      average_rating: 4.5,
      reviews: [
        {
          id: 501,
          product_id: 42,
          product_slug: "fresh-red-onions",
          display_name: "Chipo M.",
          rating: 5,
          title: "Sweet and crisp",
          comment: "These onions arrived in perfect condition. Super flavorful!",
          verified_purchase: false,
          created_at: "2026-11-18T10:00:00Z",
        },
      ],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/product/fresh-red-onions"]}>
          <Routes>
            <Route path="/product/:id" element={<ProductDetails />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Header aggregate
    expect(await screen.findByText("Fresh Red Onions")).toBeInTheDocument();
    expect(screen.getByText("4.5")).toBeInTheDocument();
    expect(screen.getByText("(2 reviews)")).toBeInTheDocument();

    // Reviews tab
    const reviewsTab = screen.getByText("Reviews (2)");
    fireEvent.click(reviewsTab);

    expect(screen.getByText("Customer Reviews")).toBeInTheDocument();
    expect(screen.getByText("Chipo M.")).toBeInTheDocument();
    expect(screen.getByText("Sweet and crisp")).toBeInTheDocument();
    expect(screen.getByText("These onions arrived in perfect condition. Super flavorful!")).toBeInTheDocument();
  });

  it("submits a product review using ProductReviewSubmissionModal", async () => {
    vi.mocked(reviewService.getMyProductReview).mockResolvedValue({
      has_review: false,
      review: null,
    });
    vi.mocked(reviewService.submitProductReview).mockResolvedValue({
      id: 99,
      product_id: 42,
      product_slug: "fresh-red-onions",
      display_name: "Jane D.",
      rating: 5,
      title: "Delicious onions",
      comment: "Really fresh red onions that made our salad delicious.",
      verified_purchase: false,
      created_at: "2026-11-23T08:00:00Z",
    });

    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();

    render(
      <ProductReviewSubmissionModal
        productSlug="fresh-red-onions"
        productName="Fresh Red Onions"
        open={true}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />,
    );

    expect(await screen.findByText("Review Fresh Red Onions")).toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText(/Incredibly fresh and sweet/);
    fireEvent.change(titleInput, { target: { value: "Delicious onions" } });

    const commentInput = screen.getByPlaceholderText(
      /Describe the freshness, taste, and condition/,
    );
    fireEvent.change(commentInput, {
      target: { value: "Really fresh red onions that made our salad delicious." },
    });

    // Wait for form to be enabled
    await waitFor(() => {
      expect(screen.getByText("Submit Review")).not.toBeDisabled();
    });

    const submitBtn = screen.getByText("Submit Review");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(reviewService.submitProductReview).toHaveBeenCalledWith(
        "fresh-red-onions",
        {
          rating: 5,
          title: "Delicious onions",
          comment: "Really fresh red onions that made our salad delicious.",
        },
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
