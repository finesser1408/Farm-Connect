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
| **Super Admin** | `admin` (`is_superuser=True`) | Highest-privilege platform administrator | All General Admin permissions plus assigning/revoking General Admin roles, suspending/reactivating General Admins, deleting non-Super-Admin accounts, and viewing `AdminAuditLog` |
| **General Admin** | `admin` / `is_staff=True` (`is_superuser=False`) | Platform moderators overseeing users, farmers, products, and orders | Admin routes (`/admin/*`), read registered user list, register/approve/suspend/reactivate farmers (`/admin/farmers`), order status updates, product moderation (`?available=all`) |
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
   - **Farmer Approval & Lifecycle Workflow** ([AdminFarmers.tsx](../../frontend/src/pages/admin/AdminFarmers.tsx), [backend/users/models.py](../../backend/users/models.py)): Farmers hold an explicit `FarmerProfile.status` (`pending`, `approved`, `suspended`) independent of login activation (`User.is_active`). Existing farmers remained `approved`; new farmers start `pending`; suspended/pending farmers cannot create or edit products and their listings cannot be viewed publicly, added to cart, or purchased at checkout, while historical orders are preserved.
   - **Farmer Product Moderation & Admin Catalog Management** ([AdminProductManagementPanel.tsx](../../frontend/src/components/admin/AdminProductManagementPanel.tsx), [AdminProducts.tsx](../../frontend/src/pages/admin/AdminProducts.tsx), [backend/products/models.py](../../backend/products/models.py)): Authorized admins can view a specific farmer's products from Farmer Management (`View Products`) or moderate all listings centrally on `/admin/products` with search, farmer, category, and `moderation_status` (`active`, `hidden`, `removed`) filters. Admins can add products for approved farmers, edit product details/images, hide (`active` -> `hidden`), restore (`hidden` -> `active`), and safely soft-remove (`-> removed`) listings without breaking historical orders or product reviews.
5. **Cart & Checkout**:
   - Guest-to-authenticated cart restoration, server-persisted cart items, checkout with `ecocash` / `onemoney` / `cod` options, and order tracking.
   - **Database-Backed Customer Review System**:
     - Platform testimonials on Homepage ([Index.tsx](../../frontend/src/pages/Index.tsx)) dynamically fetched from `/api/v1/reviews/testimonials/`, featuring accurate 1–5 star ratings, customer-approved display names, and empty state with feedback submission modal ([TestimonialSubmissionModal.tsx](../../frontend/src/components/TestimonialSubmissionModal.tsx)).
     - Product-specific reviews and aggregate rating metrics on Product Details ([ProductDetails.tsx](../../frontend/src/pages/ProductDetails.tsx)) fetched from `/api/v1/reviews/products/<slug>/` with modal submission ([ProductReviewSubmissionModal.tsx](../../frontend/src/components/ProductReviewSubmissionModal.tsx)).
     - Anti-abuse controls: Customer-only submission, explicit public consent requirement, duplicate prevention at DB level, update capability for pending reviews, and administrative moderation workflow.
     - Verified purchase labeling kept disabled pending independently verifiable real payment gateway integration.

---

## 4. Planned / Incomplete Features (Verified Gaps)

- **Farmer Analytics live data**: [FarmerAnalytics.tsx](../../frontend/src/pages/farmer/FarmerAnalytics.tsx) currently renders empty-state placeholders (`salesData = []`, `topProducts = []`); no dedicated analytics aggregation endpoint is wired yet.
- **Product editing UI for farmers**: Farmers can create and delete products (`POST /api/v1/products/`, `DELETE /api/v1/products/<slug>/`), and the backend supports `PUT`/`PATCH`, but no dedicated Edit Product UI page is currently routed in [App.tsx](../../frontend/src/App.tsx).
- **Automated payment gateway integration**: `Payment` model exists in [backend/payments/models.py](../../backend/payments/models.py), while `ecocash`/`onemoney`/`cod` checkout integration status is **Not yet verified** beyond order creation (payments currently use simulated transaction tokens).
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
| P3 | Database-backed review system (Platform testimonials + Product reviews + Admin moderation) | Implemented in dev environment (`53/53` backend & `42/42` frontend tests pass) |

*(No stakeholder approvals or unverified requirements are assumed.)*

