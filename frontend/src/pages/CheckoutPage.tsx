import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { ArrowLeft, Check, ClipboardList, MapPin, Package, Phone, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/lib/cart-context";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { orderService } from "@/lib/services/order-service";

// Checkout is a two-step flow: tell us where to deliver, review, place the
// order. No payment details are collected anywhere in this process.
const steps = [
  { id: 1, label: "Delivery", icon: MapPin },
  { id: 2, label: "Confirm", icon: Package },
];

interface DeliveryFields {
  address: string;
  city: string;
  postal_code: string;
  phone: string;
}

type DeliveryErrors = Partial<Record<keyof DeliveryFields, string>>;

const validateDelivery = (fields: DeliveryFields): DeliveryErrors => {
  const errors: DeliveryErrors = {};

  if (!fields.address.trim()) {
    errors.address = "Delivery address is required.";
  } else if (fields.address.trim().length < 5) {
    errors.address = "Enter a full street address.";
  }

  if (!fields.city.trim()) {
    errors.city = "City is required.";
  } else if (!/^[A-Za-z .'-]{2,}$/.test(fields.city.trim())) {
    errors.city = "Enter a valid city name.";
  }

  if (!fields.postal_code.trim()) {
    errors.postal_code = "Postal code is required.";
  } else if (!/^[A-Za-z0-9 -]{3,10}$/.test(fields.postal_code.trim())) {
    errors.postal_code = "Enter a valid postal code.";
  }

  const phoneDigits = fields.phone.replace(/\D/g, "");
  if (!fields.phone.trim()) {
    errors.phone = "Phone number is required for delivery.";
  } else if (
    phoneDigits.length < 7 ||
    phoneDigits.length > 15 ||
    !/^[0-9+() -]+$/.test(fields.phone.trim())
  ) {
    errors.phone = "Enter a valid phone number (7–15 digits).";
  }

  return errors;
};

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<DeliveryErrors>({});
  const [delivery, setDelivery] = useState<DeliveryFields>({
    address: "",
    city: "",
    postal_code: "",
    phone: "",
  });
  const deliveryCost = 5.0;

  const update = (field: keyof DeliveryFields) => (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setDelivery((prev) => ({ ...prev, [field]: event.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleReview = () => {
    const validationErrors = validateDelivery(delivery);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    setStep(2);
  };

  const handleConfirm = async () => {
    if (!user) {
      toast({ title: "Session expired", description: "Please log in again.", variant: "destructive" });
      navigate("/login");
      return;
    }

    setIsSubmitting(true);
    try {
      await orderService.createOrder({
        first_name: user.first_name || "Customer",
        last_name: user.last_name || "User",
        email: user.email,
        address: delivery.address.trim(),
        city: delivery.city.trim(),
        postal_code: delivery.postal_code.trim(),
        phone: delivery.phone.trim(),
        // The cart lives in the browser, so send it along; the server re-checks
        // availability and sets prices itself.
        items: items.map((item) => ({
          product_id: Number(item.id),
          quantity: item.quantity,
        })),
      });

      clearCart();
      navigate("/order-success");
      toast({ title: "Order placed!", description: "Check your email for confirmation." });
    } catch (requestError: unknown) {
      const data = isAxiosError<Record<string, string | string[]>>(requestError)
        ? requestError.response?.data
        : undefined;
      const detail = data
        ? Object.values(data).flat().join(" ")
        : "Something went wrong. Please try again.";
      toast({ title: "Order failed", description: detail, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="container flex flex-1 flex-col items-center justify-center py-20">
          <Package className="mb-4 h-16 w-16 text-muted-foreground/40" />
          <h2 className="mb-2 font-display text-xl text-foreground">No items to checkout</h2>
          <Link to="/marketplace"><Button>Browse Marketplace</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const fieldError = (field: keyof DeliveryFields) =>
    errors[field] ? (
      <p role="alert" className="mt-1 text-xs text-destructive">
        {errors[field]}
      </p>
    ) : null;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="container flex-1 py-8">
        <Link to="/cart" className="mb-6 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Cart
        </Link>

        {/* Step indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-colors ${step >= s.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {step > s.id ? <Check className="h-5 w-5" /> : s.id}
              </div>
              <span className={`hidden text-sm font-medium sm:block ${step >= s.id ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
              {i < steps.length - 1 && <div className={`mx-2 h-px w-8 sm:w-16 ${step > s.id ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-border bg-card p-6">
              {/* Step 1: Delivery */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <h2 className="font-display text-xl text-foreground">Delivery Information</h2>
                  </div>

                  <div>
                    <Label htmlFor="address">Delivery Address</Label>
                    <Input
                      id="address"
                      placeholder="123 Main Street"
                      value={delivery.address}
                      onChange={update("address")}
                      aria-invalid={Boolean(errors.address)}
                    />
                    {fieldError("address")}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        placeholder="Harare"
                        value={delivery.city}
                        onChange={update("city")}
                        aria-invalid={Boolean(errors.city)}
                      />
                      {fieldError("city")}
                    </div>
                    <div>
                      <Label htmlFor="postal-code">Postal Code</Label>
                      <Input
                        id="postal-code"
                        placeholder="00100"
                        value={delivery.postal_code}
                        onChange={update("postal_code")}
                        aria-invalid={Boolean(errors.postal_code)}
                      />
                      {fieldError("postal_code")}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="dphone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="dphone"
                        placeholder="+263 77 123 4567"
                        value={delivery.phone}
                        onChange={update("phone")}
                        className="pl-9"
                        aria-invalid={Boolean(errors.phone)}
                      />
                    </div>
                    {fieldError("phone")}
                  </div>

                  <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                    No payment details needed — you place the order now and settle it when
                    your produce arrives.
                  </div>

                  <Button className="mt-4" onClick={handleReview}>
                    Review Order
                  </Button>
                </div>
              )}

              {/* Step 2: Confirm */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    <h2 className="font-display text-xl text-foreground">Review & Place Order</h2>
                  </div>

                  <div className="space-y-2 rounded-lg bg-muted/50 p-4 text-sm">
                    <p className="flex items-start gap-2">
                      <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>
                        <span className="font-medium text-foreground">Deliver to:</span>{" "}
                        <span className="text-muted-foreground">
                          {delivery.address}, {delivery.city} {delivery.postal_code}
                        </span>
                      </span>
                    </p>
                    <p className="flex items-start gap-2">
                      <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>
                        <span className="font-medium text-foreground">Phone:</span>{" "}
                        <span className="text-muted-foreground">{delivery.phone}</span>
                      </span>
                    </p>
                  </div>

                  <div className="divide-y divide-border">
                    {items.map((item) => (
                      <div key={item.id} className="flex justify-between py-2 text-sm">
                        <span className="text-foreground">{item.name} × {item.quantity}</span>
                        <span className="font-medium text-foreground">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                    <Button onClick={handleConfirm} disabled={isSubmitting}>
                      {isSubmitting ? "Placing order..." : "Place Order"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="h-fit rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 font-display text-lg text-foreground">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal ({items.length} items)</span><span>${totalPrice.toFixed(2)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Delivery</span><span>${deliveryCost.toFixed(2)}</span></div>
              <div className="border-t border-border pt-2">
                <div className="flex justify-between text-base font-bold text-foreground"><span>Total</span><span>${(totalPrice + deliveryCost).toFixed(2)}</span></div>
              </div>
            </div>
            <p className="mt-4 rounded-md bg-primary/10 px-3 py-2 text-xs text-primary">
              No payment is taken online — place your order and pay on delivery.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}