import { Link } from "react-router-dom";
import { MapPin, Navigation, ShoppingBag, UserRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getImageUrl } from "@/lib/api-client";
import {
  formatAvailableStockText,
  formatProductUnitDisplay,
  formatQuantityNumber,
} from "@/lib/product-units";
import type { Product } from "@/lib/services/product-service";
import {
  calculateApproximateTownDistanceKm,
  formatApproximateDistance,
} from "@/lib/zimbabwe-locations";

interface CategoryProductPreviewModalProps {
  product: Product | null;
  fallbackCategoryName?: string;
  customerTown: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CategoryProductPreviewModal({
  product,
  fallbackCategoryName,
  customerTown,
  open,
  onOpenChange,
}: CategoryProductPreviewModalProps) {
  if (!product) return null;

  const placeholderImage = "/placeholder.svg";
  const imageUrl = product.image ? getImageUrl(product.image) : placeholderImage;
  const categoryLabel = product.category_details?.name || fallbackCategoryName || "Farm Produce";
  const farmerName = product.farmer_name?.trim() || "Farmer name unavailable";
  const farmerLocation = product.farmer_location?.trim() || "Location not provided";
  const distanceKm = calculateApproximateTownDistanceKm(customerTown, product.farmer_location);
  const distanceLabel = formatApproximateDistance(distanceKm);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden p-0 sm:rounded-2xl">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
            onError={(e) => {
              if (e.currentTarget.src !== new URL(placeholderImage, window.location.href).href) {
                e.currentTarget.src = placeholderImage;
              }
            }}
          />
        </div>

        <div className="space-y-4 p-6">
          <DialogHeader className="space-y-1 text-left">
            <span className="text-xs font-semibold uppercase tracking-wider text-green-600">
              {categoryLabel}
            </span>
            <DialogTitle className="font-display text-2xl font-bold text-foreground">
              {product.name}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Preview details for {product.name} from {farmerName} in {farmerLocation}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 shrink-0 text-green-600" />
              <span>Farmer: {farmerName}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-green-600" />
              <span>{farmerLocation}</span>
            </div>
            {distanceLabel && (
              <div className="flex items-center gap-2 text-xs text-green-700">
                <Navigation className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {distanceLabel} from {customerTown}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Price</span>
              <p className="text-2xl font-bold text-foreground">
                ${parseFloat(product.price).toFixed(2)}
                {product.unit && (
                  <span className="text-sm font-medium text-muted-foreground">
                    {" "}
                    / {formatProductUnitDisplay(product.unit, product.unit_description)}
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatAvailableStockText(product.stock, product.unit, product.is_available)}
                {product.min_order_quantity
                  ? ` · Min order: ${formatQuantityNumber(product.min_order_quantity)}${
                      product.unit
                        ? ` ${formatProductUnitDisplay(product.unit, product.unit_description)}`
                        : ""
                    }`
                  : ""}
              </p>
            </div>

            <Link
              to={`/product/${product.slug}`}
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              <Button className="w-full gap-2 bg-green-600 text-white hover:bg-green-700 sm:w-auto">
                <ShoppingBag className="h-4 w-4" />
                Shop {product.name}
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

