import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Navigation,
  RefreshCw,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { ProductCardSkeleton } from "@/components/Skeletons";
import CategoryProductPreviewModal from "@/components/CategoryProductPreviewModal";
import { getImageUrl } from "@/lib/api-client";
import {
  productService,
  type Category,
  type Product,
} from "@/lib/services/product-service";
import {
  ZIMBABWE_TOWNS,
  calculateApproximateTownDistanceKm,
  formatApproximateDistance,
} from "@/lib/zimbabwe-locations";

const AUTOPLAY_INTERVAL_MS = 5000;
const CUSTOMER_TOWN_STORAGE_KEY = "farmconnect_customer_town";

interface ShopByCategorySectionProps {
  categories: Category[];
  categoryImages: Record<string, string>;
  fallbackCategoryImage: string;
  isCategoriesLoading?: boolean;
}

export default function ShopByCategorySection({
  categories,
  categoryImages,
  fallbackCategoryImage,
  isCategoriesLoading = false,
}: ShopByCategorySectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [customerTown, setCustomerTown] = useState<string>(() => {
    try {
      return localStorage.getItem(CUSTOMER_TOWN_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  });

  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [isInViewport, setIsInViewport] = useState(true);
  const [isPageVisible, setIsPageVisible] = useState(
    typeof document === "undefined" ? true : document.visibilityState === "visible",
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [autoplayResetTick, setAutoplayResetTick] = useState(0);

  const autoplayDirectionRef = useRef<1 | -1>(1);
  const carouselSectionRef = useRef<HTMLDivElement | null>(null);
  const expandedPanelRef = useRef<HTMLDivElement | null>(null);

  const handleCustomerTownChange = (value: string) => {
    setCustomerTown(value);
    try {
      if (value) {
        localStorage.setItem(CUSTOMER_TOWN_STORAGE_KEY, value);
      } else {
        localStorage.removeItem(CUSTOMER_TOWN_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors in restricted browsing contexts.
    }
  };

  const handleSelectCategory = (category: Category) => {
    autoplayDirectionRef.current = 1;
    setSelectedCategory((current) =>
      current?.slug === category.slug ? null : category,
    );
    setPreviewProduct(null);
  };

  // Smoothly scroll to the expanded category section below the sticky navbar
  useEffect(() => {
    if (!selectedCategory) return;

    const frameId = window.requestAnimationFrame(() => {
      expandedPanelRef.current?.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [selectedCategory, prefersReducedMotion]);

  const {
    data: categoryProductsData,
    isLoading: isCategoryProductsLoading,
    isError: isCategoryProductsError,
    refetch: refetchCategoryProducts,
  } = useQuery({
    queryKey: ["products", "category", selectedCategory?.slug],
    queryFn: () =>
      productService.getProducts({
        category: selectedCategory!.slug,
        page_size: 24,
      }),
    enabled: Boolean(selectedCategory?.slug),
    staleTime: 5 * 60 * 1000,
  });

  const categoryProducts: Product[] = categoryProductsData
    ? Array.isArray(categoryProductsData)
      ? categoryProductsData
      : categoryProductsData.results
    : [];

  // Respect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updatePreference);
      return () => mediaQuery.removeEventListener("change", updatePreference);
    }
    mediaQuery.addListener(updatePreference);
    return () => mediaQuery.removeListener(updatePreference);
  }, []);

  // Pause when page tab is hidden
  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleVisibilityChange = () => {
      setIsPageVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Pause when carousel is outside viewport
  useEffect(() => {
    if (!selectedCategory || categoryProducts.length === 0 || typeof IntersectionObserver === "undefined") {
      return;
    }
    const node = carouselSectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInViewport(entry.isIntersecting);
      },
      { threshold: 0.15 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [selectedCategory, categoryProducts.length]);

  // Listen for Embla pointer/select/reInit events to track scroll bounds and reset timer
  useEffect(() => {
    if (!carouselApi) return;

    const updateScrollState = () => {
      setCanScrollPrev(carouselApi.canScrollPrev());
      setCanScrollNext(carouselApi.canScrollNext());
    };

    const handlePointerDown = () => setIsUserInteracting(true);
    const handlePointerUp = () => setIsUserInteracting(false);
    const handleSelect = () => {
      updateScrollState();
      setAutoplayResetTick((tick) => tick + 1);
    };

    updateScrollState();
    carouselApi.on("reInit", updateScrollState);
    carouselApi.on("pointerDown", handlePointerDown);
    carouselApi.on("pointerUp", handlePointerUp);
    carouselApi.on("select", handleSelect);

    return () => {
      carouselApi.off("reInit", updateScrollState);
      carouselApi.off("pointerDown", handlePointerDown);
      carouselApi.off("pointerUp", handlePointerUp);
      carouselApi.off("select", handleSelect);
    };
  }, [carouselApi]);

  const canMoveCarousel = canScrollPrev || canScrollNext;

  const canAutoplay =
    Boolean(selectedCategory) &&
    Boolean(carouselApi) &&
    categoryProducts.length > 1 &&
    canMoveCarousel &&
    !isUserInteracting &&
    !previewProduct &&
    isInViewport &&
    isPageVisible &&
    !prefersReducedMotion;

  useEffect(() => {
    if (!canAutoplay || !carouselApi) return;

    const timer = window.setInterval(() => {
      if (autoplayDirectionRef.current === 1) {
        if (carouselApi.canScrollNext()) {
          carouselApi.scrollNext();
        } else if (carouselApi.canScrollPrev()) {
          autoplayDirectionRef.current = -1;
          carouselApi.scrollPrev();
        }
      } else if (carouselApi.canScrollPrev()) {
        carouselApi.scrollPrev();
      } else if (carouselApi.canScrollNext()) {
        autoplayDirectionRef.current = 1;
        carouselApi.scrollNext();
      }
    }, AUTOPLAY_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [canAutoplay, carouselApi, autoplayResetTick]);

  const handleScrollPrev = useCallback(() => {
    autoplayDirectionRef.current = -1;
    carouselApi?.scrollPrev();
  }, [carouselApi]);

  const handleScrollNext = useCallback(() => {
    autoplayDirectionRef.current = 1;
    carouselApi?.scrollNext();
  }, [carouselApi]);

  const placeholderImage = "/placeholder.svg";

  return (
    <section className="overflow-x-clip py-20">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <span className="text-sm font-semibold uppercase tracking-wider text-green-600">
            Categories
          </span>
          <h2 className="mt-2 font-display text-3xl font-bold text-gray-900 md:text-4xl">
            Shop by <span className="text-green-700">Category</span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-gray-500">
            Explore our curated selection of farm-fresh products
          </p>
        </motion.div>

        {isCategoriesLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="aspect-square animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((cat, i) => {
              const isSelected = selectedCategory?.slug === cat.slug;
              return (
                <motion.div
                  key={cat.slug}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={prefersReducedMotion ? undefined : { y: -4 }}
                >
                  <button
                    type="button"
                    aria-expanded={isSelected}
                    aria-controls="expanded-category-products"
                    onClick={() => handleSelectCategory(cat)}
                    className={`group relative flex aspect-square w-full flex-col items-center justify-end overflow-hidden rounded-2xl text-center shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 ${
                      isSelected ? "ring-2 ring-green-600 ring-offset-2" : ""
                    }`}
                  >
                    <img
                      src={categoryImages[cat.slug] || fallbackCategoryImage}
                      alt={cat.name}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
                    <div className="relative z-10 mb-3 flex flex-col items-center px-2">
                      <span className="font-display text-base font-semibold text-white drop-shadow-lg sm:text-lg">
                        {cat.name}
                      </span>
                      <span
                        className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium backdrop-blur-sm transition-colors ${
                          isSelected
                            ? "bg-green-600 text-white"
                            : "bg-white/20 text-white group-hover:bg-green-600"
                        }`}
                      >
                        {isSelected ? "Hide types" : "See types"}
                        <ChevronRight
                          className={`h-3 w-3 transition-transform ${
                            isSelected ? "rotate-90" : ""
                          }`}
                        />
                      </span>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        <AnimatePresence>
          {selectedCategory && (
            <motion.div
              id="expanded-category-products"
              ref={expandedPanelRef}
              key="expanded-category-products"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="mt-8 scroll-mt-24 overflow-hidden rounded-2xl border border-green-100 bg-white p-5 shadow-lg shadow-green-900/5 sm:p-7"
            >
              {/* Expanded Header */}
              <div className="mb-6 flex flex-col gap-4 border-b border-gray-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="font-display text-2xl font-bold text-gray-900">
                    Types of {selectedCategory.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Click any product to preview details or navigate to its full page.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Optional customer town/city selector for approximate straight-line distances */}
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                    <label
                      htmlFor="customer-town-select"
                      className="text-xs font-medium text-gray-600"
                    >
                      Your city/town (optional):
                    </label>
                    <select
                      id="customer-town-select"
                      value={customerTown}
                      onChange={(e) => handleCustomerTownChange(e.target.value)}
                      className="h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-green-600"
                    >
                      <option value="">Not selected</option>
                      {ZIMBABWE_TOWNS.map((town) => (
                        <option key={town.name} value={town.name}>
                          {town.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Link to={`/marketplace?category=${selectedCategory.slug}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 border-green-200 text-green-700 hover:bg-green-50"
                    >
                      View all
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                    aria-label={`Close Types of ${selectedCategory.name}`}
                    className="gap-1 text-gray-500 hover:text-gray-900"
                  >
                    <X className="h-4 w-4" />
                    Close
                  </Button>
                </div>
              </div>

              {customerTown && (
                <p className="mb-4 text-xs text-muted-foreground">
                  Distances shown from <span className="font-medium text-foreground">{customerTown}</span> are approximate straight-line town-to-town distances.
                </p>
              )}

              {/* Loading State */}
              {isCategoryProductsLoading && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[...Array(3)].map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              )}

              {/* Error State */}
              {!isCategoryProductsLoading && isCategoryProductsError && (
                <div
                  role="alert"
                  className="flex flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50/50 px-4 py-10 text-center"
                >
                  <AlertCircle className="mb-2 h-8 w-8 text-red-500" />
                  <p className="font-medium text-gray-900">
                    Unable to load {selectedCategory.name} products right now.
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Please try again in a moment.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => refetchCategoryProducts()}
                    className="mt-4 gap-2"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry
                  </Button>
                </div>
              )}

              {/* Empty State */}
              {!isCategoryProductsLoading &&
                !isCategoryProductsError &&
                categoryProducts.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-12 text-center">
                    <p className="font-display text-lg font-medium text-gray-900">
                      No products available in {selectedCategory.name} yet.
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Check back soon or browse other categories in the marketplace.
                    </p>
                    <Link to="/marketplace" className="mt-4 inline-block">
                      <Button variant="outline" size="sm">
                        Browse Marketplace
                      </Button>
                    </Link>
                  </div>
                )}

              {/* Carousel */}
              {!isCategoryProductsLoading &&
                !isCategoryProductsError &&
                categoryProducts.length > 0 && (
                  <div
                    ref={carouselSectionRef}
                    onMouseEnter={() => setIsUserInteracting(true)}
                    onMouseLeave={() => setIsUserInteracting(false)}
                    onFocusCapture={() => setIsUserInteracting(true)}
                    onBlurCapture={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                        setIsUserInteracting(false);
                      }
                    }}
                    className="relative"
                  >
                    {categoryProducts.length > 1 && canMoveCarousel && (
                      <div className="mb-3 flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleScrollPrev}
                          disabled={!canScrollPrev}
                          aria-label="Previous product"
                          className="h-8 w-8 rounded-full border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-40"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleScrollNext}
                          disabled={!canScrollNext}
                          aria-label="Next product"
                          className="h-8 w-8 rounded-full border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-40"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    <Carousel
                      setApi={setCarouselApi}
                      opts={{
                        align: "start",
                        loop: false,
                        containScroll: "trimSnaps",
                        slidesToScroll: 1,
                      }}
                      className="w-full"
                    >
                      <CarouselContent className="-ml-4">
                        {categoryProducts.map((product) => {
                          const imageUrl = product.image
                            ? getImageUrl(product.image)
                            : placeholderImage;
                          const farmerName =
                            product.farmer_name?.trim() || "Farmer name unavailable";
                          const farmerLocation =
                            product.farmer_location?.trim() || "Location not provided";
                          const distanceKm = calculateApproximateTownDistanceKm(
                            customerTown,
                            product.farmer_location,
                          );
                          const distanceLabel = formatApproximateDistance(distanceKm);

                          return (
                            <CarouselItem
                              key={product.id}
                              className="basis-full pl-4 sm:basis-1/2 lg:basis-1/3"
                            >
                              <button
                                type="button"
                                onClick={() => setPreviewProduct(product)}
                                className="group flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-card transition-all hover:border-green-300 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                              >
                                <div className="relative aspect-square w-full overflow-hidden bg-muted">
                                  <img
                                    src={imageUrl}
                                    alt={product.name}
                                    loading="lazy"
                                    decoding="async"
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    onError={(e) => {
                                      if (
                                        e.currentTarget.src !==
                                        new URL(placeholderImage, window.location.href).href
                                      ) {
                                        e.currentTarget.src = placeholderImage;
                                      }
                                    }}
                                  />
                                </div>

                                <div className="flex flex-1 flex-col p-4">
                                  <h4 className="font-display text-base font-semibold text-foreground group-hover:text-green-700">
                                    {product.name}
                                  </h4>

                                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                      <MapPin className="h-3.5 w-3.5 shrink-0 text-green-600" />
                                      <span>{farmerLocation}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <UserRound className="h-3.5 w-3.5 shrink-0 text-green-600" />
                                      <span>Farmer: {farmerName}</span>
                                    </div>
                                    {distanceLabel && (
                                      <div className="flex items-center gap-1.5 text-green-700">
                                        <Navigation className="h-3 w-3 shrink-0" />
                                        <span>{distanceLabel}</span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="mt-auto flex items-center justify-between pt-3">
                                    <span className="text-base font-bold text-foreground">
                                      ${parseFloat(product.price).toFixed(2)}
                                    </span>
                                    <span className="text-xs font-medium text-green-700 group-hover:underline">
                                      Quick preview
                                    </span>
                                  </div>
                                </div>
                              </button>
                            </CarouselItem>
                          );
                        })}
                      </CarouselContent>
                    </Carousel>
                  </div>
                )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <CategoryProductPreviewModal
        product={previewProduct}
        fallbackCategoryName={selectedCategory?.name}
        customerTown={customerTown}
        open={Boolean(previewProduct)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPreviewProduct(null);
        }}
      />
    </section>
  );
}

