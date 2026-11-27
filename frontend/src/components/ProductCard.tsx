import { ShoppingCart, MapPin, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { Link } from "react-router-dom";
import type { Product } from "@/lib/services/product-service";
import { getImageUrl } from "@/lib/api-client";
import {
  formatAvailableStockText,
  formatProductUnitDisplay,
  isContinuousSellingUnit,
} from "@/lib/product-units";

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const placeholderImage = "/placeholder.svg";
  const imageUrl = product.image ? getImageUrl(product.image) : placeholderImage;
  const unitDisplay = formatProductUnitDisplay(product.unit, product.unit_description);
  const minOrderQty = Number(product.min_order_quantity ?? 1);
  const stockNum = Number(product.stock ?? 0);
  const canPurchase =
    product.is_available !== false && stockNum > 0 && stockNum >= minOrderQty;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canPurchase) return;
    addItem({
      id: product.id.toString(),
      slug: product.slug,
      name: product.name,
      price: parseFloat(product.price),
      image: product.image || "",
      farmer: product.farmer_name,
      unit: product.unit ?? null,
      unit_description: product.unit_description ?? "",
      formatted_unit: unitDisplay,
      is_countable_unit:
        product.is_countable_unit ?? !isContinuousSellingUnit(product.unit),
      min_order_quantity: minOrderQty,
      stock: stockNum,
      is_available: product.is_available,
      quantity: minOrderQty,
    });
  };

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-card transition-shadow hover:shadow-card-hover"
    >
      {/* IMAGE SECTION */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={imageUrl}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            if (e.currentTarget.src !== new URL(placeholderImage, window.location.href).href) {
              e.currentTarget.src = placeholderImage;
            }
          }}
        />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <span className="mb-1 text-xs font-medium uppercase tracking-wide text-primary">
          {product.category_details?.name}
        </span>
        <h3 className="font-display text-base text-foreground group-hover:text-primary">
          {product.name}
        </h3>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span>{product.farmer_location?.trim() || "Location not provided"}</span>
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <UserRound className="h-3 w-3 shrink-0" />
          <span>Farmer: {product.farmer_name?.trim() || "Farmer name unavailable"}</span>
        </div>
        <div className="mt-1.5 text-xs font-medium text-muted-foreground">
          {formatAvailableStockText(product.stock, product.unit, canPurchase)}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <div className="min-w-0">
            <span className="text-lg font-bold text-foreground">
              ${parseFloat(product.price).toFixed(2)}
            </span>
            {unitDisplay && (
              <span className="text-xs font-medium text-muted-foreground">
                {" "}
                / {unitDisplay}
              </span>
            )}
          </div>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!canPurchase}
            className="shrink-0 gap-1.5"
          >
            <ShoppingCart className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </div>
    </Link>
  );
}
