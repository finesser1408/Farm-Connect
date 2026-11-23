import { useParams, Link } from "react-router-dom";
import { ShoppingCart, MapPin, UserRound, Star, ArrowLeft, Plus, Minus, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import ProductReviewSubmissionModal from "@/components/ProductReviewSubmissionModal";
import { useQuery } from "@tanstack/react-query";
import { productService } from "@/lib/services/product-service";
import { reviewService } from "@/lib/services/review-service";

export default function ProductDetails() {
  const { id: slug } = useParams();
  const { addItem } = useCart();
  const { user } = useAuth();
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<"description" | "reviews">("description");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => productService.getProductBySlug(slug!),
    enabled: !!slug,
  });

  const {
    data: reviewsData,
    isLoading: isReviewsLoading,
    refetch: refetchReviews,
  } = useQuery({
    queryKey: ["product-reviews", slug],
    queryFn: () => reviewService.getProductReviews(slug!),
    enabled: !!slug,
  });

  const { data: relatedProducts } = useQuery({
    queryKey: ["products", "related", product?.category_details?.slug],
    queryFn: () => productService.getProducts({ category: product?.category_details?.slug }),
    enabled: !!product?.category_details?.slug,
  });

  const productsArray = Array.isArray(relatedProducts) ? relatedProducts : relatedProducts?.results || [];
  const related = productsArray.filter((product) => product.slug !== slug).slice(0, 4);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="container flex flex-1 items-center justify-center">
          <div className="text-center">
            <h1 className="font-display text-2xl animate-pulse">Loading Product...</h1>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="container flex flex-1 items-center justify-center">
          <div className="text-center">
            <h1 className="font-display text-2xl">Product Not Found</h1>
            <Link to="/marketplace" className="mt-4 inline-block text-primary hover:underline">Back to Marketplace</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const emoji: Record<string, string> = { fruits: "🍓", vegetables: "🥬", grains: "🌾", dairy: "🧀", livestock: "🥚" };

  const handleAdd = () => {
    for (let i = 0; i < qty; i++) {
      addItem({ 
        id: String(product.id), 
        name: product.name, 
        price: parseFloat(product.price), 
        image: product.image || "", 
        farmer: product.farmer_name 
      });
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="container flex-1 py-8">
        <Link to="/marketplace" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to Marketplace
        </Link>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Image */}
           <div className="aspect-square overflow-hidden rounded-lg bg-muted">
  <img
    src={product.image}
    alt={product.name}
    className="h-full w-full object-cover"
    onError={(e) => {
      e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop&auto=format';
    }}
  />
</div>

          {/* Info */}
          <div className="flex flex-col">
            <span className="mb-2 text-xs font-medium uppercase tracking-wide text-primary">{product.category_details?.name}</span>
            <h1 className="mb-2 font-display text-3xl text-foreground">{product.name}</h1>
            {reviewsData && reviewsData.total_reviews > 0 ? (
              <div className="mb-4 flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1 font-semibold text-foreground">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {reviewsData.average_rating}
                </span>
                <span>
                  ({reviewsData.total_reviews} {reviewsData.total_reviews === 1 ? "review" : "reviews"})
                </span>
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="h-4 w-4 text-muted-foreground/40" />
                <span>No reviews yet</span>
              </div>
            )}
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>{product.farmer_location?.trim() || "Location not provided"}</span>
            </div>
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <UserRound className="h-4 w-4 shrink-0" />
              <span>Farmer: {product.farmer_name?.trim() || "Farmer name unavailable"}</span>
            </div>
            <span className="mb-6 text-3xl font-bold text-foreground">${parseFloat(product.price).toFixed(2)}</span>

            {/* Quantity */}
            <div className="mb-6 flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Quantity:</span>
              <div className="flex items-center rounded-md border border-input">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2 text-foreground hover:bg-muted"><Minus className="h-4 w-4" /></button>
                <span className="min-w-[40px] text-center text-sm font-medium">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="px-3 py-2 text-foreground hover:bg-muted"><Plus className="h-4 w-4" /></button>
              </div>
              <span className="text-xs text-muted-foreground">{product.stock} in stock</span>
            </div>

            <div className="flex gap-3">
              <Button size="lg" className="flex-1 gap-2" onClick={handleAdd}>
                <ShoppingCart className="h-4 w-4" /> Add to Cart
              </Button>
              <Link to="/cart" className="flex-1">
                <Button size="lg" variant="secondary" className="w-full" onClick={handleAdd}>Buy Now</Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-12">
          <div className="flex gap-6 border-b border-border">
            <button
              onClick={() => setActiveTab("description")}
              className={`pb-3 text-sm font-medium ${activeTab === "description" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
            >Description</button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={`pb-3 text-sm font-medium ${activeTab === "reviews" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
            >
              Reviews ({reviewsData?.total_reviews ?? 0})
            </button>
          </div>
          <div className="py-6">
            {activeTab === "description" ? (
              <p className="max-w-2xl text-muted-foreground">{product.description}</p>
            ) : (
              <div className="space-y-6 max-w-3xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">
                      Customer Reviews
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {reviewsData && reviewsData.total_reviews > 0
                        ? `Average rating: ${reviewsData.average_rating} out of 5 stars based on ${reviewsData.total_reviews} review${reviewsData.total_reviews === 1 ? "" : "s"}`
                        : "There are no verified customer reviews for this product yet."}
                    </p>
                  </div>
                  {user?.user_type === "customer" ? (
                    <Button
                      size="sm"
                      onClick={() => setIsReviewModalOpen(true)}
                      className="gap-1.5 bg-green-600 hover:bg-green-700 text-white shrink-0"
                    >
                      <MessageSquarePlus className="h-4 w-4" /> Write a Review
                    </Button>
                  ) : !user ? (
                    <Link to="/login">
                      <Button size="sm" variant="outline" className="gap-1.5 shrink-0">
                        Log in to Review
                      </Button>
                    </Link>
                  ) : null}
                </div>

                {isReviewsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse rounded-lg border border-border p-4 space-y-2">
                        <div className="h-4 bg-muted rounded w-1/4" />
                        <div className="h-3 bg-muted rounded w-full" />
                        <div className="h-3 bg-muted rounded w-3/4" />
                      </div>
                    ))}
                  </div>
                ) : !reviewsData || reviewsData.reviews.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center bg-card">
                    <p className="text-sm font-medium text-foreground">No customer reviews yet.</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Be the first to share your experience with {product.name}!
                    </p>
                    {user?.user_type === "customer" && (
                      <Button
                        size="sm"
                        onClick={() => setIsReviewModalOpen(true)}
                        className="mt-4 bg-green-600 hover:bg-green-700 text-white"
                      >
                        Leave the First Review
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviewsData.reviews.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-sm space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">
                              {r.display_name}
                            </span>
                            {r.verified_purchase && (
                              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                                Verified Purchase
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex gap-1" aria-label={`${r.rating} out of 5 stars`}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3.5 w-3.5 ${
                                star <= r.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "fill-transparent text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        {r.title && (
                          <h4 className="font-medium text-sm text-foreground">{r.title}</h4>
                        )}
                        <p className="text-sm text-muted-foreground leading-relaxed">{r.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-6 font-display text-2xl text-foreground">Related Products</h2>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>
      <Footer />

      <ProductReviewSubmissionModal
        productSlug={slug || ""}
        productName={product.name}
        open={isReviewModalOpen}
        onOpenChange={setIsReviewModalOpen}
        onSuccess={() => refetchReviews()}
      />
    </div>
  );
}
