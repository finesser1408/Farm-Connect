import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Minus,
  Plus,
  Trash2,
  ArrowLeft,
  ShoppingBag,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart, type CartItem } from "@/lib/cart-context";
import { getImageUrl } from "@/lib/api-client";
import {
  calculateLineSubtotalCents,
  formatAvailableStockText,
  formatProductUnitDisplay,
  formatQuantityNumber,
  isContinuousSellingUnit,
  roundCurrencyCents,
  roundQuantityHundredths,
  validateCustomerOrderQuantity,
} from "@/lib/product-units";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

function getItemUnitDisplay(item: CartItem): string {
  if (item.unit) {
    return formatProductUnitDisplay(item.unit, item.unit_description);
  }
  return (item.formatted_unit || "").trim();
}

function getItemValidationError(item: CartItem, rawValue?: string): string | null {
  const hasMetadata =
    item.unit !== undefined ||
    item.stock !== undefined ||
    item.min_order_quantity !== undefined ||
    item.is_available !== undefined;
  const qtyToCheck = rawValue !== undefined ? rawValue : item.quantity;

  if (!hasMetadata && rawValue === undefined) {
    return item.validationError ?? null;
  }

  return validateCustomerOrderQuantity({
    rawQuantity: qtyToCheck,
    unit: item.unit,
    unitDescription: item.unit_description,
    minOrderQuantity: item.min_order_quantity ?? 1,
    stock: item.stock,
    isAvailable: item.is_available ?? true,
  });
}

