import { Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function OrderSuccessPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="container flex flex-1 flex-col items-center justify-center py-20 text-center">
        <CheckCircle className="mb-6 h-20 w-20 text-primary" />
        <h1 className="mb-2 font-display text-3xl text-foreground">Order Placed!</h1>
        <p className="mb-8 max-w-md text-muted-foreground">
          Your order has been placed successfully. You'll receive a confirmation shortly.
        </p>
        <div className="flex gap-3">
          <Link to="/customer/orders"><Button>View Orders</Button></Link>
          <Link to="/marketplace"><Button variant="outline">Continue Shopping</Button></Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
