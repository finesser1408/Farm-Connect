import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  MapPin,
  UserRound,
  Star,
  ArrowLeft,
  Plus,
  Minus,
  MessageSquarePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { getImageUrl } from "@/lib/api-client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import ProductReviewSubmissionModal from "@/components/ProductReviewSubmissionModal";
import { useQuery } from "@tanstack/react-query";
import {
  calculateLineSubtotalCents,
  formatAvailableStockText,
  formatProductUnitDisplay,
  formatQuantityNumber,
  isContinuousSellingUnit,
  roundQuantityHundredths,
  validateCustomerOrderQuantity,
} from "@/lib/product-units";
import { productService } from "@/lib/services/product-service";
import { reviewService } from "@/lib/services/review-service";

export default function ProductDetails() {
  const { id: slug } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { user } = useAuth();
  const [qtyInput, setQtyInput] = useState("1");
  const [qtyError, setQtyError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"description" | "reviews">("description");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => productService.getProductBySlug(slug!),
    enabled: !!slug,
  });

  useEffect(() => {
    if (!product) return;
    const initialMin = product.min_order_quantity ?? 1;
    setQtyInput(formatQuantityNumber(initialMin));
    setQtyError(null);
  }, [product?.id, product?.min_order_quantity, product?.unit]);

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

  const productsArray = Array.isArray(relatedProducts)
    ? relatedProducts
    : relatedProducts?.results || [];
  const related = productsArray.filter((item) => item.slug !== slug).slice(0, 4);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="container flex flex-1 items-center justify-center">
          <div className="text-center">
            <h1 className="animate-pulse font-display text-2xl">Loading Product...</h1>
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
            <Link to="/marketplace" className="mt-4 inline-block text-primary hover:underline">
              Back to Marketplace
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const unitDisplay = formatProductUnitDisplay(product.unit, product.unit_description);
  const isContinuous = isContinuousSellingUnit(product.unit);
  const minOrderQty = Number(product.min_order_quantity ?? 1);
  const stockNum = Number(product.stock ?? 0);
  const stepIncrement = isContinuous ? (minOrderQty < 1 ? minOrderQty : 0.5) : 1;

  const liveValidationError = validateCustomerOrderQuantity({
    rawQuantity: qtyInput,
    unit: product.unit,
    unitDescription: product.unit_description,
    minOrderQuantity: minOrderQty,
    stock: stockNum,
    isAvailable: product.is_available,
  });

  const parsedQty = Number(qtyInput);
  const validPreviewQty =
    !liveValidationError && Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : 0;
  const itemSubtotal = calculateLineSubtotalCents(product.price, validPreviewQty);

  const handleAdjustQuantity = (direction: -1 | 1) => {
    setQtyError(null);
    const current = Number(qtyInput);
    const base = Number.isFinite(current) && current > 0 ? current : minOrderQty;
    const rawNext = roundQuantityHundredths(base + direction * stepIncrement);
    const clampedMin = Math.max(minOrderQty, isContinuous ? 0.01 : 1);
    const nextVal = Math.max(clampedMin, stockNum > 0 ? Math.min(stockNum, rawNext) : rawNext);
    setQtyInput(formatQuantityNumber(isContinuous ? nextVal : Math.round(nextVal)));
  };

  const handleAdd = (redirectToCart = false) => {
    const validationErr = validateCustomerOrderQuantity({
      rawQuantity: qtyInput,
      unit: product.unit,
      unitDescription: product.unit_description,
      minOrderQuantity: minOrderQty,
      stock: stockNum,
      isAvailable: product.is_available,
    });
    if (validationErr) {
      setQtyError(validationErr);
      return;
    }

    setQtyError(null);
    const finalQty = roundQuantityHundredths(Number(qtyInput));
    addItem({
      id: String(product.id),
      slug: product.slug,
      name: product.name,
      price: parseFloat(product.price),
      image: product.image || "",
      farmer: product.farmer_name,
      unit: product.unit ?? null,
      unit_description: product.unit_description ?? "",
      formatted_unit: unitDisplay,
      is_countable_unit: product.is_countable_unit ?? !isContinuous,
      min_order_quantity: minOrderQty,
      stock: stockNum,
      is_available: product.is_available,
      quantity: finalQty,
    });

    if (redirectToCart) {
      navigate("/cart");
    }
  };

  const productImageUrl = product.image ? getImageUrl(product.image) : "/placeholder.svg";

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="container flex-1 py-8">
        <Link
          to="/marketplace"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Marketplace
        </Link>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Image */}
          <div className="aspect-square overflow-hidden rounded-lg bg-muted">
            <img
              src={productImageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.src =
                  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop&auto=format";
              }}
            />
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <span className="mb-2 text-xs font-medium uppercase tracking-wide text-primary">
              {product.category_details?.name}
            </span>
            <h1 className="mb-2 font-display text-3xl text-foreground">{product.name}</h1>
            {reviewsData && reviewsData.total_reviews > 0 ? (
              <div className="mb-4 flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1 font-semibold text-foreground">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />{" "}
                  {reviewsData.average_rating}
                </span>
                <span>
                  ({reviewsData.total_reviews}{" "}
                  {reviewsData.total_reviews === 1 ? "review" : "reviews"})
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
            <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
              <UserRound className="h-4 w-4 shrink-0" />
              <span>Farmer: {product.farmer_name?.trim() || "Farmer name unavailable"}</span>
            </div>

            <div className="mb-4">
              <span className="text-3xl font-bold text-foreground">
                ${parseFloat(product.price).toFixed(2)}
              </span>
              {unitDisplay && (
                <span className="text-lg font-medium text-muted-foreground">
                  {" "}
                  / {unitDisplay}
                </span>
              )}
            </div>

            <div className="mb-5 grid grid-cols-1 gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Available: </span>
                <span className="font-medium text-foreground">
                  {formatAvailableStockText(product.stock, product.unit, product.is_available)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Minimum order: </span>
                <span className="font-medium text-foreground">
                  {formatQuantityNumber(minOrderQty)}
                  {unitDisplay ? ` ${unitDisplay}` : ""}
                </span>
              </div>
            </div>

            {/* Unit-aware Quantity Selector & Live Subtotal */}
            <div className="mb-6 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <label htmlFor="product-quantity-input" className="text-sm text-muted-foreground">
                  Quantity{unitDisplay ? ` (${unitDisplay})` : ""}:
                </label>
                <div className="flex items-center rounded-md border border-input bg-background">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => handleAdjustQuantity(-1)}
                    className="px-3 py-2 text-foreground hover:bg-muted"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <Input
                    id="product-quantity-input"
                    aria-label="Quantity"
                    type="number"
                    inputMode={isContinuous ? "decimal" : "numeric"}
                    step={isContinuous ? "0.01" : "1"}
                    min={isContinuous ? "0.01" : "1"}
                    value={qtyInput}
                    onChange={(e) => {
                      setQtyError(null);
                      setQtyInput(e.target.value);
                    }}
                    className="h-9 w-24 border-0 text-center text-sm font-medium focus-visible:ring-0"
                  />
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => handleAdjustQuantity(1)}
                    className="px-3 py-2 text-foreground hover:bg-muted"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-xs text-muted-foreground">
                  {isContinuous ? "Decimals allowed (up to 2 decimal places)" : "Whole numbers only"}
                </span>
              </div>

              <div
                data-testid="product-live-subtotal"
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground">
                  Selected quantity:{" "}
                  <strong className="text-foreground">
                    {qtyInput.trim() || "0"}
                    {unitDisplay ? ` ${unitDisplay}` : ""}
                  </strong>
                </span>
                <span className="font-semibold text-foreground">
                  Item subtotal: ${itemSubtotal.toFixed(2)}
                </span>
              </div>

              {(qtyError || liveValidationError) && (
                <p role="alert" className="text-xs font-medium text-destructive">
                  {qtyError || liveValidationError}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                size="lg"
                className="flex-1 gap-2"
                onClick={() => handleAdd(false)}
                disabled={product.is_available === false || stockNum <= 0}
              >
                <ShoppingCart className="h-4 w-4" /> Add to Cart
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="flex-1"
                onClick={() => handleAdd(true)}
                disabled={product.is_available === false || stockNum <= 0}
              >
                Buy Now
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-12">
          <div className="flex gap-6 border-b border-border">
            <button
              onClick={() => setActiveTab("description")}
              className={`pb-3 text-sm font-medium ${
                activeTab === "description"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground"
              }`}
            >
              Description
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={`pb-3 text-sm font-medium ${
                activeTab === "reviews"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground"
              }`}
            >
              Reviews ({reviewsData?.total_reviews ?? 0})
            </button>
          </div>
          <div className="py-6">
            {activeTab === "description" ? (
              <p className="max-w-2xl text-muted-foreground">{product.description}</p>
            ) : (
              <div className="max-w-3xl space-y-6">
                <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
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
                      className="shrink-0 gap-1.5 bg-green-600 text-white hover:bg-green-700"
                    >
                      <MessageSquarePlus className="h-4 w-4" /> Write a Review
                    </Button>
                  ) : !user ? (
                    <Link to="/login">
                      <Button size="sm" variant="outline" className="shrink-0 gap-1.5">
                        Log in to Review
                      </Button>
                    </Link>
                  ) : null}
                </div>

                {isReviewsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="animate-pulse space-y-2 rounded-lg border border-border p-4"
                      >
                        <div className="h-4 w-1/4 rounded bg-muted" />
                        <div className="h-3 w-full rounded bg-muted" />
                        <div className="h-3 w-3/4 rounded bg-muted" />
                      </div>
                    ))}
                  </div>
                ) : !reviewsData || reviewsData.reviews.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
                    <p className="text-sm font-medium text-foreground">No customer reviews yet.</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Be the first to share your experience with {product.name}!
                    </p>
                    {user?.user_type === "customer" && (
                      <Button
                        size="sm"
                        onClick={() => setIsReviewModalOpen(true)}
                        className="mt-4 bg-green-600 text-white hover:bg-green-700"
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
                        className="space-y-2 rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              {r.display_name}
                            </span>
                            {r.verified_purchase && (
                              <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
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
                          <h4 className="text-sm font-medium text-foreground">{r.title}</h4>
                        )}
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {r.comment}
                        </p>
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
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
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