export default function CartPage() {
  const navigate = useNavigate();
  const { items, isLoading, updateQuantity, removeItem, totalPrice } = useCart();
  const [draftQuantities, setDraftQuantities] = useState<Record<string, string>>({});
  const [draftErrors, setDraftErrors] = useState<Record<string, string | null>>({});

  useEffect(() => {
    setDraftQuantities((prev) => {
      const next: Record<string, string> = {};
      for (const item of items) {
        next[item.id] = prev[item.id] !== undefined && draftErrors[item.id]
          ? prev[item.id]
          : formatQuantityNumber(item.quantity);
      }
      return next;
    });
  }, [items, draftErrors]);

  const delivery = items.length > 0 ? 5.0 : 0;
  const grandTotal = roundCurrencyCents(totalPrice + delivery);

  const handleStepQuantity = (item: CartItem, direction: -1 | 1) => {
    const isContinuous =
      item.unit !== undefined
        ? isContinuousSellingUnit(item.unit)
        : item.is_countable_unit === false;
    const minOrder = Number(item.min_order_quantity ?? 1);
    const step = isContinuous ? (minOrder < 1 ? minOrder : 0.5) : 1;
    const nextQty = roundQuantityHundredths(item.quantity + direction * step);

    if (nextQty <= 0) {
      removeItem(item.id);
      return;
    }

    setDraftErrors((prev) => ({ ...prev, [item.id]: null }));
    setDraftQuantities((prev) => ({ ...prev, [item.id]: formatQuantityNumber(nextQty) }));
    updateQuantity(item.id, nextQty);
  };

  const handleDirectInputChange = (item: CartItem, value: string) => {
    setDraftQuantities((prev) => ({ ...prev, [item.id]: value }));

    const error = validateCustomerOrderQuantity({
      rawQuantity: value,
      unit: item.unit,
      unitDescription: item.unit_description,
      minOrderQuantity: item.min_order_quantity ?? 1,
      stock: item.stock,
      isAvailable: item.is_available ?? true,
    });

    setDraftErrors((prev) => ({ ...prev, [item.id]: error }));
    if (!error) {
      updateQuantity(item.id, roundQuantityHundredths(Number(value)));
    }
  };

  const itemValidationErrors = items.map((item) => ({
    id: item.id,
    error: draftErrors[item.id] || getItemValidationError(item),
  }));
  const hasAnyInvalidItem = itemValidationErrors.some((entry) => Boolean(entry.error));

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="container flex-1 py-8">
        <h1 className="mb-8 font-display text-3xl text-foreground">Shopping Cart</h1>

        {isLoading && items.length === 0 ? (
          <div
            role="status"
            className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground"
          >
            Loading your cart…
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <ShoppingBag className="mb-4 h-16 w-16 text-muted-foreground/40" />
            <h2 className="mb-2 font-display text-xl text-foreground">Your cart is empty</h2>
            <p className="mb-6 text-muted-foreground">
              Add some fresh farm products to get started!
            </p>
            <Link to="/marketplace">
              <Button>Browse Marketplace</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Items */}
            <div className="lg:col-span-2">
              <div className="rounded-lg border border-border bg-card">
                {/* Header */}
                <div className="hidden border-b border-border px-6 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[2fr,1.3fr,1fr,auto]">
                  <span>Product</span>
                  <span className="text-center">Quantity</span>
                  <span className="text-right">Subtotal</span>
                  <span></span>
                </div>
                {items.map((item) => {
                  const unitDisplay = getItemUnitDisplay(item);
                  const isContinuous =
                    item.unit !== undefined
                      ? isContinuousSellingUnit(item.unit)
                      : item.is_countable_unit === false;
                  const lineSubtotal = calculateLineSubtotalCents(item.price, item.quantity);
                  const itemError = draftErrors[item.id] || getItemValidationError(item);
                  const imgSrc = item.image ? getImageUrl(item.image) : "/placeholder.svg";

                  return (
                    <div
                      key={item.id}
                      data-testid={`cart-item-${item.id}`}
                      className="space-y-3 border-b border-border p-4 last:border-0 sm:px-6"
                    >
                      <div className="flex flex-col gap-4 sm:grid sm:grid-cols-[2fr,1.3fr,1fr,auto] sm:items-center">
                        <div className="flex items-start gap-3">
                          <img
                            src={imgSrc}
                            alt={item.name}
                            className="h-14 w-14 shrink-0 rounded-md bg-muted object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder.svg";
                            }}
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">{item.name}</p>
                            {item.farmer && (
                              <p className="text-xs text-muted-foreground">
                                Farmer: {item.farmer}
                              </p>
                            )}
                            <p className="text-xs font-medium text-primary">
                              ${Number(item.price).toFixed(2)}
                              {unitDisplay ? ` / ${unitDisplay}` : ""}
                            </p>
                            {(item.stock !== undefined || item.min_order_quantity !== undefined) && (
                              <p className="text-[11px] text-muted-foreground">
                                {item.stock !== undefined
                                  ? formatAvailableStockText(
                                      item.stock,
                                      item.unit,
                                      item.is_available ?? true,
                                    )
                                  : ""}
                                {item.min_order_quantity !== undefined
                                  ? `${item.stock !== undefined ? " · " : ""}Min order: ${formatQuantityNumber(item.min_order_quantity)}${unitDisplay ? ` ${unitDisplay}` : ""}`
                                  : ""}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-center justify-center gap-1">
                          <div className="flex items-center rounded-md border border-input bg-background">
                            <button
                              type="button"
                              aria-label={`Decrease quantity for ${item.name}`}
                              onClick={() => handleStepQuantity(item, -1)}
                              className="px-2.5 py-1.5 text-foreground hover:bg-muted"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <Input
                              aria-label={`Quantity for ${item.name}`}
                              type="number"
                              inputMode={isContinuous ? "decimal" : "numeric"}
                              step={isContinuous ? "0.01" : "1"}
                              min={isContinuous ? "0.01" : "1"}
                              value={
                                draftQuantities[item.id] ?? formatQuantityNumber(item.quantity)
                              }
                              onChange={(e) => handleDirectInputChange(item, e.target.value)}
                              className="h-8 w-20 border-0 px-1 text-center text-sm font-medium focus-visible:ring-0"
                            />
                            <button
                              type="button"
                              aria-label={`Increase quantity for ${item.name}`}
                              onClick={() => handleStepQuantity(item, 1)}
                              className="px-2.5 py-1.5 text-foreground hover:bg-muted"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {unitDisplay && (
                            <span className="text-[11px] text-muted-foreground">
                              {formatQuantityNumber(item.quantity)} {unitDisplay}
                            </span>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="font-medium text-foreground">
                            ${lineSubtotal.toFixed(2)}
                          </span>
                          <p className="text-[11px] text-muted-foreground">
                            Subtotal: ${lineSubtotal.toFixed(2)}
                          </p>
                        </div>

                        <button
                          type="button"
                          aria-label={`Remove ${item.name}`}
                          onClick={() => removeItem(item.id)}
                          className="self-end text-destructive hover:text-destructive/80 sm:self-center"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {item.priceChanged && (
                        <div
                          role="status"
                          className="flex items-center gap-2 rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-900"
                        >
                          <Info className="h-4 w-4 shrink-0 text-blue-700" />
                          <span>
                            Price updated by farmer
                            {item.originalPrice !== undefined
                              ? ` from $${Number(item.originalPrice).toFixed(2)}`
                              : ""}{" "}
                            to <strong>${Number(item.price).toFixed(2)}</strong>
                            {unitDisplay ? ` / ${unitDisplay}` : ""}.
                          </span>
                        </div>
                      )}

                      {item.unitChanged && (
                        <div
                          role="status"
                          className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900"
                        >
                          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
                          <span>
                            Selling unit updated by farmer
                            {item.previousFormattedUnit
                              ? ` from ${item.previousFormattedUnit}`
                              : ""}{" "}
                            to <strong>{unitDisplay || "a new unit"}</strong>. Please verify your
                            quantity.
                          </span>
                        </div>
                      )}

                      {itemError && (
                        <div
                          role="alert"
                          className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
                        >
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>{itemError}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <Link
                to="/marketplace"
                className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" /> Continue Shopping
              </Link>
            </div>

            {/* Summary */}
            <div className="h-fit rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 font-display text-lg text-foreground">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery</span>
                  <span>${delivery.toFixed(2)}</span>
                </div>
                <div className="border-t border-border pt-2">
                  <div className="flex justify-between text-base font-bold text-foreground">
                    <span>Total</span>
                    <span>${grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {hasAnyInvalidItem && (
                <p role="alert" className="mt-4 text-xs font-medium text-destructive">
                  Please update or remove invalid cart items before proceeding to checkout.
                </p>
              )}

              <Button
                className="mt-6 w-full"
                size="lg"
                disabled={hasAnyInvalidItem}
                onClick={() => navigate("/checkout")}
              >
                Proceed to Checkout
              </Button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
