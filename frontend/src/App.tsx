import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/lib/cart-context";
import { AuthProvider } from "@/lib/auth-context";
import { ProductProvider } from "@/lib/product-context";
import PageLoader from "@/components/PageLoader";

// Lazy loaded pages
const Index = lazy(() => import("./pages/Index"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const CartPage = lazy(() => import("./pages/CartPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const OrderSuccessPage = lazy(() => import("./pages/OrderSuccessPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const CustomerDashboard = lazy(() => import("./pages/customer/CustomerDashboard"));
const CustomerOrders = lazy(() => import("./pages/customer/CustomerOrders"));
const OrderTracking = lazy(() => import("./pages/customer/OrderTracking"));
const FarmerLayout = lazy(() => import("./layouts/FarmerLayout"));
const FarmerDashboard = lazy(() => import("./pages/farmer/FarmerDashboard"));
const FarmerProducts = lazy(() => import("./pages/farmer/FarmerProducts"));
const AddProduct = lazy(() => import("./pages/farmer/AddProduct"));
const FarmerOrders = lazy(() => import("./pages/farmer/FarmerOrders"));
const FarmerAnalytics = lazy(() => import("./pages/farmer/FarmerAnalytics"));
const FarmerProfile = lazy(() => import("./pages/farmer/FarmerProfile"));
const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminFarmers = lazy(() => import("./pages/admin/AdminFarmers"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <ProductProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/order-success" element={<OrderSuccessPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/customer" element={<CustomerDashboard />} />
                <Route path="/customer/orders" element={<CustomerOrders />} />
                <Route path="/customer/orders/:orderId" element={<OrderTracking />} />
                <Route path="/farmer" element={<FarmerLayout />}>
                  <Route index element={<FarmerDashboard />} />
                  <Route path="products" element={<FarmerProducts />} />
                  <Route path="products/new" element={<AddProduct />} />
                  <Route path="orders" element={<FarmerOrders />} />
                  <Route path="analytics" element={<FarmerAnalytics />} />
                  <Route path="profile" element={<FarmerProfile />} />
                </Route>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="farmers" element={<AdminFarmers />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="reports" element={<AdminReports />} />
                  <Route path="settings" element={<AdminSettings />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          </ProductProvider>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
