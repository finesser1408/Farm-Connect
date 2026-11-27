import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  MapPin,
  CreditCard,
  Package,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCart, type CartItem } from "@/lib/cart-context";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getAuthErrorMessage, useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  calculateLineSubtotalCents,
  formatProductUnitDisplay,
  formatQuantityNumber,
  roundCurrencyCents,
  validateCustomerOrderQuantity,
} from "@/lib/product-units";
import { orderService } from "@/lib/services/order-service";

const steps = [
  { id: 1, label: "Delivery", icon: MapPin },
  { id: 2, label: "Payment", icon: CreditCard },
  { id: 3, label: "Confirm", icon: Package },
];

function getCartItemUnitLabel(item: CartItem): string {
  if (item.unit) {
    return formatProductUnitDisplay(item.unit, item.unit_description);
  }
  return (item.formatted_unit || "").trim();
}

function getCartItemError(item: CartItem): string | null {
  if (item.validationError) return item.validationError;
  const hasMetadata =
    item.unit !== undefined ||
    item.stock !== undefined ||
    item.min_order_quantity !== undefined ||
    item.is_available !== undefined;
  if (!hasMetadata) return null;

  return validateCustomerOrderQuantity({
    rawQuantity: item.quantity,
    unit: item.unit,
    unitDescription: item.unit_description,
    minOrderQuantity: item.min_order_quantity ?? 1,
    stock: item.stock,
    isAvailable: item.is_available ?? true,
  });
}

