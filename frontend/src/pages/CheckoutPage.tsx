import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, MapPin, CreditCard, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCart } from "@/lib/cart-context";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { orderService } from "@/lib/services/order-service";

const steps = [
  { id: 1, label: "Delivery", icon: MapPin },
  { id: 2, label: "Payment", icon: CreditCard },
  { id: 3, label: "Confirm", icon: Package },
];

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("ecocash");
  const [delivery, setDelivery] = useState({ address: "", city: "", phone: "" });
  const deliveryCost = 5.0;

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
        address: delivery.address,
        city: delivery.city,
        postal_code: "0000",
      });
      
      clearCart();
      navigate("/order-success");
      toast({ title: "Order placed!", description: "Check your email for confirmation." });
    } catch (error: any) {
      console.error("Order failed", error);
      toast({ 
        title: "Order failed", 
        description: error.response?.data?.detail || "Something went wrong. Please try again.", 
        variant: "destructive" 
      });
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
                  <h2 className="font-display text-xl text-foreground">Delivery Information</h2>
                  <div>
                    <Label htmlFor="address">Delivery Address</Label>
                    <Input id="address" placeholder="123 Main Street" value={delivery.address} onChange={(e) => setDelivery({ ...delivery, address: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input id="city" placeholder="Harare" value={delivery.city} onChange={(e) => setDelivery({ ...delivery, city: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="dphone">Phone Number</Label>
                    <Input id="dphone" placeholder="+263 77 123 4567" value={delivery.phone} onChange={(e) => setDelivery({ ...delivery, phone: e.target.value })} />
                  </div>
                  <Button className="mt-4" onClick={() => setStep(2)} disabled={!delivery.address || !delivery.city || !delivery.phone}>
                    Continue to Payment
                  </Button>
                </div>
              )}

              {/* Step 2: Payment */}
              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="font-display text-xl text-foreground">Payment Method</h2>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                    <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${paymentMethod === "ecocash" ? "border-primary bg-primary/5" : "border-border"}`}>
                      <RadioGroupItem value="ecocash" />
                      <div>
                        <p className="font-medium text-foreground">EcoCash</p>
                        <p className="text-xs text-muted-foreground">Pay via EcoCash mobile money</p>
                      </div>
                    </label>
                    <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${paymentMethod === "onemoney" ? "border-primary bg-primary/5" : "border-border"}`}>
                      <RadioGroupItem value="onemoney" />
                      <div>
                        <p className="font-medium text-foreground">OneMoney</p>
                        <p className="text-xs text-muted-foreground">Pay via OneMoney mobile money</p>
                      </div>
                    </label>
                    <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${paymentMethod === "cod" ? "border-primary bg-primary/5" : "border-border"}`}>
                      <RadioGroupItem value="cod" />
                      <div>
                        <p className="font-medium text-foreground">Cash on Delivery</p>
                        <p className="text-xs text-muted-foreground">Pay when you receive your order</p>
                      </div>
                    </label>
                  </RadioGroup>
                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                    <Button onClick={() => setStep(3)}>Review Order</Button>
                  </div>
                </div>
              )}

              {/* Step 3: Confirm */}
              {step === 3 && (
                <div className="space-y-4">
                  <h2 className="font-display text-xl text-foreground">Order Confirmation</h2>
                  <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
                    <p><span className="font-medium text-foreground">Deliver to:</span> <span className="text-muted-foreground">{delivery.address}, {delivery.city}</span></p>
                    <p><span className="font-medium text-foreground">Phone:</span> <span className="text-muted-foreground">{delivery.phone}</span></p>
                    <p><span className="font-medium text-foreground">Payment:</span> <span className="text-muted-foreground capitalize">{paymentMethod === "cod" ? "Cash on Delivery" : paymentMethod}</span></p>
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
                    <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                    <Button onClick={handleConfirm}>Confirm Order</Button>
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
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
