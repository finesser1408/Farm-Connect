 import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Leaf, CheckCircle, User, Mail, Phone, Building, MapPin, ClipboardList } from "lucide-react";
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
      if (user.user_type === "farmer") {
        navigate("/farmer");
      } else if (user.user_type === "admin") {
        navigate("/admin");
      } else {
        navigate("/customer");
      }
    }
  }, [user, navigate]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    
    const nameParts = form.name.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const registrationData = {
      email: form.email,
      username: form.email, // Using email as username
      password: form.password,
      password_confirm: form.confirm,
      phone: form.phone,
      user_type: role,
      first_name: firstName,
      last_name: lastName,
    };

    const success = await register(registrationData);
    if (success) {
      toast({ title: "Account created!", description: "Welcome to Farm Connect." });
    } else {
      toast({ title: "Registration failed", description: "Check your details and try again.", variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-green-50 via-emerald-50/30 to-white">
      <Navbar />
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-green-100/50 bg-white/90 backdrop-blur-sm p-8 shadow-xl shadow-green-500/10">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-green-100 to-emerald-100 shadow-md shadow-green-500/20">
              <Leaf className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="font-display text-2xl font-bold text-gray-900">Create Account</h1>
            <p className="text-sm text-gray-500">Join Farm Connect today</p>
          </div>

          {/* Role Selection - Enhanced Colors */}
          <div className="mb-6 grid grid-cols-2 gap-3">
            <button
              onClick={() => setRole("customer")}
              className={`rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                role === "customer"
                  ? "border-green-500 bg-green-50 text-green-700 shadow-md shadow-green-500/20"
                  : "border-gray-200 text-gray-600 hover:border-green-200 hover:bg-green-50/50"
              }`}
            >
              <span className="block text-2xl">🛒</span>
              Customer
            </button>
            <button
              onClick={() => setRole("farmer")}
              className={`rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                role === "farmer"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md shadow-emerald-500/20"
                  : "border-gray-200 text-gray-600 hover:border-emerald-200 hover:bg-emerald-50/50"
              }`}
            >
              <span className="block text-2xl">🌾</span>
              Farmer
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="name"
                  placeholder="Kayla Choto"
                  value={form.name}
                  onChange={set("name")}
                  required
                  className="pl-10 border-gray-200 focus:border-green-400 focus:ring-green-400/20"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={set("email")}
                  required
                  className="pl-10 border-gray-200 focus:border-green-400 focus:ring-green-400/20"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  placeholder="+263 77 123 4567"
                  value={form.phone}
                  onChange={set("phone")}
                  className="pl-10 border-gray-200 focus:border-green-400 focus:ring-green-400/20"
                />
              </div>
            </div>

            {/* Farmer Fields */}
            {role === "farmer" && (
              <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <Building className="h-4 w-4" />
                  <span>Farm Information</span>
                </div>

                <div>
                  <Label htmlFor="farmName" className="text-sm font-medium text-gray-700">Farm Name</Label>
                  <Input
                    id="farmName"
                    placeholder="Green Valley Farm"
                    value={form.farmName}
                    onChange={set("farmName")}
                    className="border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400/20"
                  />
                </div>

                <div>
                  <Label htmlFor="location" className="text-sm font-medium text-gray-700">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="location"
                      placeholder="Harare, Zimbabwe"
                      value={form.location}
                      onChange={set("location")}
                      className="pl-10 border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400/20"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="farmDesc" className="text-sm font-medium text-gray-700">Farm Description</Label>
                  <div className="relative">
                    <ClipboardList className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="farmDesc"
                      placeholder="Brief description of your farm"
                      value={form.farmDesc}
                      onChange={set("farmDesc")}
                      className="pl-10 border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400/20"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={set("password")}
                  required
                  className="border-gray-200 focus:border-green-400 focus:ring-green-400/20 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <Label htmlFor="confirm" className="text-sm font-medium text-gray-700">
                Confirm Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="confirm"
                  type="password"
                  placeholder="••••••••"
                  value={form.confirm}
                  onChange={set("confirm")}
                  required
                  className="pl-10 border-gray-200 focus:border-green-400 focus:ring-green-400/20"
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-6 text-base rounded-xl shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all duration-300"
            >
              <span className="flex items-center justify-center gap-2">
                <Leaf className="h-4 w-4" />
                Create Account
              </span>
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-green-600 hover:text-green-700 hover:underline transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