export default function CheckoutPage() {
  const { items, totalPrice, clearCart, syncCart, acknowledgeItemChanges } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutAlert, setCheckoutAlert] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"ecocash" | "onemoney" | "cod">("ecocash");
  const [delivery, setDelivery] = useState({ address: "", city: "", phone: "" });
  const deliveryCost = 5.0;
  const orderTotal = roundCurrencyCents(totalPrice + deliveryCost);

  const invalidItems = items
    .map((item) => ({ item, error: getCartItemError(item) }))
    .filter((entry) => Boolean(entry.error));
  const changedItems = items.filter((item) => item.priceChanged || item.unitChanged);

  const handleConfirm = async () => {
    setCheckoutAlert(null);
    if (!user) {
      toast({
        title: "Session expired",
        description: "Please log in again.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (invalidItems.length > 0) {
      const firstError = `${invalidItems[0].item.name}: ${invalidItems[0].error}`;
      setCheckoutAlert(
        `One or more items in your cart require attention before checkout (${firstError}). Please review your cart.`,
      );
      return;
    }

    if (changedItems.length > 0) {
      setCheckoutAlert(
        "Product pricing or selling unit details in your cart were updated by the farmer. Please review and confirm the updated amounts below before placing your order.",
      );
      changedItems.forEach((item) => acknowledgeItemChanges?.(item.id));
      return;
    }

    const beforeTotal = totalPrice;
    const beforeUnits = items.map((i) => `${i.id}:${getCartItemUnitLabel(i)}:${i.price}`).join("|");

    setIsSubmitting(true);
    try {
      await syncCart();

      // Re-verify that no item failed validation or changed price/unit during pre-checkout sync
      await orderService.createOrder({
        first_name: user.first_name || "Customer",
        last_name: user.last_name || "User",
        email: user.email,
        phone: delivery.phone,
        address: delivery.address,
        city: delivery.city,
        postal_code: "0000",
        payment_method: paymentMethod,
      });

      clearCart();
      navigate("/order-success");
      toast({
        title: "Order placed!",
        description:
          paymentMethod === "cod"
            ? "Your order is confirmed. Pay on delivery."
            : "Payment simulated successfully; no real charge was made.",
      });
    } catch (error: unknown) {
      console.error("Order failed", error);
      const message = getAuthErrorMessage(error);
      setCheckoutAlert(message);
      toast({
        title: "Order failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      void beforeTotal;
      void beforeUnits;
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="container flex flex-1 flex-col items-center justify-center py-20">
          <Package className="mb-4 h-16 w-16 text-muted-foreground/40" />
          <h2 className="mb-2 font-display text-xl text-foreground">No items to checkout</h2>
          <Link to="/marketplace">
            <Button>Browse Marketplace</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="container flex-1 py-8">
        <Link
          to="/cart"
          className="mb-6 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Cart
        </Link>

        {/* Step indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  step >= s.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s.id ? <Check className="h-5 w-5" /> : s.id}
              </div>
              <span
                className={`hidden text-sm font-medium sm:block ${
                  step >= s.id ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={`mx-2 h-px w-8 sm:w-16 ${step > s.id ? "bg-primary" : "bg-border"}`}
                />
              )}
            </div>
          ))}
        </div>

        {(checkoutAlert || invalidItems.length > 0 || changedItems.length > 0) && (
          <div
            role="alert"
            className="mb-6 flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-950"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div className="space-y-1">
                {checkoutAlert && <p className="font-medium">{checkoutAlert}</p>}
                {invalidItems.map(({ item, error }) => (
                  <p key={item.id} className="text-xs text-destructive">
                    <strong>{item.name}:</strong> {error}
                  </p>
                ))}
                {changedItems.map((item) => {
                  const unitLabel = getCartItemUnitLabel(item);
                  return (
                    <p key={item.id} className="text-xs">
                      <strong>{item.name}:</strong> Updated to ${Number(item.price).toFixed(2)}
                      {unitLabel ? ` / ${unitLabel}` : ""}.
                    </p>
                  );
                })}
              </div>
            </div>
            {invalidItems.length > 0 && (
              <div>
                <Link to="/cart">
                  <Button size="sm" variant="outline">
                    Return to Cart to Update Quantities
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-border bg-card p-6">
              {/* Step 1: Delivery */}
              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="font-display text-xl text-foreground">Delivery Information</h2>
                  <div>
                    <Label htmlFor="address">Delivery Address</Label>
                    <Input
                      id="address"
                      placeholder="123 Main Street"
                      value={delivery.address}
                      onChange={(e) => setDelivery({ ...delivery, address: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="Harare"
                      value={delivery.city}
                      onChange={(e) => setDelivery({ ...delivery, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dphone">Phone Number</Label>
                    <Input
                      id="dphone"
                      placeholder="+263 77 123 4567"
                      value={delivery.phone}
                      onChange={(e) => setDelivery({ ...delivery, phone: e.target.value })}
                    />
                  </div>
                  <Button
                    className="mt-4"
                    onClick={() => setStep(2)}
                    disabled={!delivery.address || !delivery.city || !delivery.phone}
                  >
                    Continue to Payment
                  </Button>
                </div>
              )}

              {/* Step 2: Payment */}
              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="font-display text-xl text-foreground">Payment Method</h2>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={(val) =>
                      setPaymentMethod(val as "ecocash" | "onemoney" | "cod")
                    }
                    className="space-y-3"
                  >
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                        paymentMethod === "ecocash"
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <RadioGroupItem value="ecocash" />
                      <div>
                        <p className="font-medium text-foreground">EcoCash</p>
                        <p className="text-xs text-muted-foreground">
                          Simulated checkout; no real charge
                        </p>
                      </div>
                    </label>
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                        paymentMethod === "onemoney"
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <RadioGroupItem value="onemoney" />
                      <div>
                        <p className="font-medium text-foreground">OneMoney</p>
                        <p className="text-xs text-muted-foreground">
                          Simulated checkout; no real charge
                        </p>
                      </div>
                    </label>
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                        paymentMethod === "cod"
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <RadioGroupItem value="cod" />
                      <div>
                        <p className="font-medium text-foreground">Cash on Delivery</p>
                        <p className="text-xs text-muted-foreground">
                          Pay when you receive your order
                        </p>
                      </div>
                    </label>
                  </RadioGroup>
                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button onClick={() => setStep(3)}>Review Order</Button>
                  </div>
                </div>
              )}

              {/* Step 3: Confirm */}
              {step === 3 && (
                <div className="space-y-4">
                  <h2 className="font-display text-xl text-foreground">Order Confirmation</h2>
                  <div className="space-y-2 rounded-lg bg-muted/50 p-4 text-sm">
                    <p>
                      <span className="font-medium text-foreground">Deliver to:</span>{" "}
                      <span className="text-muted-foreground">
                        {delivery.address}, {delivery.city}
                      </span>
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Phone:</span>{" "}
                      <span className="text-muted-foreground">{delivery.phone}</span>
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Payment:</span>{" "}
                      <span className="capitalize text-muted-foreground">
                        {paymentMethod === "cod"
                          ? "Cash on Delivery"
                          : `${paymentMethod} (simulated)`}
                      </span>
                    </p>
                  </div>
                  <div className="divide-y divide-border">
                    {items.map((item) => {
                      const unitLabel = getCartItemUnitLabel(item);
                      const qtyText = `${formatQuantityNumber(item.quantity)}${unitLabel ? ` ${unitLabel}` : ""}`;
                      const lineTotal = calculateLineSubtotalCents(item.price, item.quantity);
                      return (
                        <div key={item.id} className="flex justify-between gap-3 py-2.5 text-sm">
                          <div>
                            <span className="font-medium text-foreground">{item.name}</span>
                            <span className="text-muted-foreground">
                              : {qtyText} × ${Number(item.price).toFixed(2)}
                              {unitLabel ? ` / ${unitLabel}` : ""}
                            </span>
                          </div>
                          <span className="shrink-0 font-medium text-foreground">
                            ${lineTotal.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      Back
                    </Button>
                    <Button
                      onClick={handleConfirm}
                      disabled={isSubmitting || invalidItems.length > 0}
                    >
                      {isSubmitting ? "Placing order..." : "Confirm Order"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="h-fit rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 font-display text-lg text-foreground">Order Summary</h3>
            <div className="mb-3 divide-y divide-border/60 text-xs">
              {items.map((item) => {
                const unitLabel = getCartItemUnitLabel(item);
                const qtyText = `${formatQuantityNumber(item.quantity)}${unitLabel ? ` ${unitLabel}` : ""}`;
                const lineTotal = calculateLineSubtotalCents(item.price, item.quantity);
                return (
                  <div key={item.id} className="flex justify-between gap-2 py-1.5">
                    <span className="text-muted-foreground">
                      {item.name}: {qtyText} × ${Number(item.price).toFixed(2)}
                    </span>
                    <span className="shrink-0 font-medium text-foreground">
                      ${lineTotal.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="space-y-2 border-t border-border pt-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>
                  Subtotal ({items.length} {items.length === 1 ? "product" : "products"})
                </span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery</span>
                <span>${deliveryCost.toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-2">
                <div className="flex justify-between text-base font-bold text-foreground">
                  <span>Total</span>
                  <span>${orderTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
