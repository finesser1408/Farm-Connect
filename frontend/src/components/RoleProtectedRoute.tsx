import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import PageLoader from "@/components/PageLoader";
import { useAuth, type UserRole } from "@/lib/auth-context";

interface RoleProtectedRouteProps {
  role: UserRole;
  children?: ReactNode;
}

export default function RoleProtectedRoute({ role, children }: RoleProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoader />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const isAdmin = user.is_staff || user.user_type === "admin";
  const hasRequiredRole = role === "admin"
    ? isAdmin
    : user.user_type === role;

  if (!hasRequiredRole) {
    const home = isAdmin
      ? "/admin"
      : user.user_type === "farmer"
        ? "/farmer"
        : user.user_type === "customer"
          ? "/customer"
          : "/";
    return <Navigate to={home} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
