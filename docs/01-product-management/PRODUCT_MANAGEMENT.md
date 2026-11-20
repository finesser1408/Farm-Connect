# Product Management — FarmConnect

## 1. Product Vision & Problem Statement

**Vision**: Connect local Zimbabwean farmers directly with consumers, restaurants, and grocers through a transparent, mobile-friendly digital marketplace.

**Problem Statement**: Traditional agricultural supply chains rely on intermediaries and brokers, reducing farmer revenue while increasing retail prices and obscuring produce origin. FarmConnect removes intermediaries so farmers list fresh produce directly and buyers discover local harvests with transparent pricing and public town/city origin.

*(Source: [README.md](../../README.md), verified codebase features.)*

---

## 2. Target Users & Roles

| Role | `user_type` | Description | Verified Permissions |
| :--- | :--- | :--- | :--- |
| **Customer** | `customer` | Shoppers browsing produce, managing carts, placing orders, and tracking order status | Public browsing; authenticated cart (`/api/v1/cart/`), checkout (`/checkout`), customer dashboard (`/customer`), order tracking (`/customer/orders/:orderId`), and profile updates |
| **Farmer** | `farmer` | Agricultural producers listing products, managing stock, processing order items, and updating farm details | Authenticated farmer dashboard (`/farmer`), product creation/deletion, order item accept/reject, and own profile editing (`/farmer/profile`) |
| **Admin** | `admin` (or `is_staff=True`) | Platform moderators overseeing users, farmers, products, and orders | Admin routes (`/admin/*`), user management (`/api/v1/auth/admin/users/`), order status updates, and viewing unavailable products (`?available=all`) |
| **Guest (Unauthenticated)** | — | Visitors exploring the platform | Can view Homepage (`/`), Marketplace (`/marketplace`), Product Details (`/product/:id`), About (`/about`), Login (`/login`), Register (`/register`), Password Reset (`/password-reset`), and Guest Cart (`/cart`); redirected to `/login` when accessing `/checkout` |

---

## 3. Existing Features (Verified in Codebase)

1. **Homepage & Brand Experience** ([frontend/src/pages/Index.tsx](../../frontend/src/pages/Index.tsx)):
   - Hero section with entrance animations, desktop image carousel, and mobile floating image frames.
   - Interactive **Shop by Category** section ([ShopByCategorySection.tsx](../../frontend/src/components/ShopByCategorySection.tsx)): expandable *"Types of [Category]"* panel with smooth scroll-into-view, 3-card desktop / 2-card tablet / 1-card mobile carousel, 5-second ping-pong autoplay, manual arrows, touch swipe, optional customer city/town selector for approximate straight-line Zimbabwe town distances, and a **Product Preview Modal** ([CategoryProductPreviewModal.tsx](../../frontend/src/components/CategoryProductPreviewModal.tsx)) with `"Shop [Product Name]"` CTA.
   - **Featured Products** section displaying [`ProductCard`](../../frontend/src/components/ProductCard.tsx) with product image, category, name, public farmer location, farmer name, price, and Add to Cart.
2. **Marketplace & Product Details**:
   - Search, category filtering, price/location filtering, sorting, and pagination ([Marketplace.tsx](../../frontend/src/pages/Marketplace.tsx), [backend/products/api_views.py](../../backend/products/api_views.py)).
   - Product details page ([ProductDetails.tsx](../../frontend/src/pages/ProductDetails.tsx)) showing rating, `📍 [Farmer's location]`, `👤 Farmer: [Farmer's name]`, quantity selector, Add to Cart, Buy Now, and related products.
3. **Authentication & Password Reset**:
   - Email-based JWT login, registration (Customer or Farmer with required `farm_name` and `location`), token refresh, and role-based route protection ([RoleProtectedRoute.tsx](../../frontend/src/components/RoleProtectedRoute.tsx)).
   - Password reset request and token confirmation flow with rate limiting (`5/hour` via `PasswordResetRateThrottle`).
