import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Check, Circle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const stages = [
  { label: "Order Placed", time: "Mar 10, 10:00 AM" },
  { label: "Farmer Accepted", time: "Mar 10, 11:30 AM" },
  { label: "Processing", time: "Mar 10, 2:00 PM" },
  { label: "Shipped", time: "Mar 11, 8:00 AM" },
  { label: "Delivered", time: "" },
];

export default function OrderTracking() {
  const { orderId } = useParams();
  const currentStage = 3; // mock: "Shipped"

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="container flex-1 py-8">
        <Link to="/customer/orders" className="mb-6 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </Link>
        <h1 className="mb-2 font-display text-3xl text-foreground">Order {orderId}</h1>
        <p className="mb-8 text-muted-foreground">Track your order status in real time</p>

        <div className="mx-auto max-w-lg rounded-lg border border-border bg-card p-6">
          <div className="space-y-0">
            {stages.map((s, i) => (
              <div key={s.label} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${i <= currentStage ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {i < currentStage ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
                  </div>
                  {i < stages.length - 1 && <div className={`h-10 w-0.5 ${i < currentStage ? "bg-primary" : "bg-border"}`} />}
                </div>
                <div className="pb-8">
                  <p className={`font-medium ${i <= currentStage ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.time || "Pending"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
