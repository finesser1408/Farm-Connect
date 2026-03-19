import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { useEffect } from "react";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"customer" | "farmer">("customer");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "", farmName: "", location: "", farmDesc: "" });
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      if (user.role === "farmer") {
        navigate("/farmer");
      } else if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/customer/dashboard");
      }
    }
  }, [user, navigate]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    register({ name: form.name, email: form.email, phone: form.phone, role, farmName: form.farmName || undefined, farmLocation: form.location || undefined }, form.password);
    toast({ title: "Account created!", description: "Welcome to FarmFresh." });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-[var(--card-shadow)]">
          <div className="mb-6 text-center">
            <Leaf className="mx-auto mb-3 h-8 w-8 text-primary" />
            <h1 className="font-display text-2xl text-foreground">Create Account</h1>
            <p className="text-sm text-muted-foreground">Join FarmFresh today</p>
          </div>
          <div className="mb-6 grid grid-cols-2 gap-2">
            <button onClick={() => setRole("customer")} className={`rounded-md border px-4 py-2.5 text-sm font-medium transition-colors ${role === "customer" ? "border-primary bg-primary text-primary-foreground" : "border-input text-foreground hover:bg-muted"}`}>🛒 Customer</button>
            <button onClick={() => setRole("farmer")} className={`rounded-md border px-4 py-2.5 text-sm font-medium transition-colors ${role === "farmer" ? "border-primary bg-primary text-primary-foreground" : "border-input text-foreground hover:bg-muted"}`}>🌾 Farmer</button>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div><Label htmlFor="name">Full Name</Label><Input id="name" placeholder="John Doe" value={form.name} onChange={set("name")} required /></div>
            <div><Label htmlFor="email">Email</Label><Input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} required /></div>
            <div><Label htmlFor="phone">Phone</Label><Input id="phone" placeholder="+263 77 123 4567" value={form.phone} onChange={set("phone")} /></div>
            {role === "farmer" && (
              <>
                <div><Label htmlFor="farmName">Farm Name</Label><Input id="farmName" placeholder="Green Valley Farm" value={form.farmName} onChange={set("farmName")} /></div>
                <div><Label htmlFor="location">Location</Label><Input id="location" placeholder="Harare, Zimbabwe" value={form.location} onChange={set("location")} /></div>
                <div><Label htmlFor="farmDesc">Farm Description</Label><Input id="farmDesc" placeholder="Brief description of your farm" value={form.farmDesc} onChange={set("farmDesc")} /></div>
              </>
            )}
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={form.password} onChange={set("password")} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div><Label htmlFor="confirm">Confirm Password</Label><Input id="confirm" type="password" placeholder="••••••••" value={form.confirm} onChange={set("confirm")} required /></div>
            <Button type="submit" className="w-full">Create Account</Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