4. **Farmer Dashboard & Mobile Experience** ([FarmerLayout.tsx](../../frontend/src/layouts/FarmerLayout.tsx)):
   - Collapsible mobile navigation drawer that auto-closes on selection, with accessible Logout and scroll-to-top.
   - Responsive summary dashboard ([FarmerDashboard.tsx](../../frontend/src/pages/farmer/FarmerDashboard.tsx)), product listing & deletion ([FarmerProducts.tsx](../../frontend/src/pages/farmer/FarmerProducts.tsx)), product creation with JPEG/PNG/WebP validation ([AddProduct.tsx](../../frontend/src/pages/farmer/AddProduct.tsx)), order item accept/reject ([FarmerOrders.tsx](../../frontend/src/pages/farmer/FarmerOrders.tsx)), analytics shell ([FarmerAnalytics.tsx](../../frontend/src/pages/farmer/FarmerAnalytics.tsx)), and synchronized profile editing ([FarmerProfile.tsx](../../frontend/src/pages/farmer/FarmerProfile.tsx)).
5. **Cart & Checkout**:
   - Guest-to-authenticated cart restoration, server-persisted cart items, checkout with `ecocash` / `onemoney` / `cod` options, and order tracking.

---

## 4. Planned / Incomplete Features (Verified Gaps)

- **Farmer Analytics live data**: [FarmerAnalytics.tsx](../../frontend/src/pages/farmer/FarmerAnalytics.tsx) currently renders empty-state placeholders (`salesData = []`, `topProducts = []`); no dedicated analytics aggregation endpoint is wired yet.
- **Product editing UI for farmers**: Farmers can create and delete products (`POST /api/v1/products/`, `DELETE /api/v1/products/<slug>/`), and the backend supports `PUT`/`PATCH`, but no dedicated Edit Product UI page is currently routed in [App.tsx](../../frontend/src/App.tsx).
- **Product reviews**: [ProductDetails.tsx](../../frontend/src/pages/ProductDetails.tsx) displays a static rating (`4.5`, `24 reviews`) and `"Reviews coming soon."` tab.
- **Automated payment gateway integration**: `Payment` model exists in [backend/payments/models.py](../../backend/payments/models.py), while `ecocash`/`onemoney`/`cod` checkout integration status is **Not yet verified** beyond order creation.
- **Production HTTPS readiness**: `SECURE_SSL_REDIRECT` is currently `False` in [settings.py](../../backend/backend/settings.py#L250) (TLS termination is handled upstream; see [PRODUCT_DEVELOPMENT.md](../02-product-development/PRODUCT_DEVELOPMENT.md)).

---

## 5. Functional & Non-Functional Requirements

### Functional Requirements
- Farmers must provide a `farm_name` and public `location` (city, town, or district) during registration and can update their name, phone, farm name, location, and description in their profile.
- Profile updates must immediately reflect on Featured Products, Marketplace, Shop by Category, Quick Preview, and Product Details without duplicating farmer strings on `Product` rows.
- Customers can browse categories interactively without leaving the homepage and optionally estimate approximate town-to-town straight-line distances.

### Non-Functional Requirements
- **Privacy**: Never expose farmer street addresses, GPS coordinates, or private credentials; show only public town/city/district names.
- **Responsiveness**: All customer and farmer workflows must work cleanly from `360px` mobile to `1280px+` desktop without horizontal page overflow.
- **Accessibility**: Modals and mobile drawers must trap focus, support `Escape` close, and respect `prefers-reduced-motion`.
- **Reliability**: Zero-downtime-safe schema changes; preserve all PostgreSQL records and Docker volumes.

---

## 6. Roadmap & Open Decisions

| Priority | Item | Status |
| :--- | :--- | :--- |
| P1 | Verify live production password reset email delivery (`RESEND_API_KEY` / sender domain) | Open — requires stakeholder verification |
| P1 | Enable production HTTPS (`SECURE_SSL_REDIRECT` / CloudPanel SSL verification) | Open — requires infrastructure confirmation |
| P2 | Connect `FarmerAnalytics` to real order-item aggregation API | Backlog |
| P2 | Add Farmer Edit Product page (`PATCH /api/v1/products/<slug>/`) | Backlog |
| P3 | Replace static product review placeholder with real customer review model | Backlog |

*(No stakeholder approvals or unverified requirements are assumed.)*

