import apiClient from "../api-client";

export interface PlatformTestimonial {
  id: number;
  display_name: string;
  role_or_title: string;
  rating: number;
  comment: string;
  is_verified_buyer: boolean;
  created_at: string;
}

export interface CustomerTestimonialInput {
  rating: number;
  comment: string;
  display_name?: string;
  role_or_title?: string;
  consent_public: boolean;
}

export interface MyTestimonialResponse {
  has_testimonial: boolean;
  testimonial: {
    id: number;
    rating: number;
    comment: string;
    display_name: string;
    role_or_title: string;
    consent_public: boolean;
    status: "pending" | "approved" | "rejected";
    is_verified_buyer: boolean;
    created_at: string;
    updated_at: string;
  } | null;
}

export interface ProductReview {
  id: number;
  product_id: number;
  product_slug: string;
  display_name: string;
  rating: number;
  title: string;
  comment: string;
  verified_purchase: boolean;
  created_at: string;
}

export interface ProductReviewsResponse {
  product_slug: string;
  total_reviews: number;
  average_rating: number | null;
  reviews: ProductReview[];
}

export interface ProductReviewInput {
  rating: number;
  title?: string;
  comment: string;
}

export const reviewService = {
  getApprovedTestimonials: async () => {
    const response = await apiClient.get<PlatformTestimonial[]>("/reviews/testimonials/");
    return response.data;
  },

  getMyTestimonial: async () => {
    const response = await apiClient.get<MyTestimonialResponse>("/reviews/testimonials/mine/");
    return response.data;
  },

  submitTestimonial: async (data: CustomerTestimonialInput) => {
    const response = await apiClient.post<PlatformTestimonial>("/reviews/testimonials/", data);
    return response.data;
  },

  getProductReviews: async (slug: string) => {
    const response = await apiClient.get<ProductReviewsResponse>(`/reviews/products/${slug}/`);
    return response.data;
  },

  getMyProductReview: async (slug: string) => {
    const response = await apiClient.get<{
      has_review: boolean;
      review: ProductReview | null;
    }>(`/reviews/products/${slug}/mine/`);
    return response.data;
  },

  submitProductReview: async (slug: string, data: ProductReviewInput) => {
    const response = await apiClient.post<ProductReview>(`/reviews/products/${slug}/`, data);
    return response.data;
  },
};
