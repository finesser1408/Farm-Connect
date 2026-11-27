# Agent Handover — FarmConnect

**Last Updated**: 2026-11-27 (Section 4.23 Phase 2A & 2B — Targeted Product Unit & Dashboard Corrections)

## 1. Current Verified Project State

- **Active Branch**: `kudzai` (HEAD `dbee71eaeae04b413f49edee91acd4f5389b81a2`, deployed baseline for Product Listing V1; Section 4.23 Phase 2A & 2B fixes are uncommitted in the working tree awaiting release authorization).
- **Production (`farmconnect.hpc.ac.zw`)**: Deployed at commit `dbee71e` (`Product Listing V1`); untouched during Section 4.23 Phase 2A & 2B.
- **Development (`farmconnect-dev`)**: Isolated `dev-backend` rebuilt and verified (`116/116` backend tests in `332.621s`, `0` system check or dry-run migration issues). Frontend verified on Node 22 (`82/82` Vitest tests across `17` test files, `npx tsc --noEmit`, `vite build` in `9.01s`).
- **Database Migrations**: Clean (`makemigrations --check --dry-run` reports `No changes detected`; no new migrations added in Section 4.23 Phase 2A & 2B).

## 2. Work Completed in Recent Sessions

1. **Farmer Location Integration** (`d90d51c`, `e0d2697`): Reused `FarmerProfile.location` across registration, profile, `ProductSerializer`, `ProductDetails`, and `ProductCard`.
2. **Interactive Shop by Category** (`2ffe812`): Added expandable *"Types of [Category]"* panel, 3-card desktop Embla carousel with 5-second ping-pong autoplay, optional Zimbabwe town-centroid distance estimation, and `CategoryProductPreviewModal` (`Shop [Product Name]` CTA).
3. **Farmer Dashboard Mobile Responsiveness & Profile Sync** (`f23d855`): Auto-closing mobile drawer, stacked mobile cards across Farmer pages, `first_name`/`last_name` support in `UserUpdateSerializer`, and React Query `["products"]` + `["product"]` cache invalidation on profile save.
4. **Permanent Documentation System** (`2026-11-20`): Created `AGENTS.md` and `docs/01-*` through `docs/07-*`.
5. **Customer Review & Testimonials System** (`2026-11-23`):
   - Created dedicated `reviews` Django app with `PlatformTestimonial` and `ProductReview` models, DB constraints, anti-abuse validations, and moderation actions in Django Admin.
   - Connected Homepage ([Index.tsx](../../frontend/src/pages/Index.tsx)) to `/api/v1/reviews/testimonials/`, replacing hard-coded testimonials with genuine approved records, accurate 1–5 star ratings, and an empty state.
   - Connected Product Details ([ProductDetails.tsx](../../frontend/src/pages/ProductDetails.tsx)) to `/api/v1/reviews/products/<slug>/`, displaying real aggregate ratings and reviews list, removing hardcoded `4.5 (24 reviews)` and `Reviews coming soon.` placeholders.
   - Added accessible mobile-responsive submission modals ([TestimonialSubmissionModal.tsx](../../frontend/src/components/TestimonialSubmissionModal.tsx), [ProductReviewSubmissionModal.tsx](../../frontend/src/components/ProductReviewSubmissionModal.tsx)).
   - Kept verified-purchase badges disabled until reliable real payment gateway integration exists.
   - Verified with 53/53 backend tests and 42/42 frontend Vitest tests + production `vite build`.
6. **Admin Enhancement — Section 1 & Section 2: RBAC, Audit Trail, & User Management** (`2026-11-23`, dev only):
   - Implemented Super Admin (`is_superuser=True`) vs General Admin (`is_superuser=False`) role helpers and `IsSuperAdmin` / `IsAdmin` permission classes in `backend/users/models.py` and `permissions.py`.
   - Created immutable `AdminAuditLog` model (`users/migrations/0005_adminauditlog.py` applied strictly to `farmconnect-dev-db`).
   - Hardened `update_profile` and `admin_user_detail` against privilege escalation, self-demotion/self-suspension, Super Admin modification/deletion, and removal of the last active Super Admin.
   - Added `/api/v1/auth/admin/users/<pk>/role/`, `/api/v1/auth/admin/users/<pk>/status/`, and `/api/v1/auth/admin/audit-logs/`, plus full-name search (`Concat`) and pagination on `/api/v1/auth/admin/users/`.
   - Connected `frontend/src/pages/admin/AdminUsers.tsx` via `frontend/src/lib/services/admin-service.ts` with search, role/status filters, pagination, confirmation dialogs, mobile stacked cards, and Super-Admin-only role/status controls; aligned `AdminLayout.tsx` with `FarmerLayout.tsx` mobile drawer/overflow patterns.
   - Verified with `63/63` backend tests, `49/49` Vitest tests, `tsc --noEmit`, and `vite build`.
7. **Admin Enhancement — Section 3: Farmer Account Management** (`2026-11-23`, dev only):
   - Added `FarmerProfile.status` (`pending`/`approved`/`suspended`), `status_reason`, `status_updated_at`, `status_updated_by` in `users/migrations/0006_*` (preserving existing farmers as `approved` via `RunPython`, applied to `farmconnect-dev-db` only).
   - Added `/api/v1/auth/admin/farmers/` (`GET`, `POST`), `<pk>/`, `<pk>/approve/`, `<pk>/suspend/`, and `<pk>/reactivate/` endpoints with `IsAdmin` permissions and `AdminAuditLog` records.
   - Enforced farmer approval across `products_list_create`, `product_detail`, `add_to_cart`, `cart_item_detail`, and `CreateOrderSerializer.create` while preserving `User.is_active`, existing products, and historical orders.
   - Built live `AdminFarmers.tsx` with Add Farmer dialog, Approve/Suspend/Reactivate confirmation dialogs, search, status filter, pagination, and mobile stacked cards.
   - Verified with `67/67` backend tests, `54/54` Vitest tests, `tsc --noEmit`, and `vite build`.
8. **Admin Enhancement — Section 4: Farmer Product Management** (`2026-11-23`, dev only):
   - Added `Product.moderation_status` (`active`, `hidden`, `removed`), `moderated_by`, `moderated_at`, `moderation_reason` in `products/migrations/0005_*` (migrating existing products with `default='active'`, applied to `farmconnect-dev-db` only).
   - Added admin product filters (`farmer_id`, `moderation_status`, expanded admin search), admin product creation linked to approved farmers (`POST /api/v1/products/` with `farmer_id`), admin edit/image replacement auditing, dedicated `PATCH/POST /api/v1/products/<slug>/{hide,restore,remove}/` endpoints, and safe soft-removal on `DELETE /api/v1/products/<slug>/` preserving `OrderItem` & `ProductReview` rows.
   - Enforced `moderation_status == 'active'` across public catalog, search, direct detail (`404` when hidden/removed), cart add/update, checkout, and farmer write guards (`removed` items immutable, farmers cannot self-restore).
   - Built shared [`AdminProductFormDialog.tsx`](../../frontend/src/components/admin/AdminProductFormDialog.tsx) and [`AdminProductManagementPanel.tsx`](../../frontend/src/components/admin/AdminProductManagementPanel.tsx) wired into both `AdminFarmers.tsx` (`View Products` locked-farmer workflow) and `AdminProducts.tsx` (central catalog management).
   - Verified with `75/75` backend tests (`214.734s`), `59/59` Vitest tests (`13/13` files), `npx tsc --noEmit`, and `vite build` (`9.38s`).
9. **Admin Enhancement — Section 4.6: Security & Data-Integrity Remediation** (`2026-11-23`, dev only):
   - Added [`ActiveUserTokenRefreshSerializer`](../../backend/users/serializers.py) / [`ActiveUserTokenRefreshView`](../../backend/users/api_views.py) (`USER_ID_CLAIM` check rejecting inactive accounts with `401`) and [`revoke_user_refresh_tokens`](../../backend/users/tokens.py) blacklisting `OutstandingToken` records upon suspension/deactivation.
   - Protected historical transaction records via zero-DDL `on_delete=PROTECT` migrations (`orders.0005`, `products.0006`, `reviews.0002` applied to `farmconnect-dev-db` only), shared [`NoHardDeleteAdminMixin`](../../backend/backend/admin_mixins.py) blocking single & bulk deletes across core Django Admin classes, and blocking hard `DELETE` in `admin_user_detail` (`400`).
   - Fixed `FarmerProfileInline` stale `'bio'` field -> `'description'` + `'status'`, added safe Django Admin deactivation/moderation bulk actions logged to `AdminAuditLog`, and added `client_max_body_size 6M;` in `nginx-dev.conf`.
   - Verified with `77/77` backend tests (`226.573s`), `59/59` Vitest tests (`30.04s`), `npx tsc --noEmit`, `vite build` (`11.06s`), and `25/25` live HTTP integration checks against `http://127.0.0.1:18080/api/v1/`.
10. **Production Organizational SMTP Support** (`2026-11-23`, dev verified with mocks; prod `.env` manual):
    - Updated `backend/backend/settings.py` and `backend/backend/email_service.py` to support `PASSWORD_RESET_EMAIL_PROVIDER=smtp` when `DEBUG=False`, reading host, port, credentials, sender, timeout, and mutually-exclusive `EMAIL_USE_TLS` (STARTTLS e.g. `587`) / `EMAIL_USE_SSL` (implicit TLS via `SMTP_SSL` e.g. `465`) strictly from environment variables while keeping `'django'` restricted to `DEBUG=True`.
    - Required `backend/.env` keys documented in `docs/02-product-development/PRODUCT_DEVELOPMENT.md`. Live SMTP probe skipped per user request; mocked STARTTLS/SSL unit and endpoint tests verified cleanly.
11. **Section 4.16 — Admin Reviews & Testimonials Moderation** (`2026-11-24`, dev only):
    - Extended existing `IsAdmin`-protected `/api/v1/reviews/admin/products/[<pk>/]` and `/api/v1/reviews/admin/testimonials/[<pk>/]` endpoints with `AdminProductReviewSerializer` / `AdminPlatformTestimonialSerializer` (adding admin-only customer name/email, product name/slug, and `moderated_by_email` while keeping public serializers free of customer emails), backward-compatible `AdminPagination` (plain array when `page`/`page_size` omitted; paginated envelope when supplied), strict status validation (`pending`/`approved`/`rejected` filter; `approved`/`rejected` PATCH transitions rejecting no-op reapplications), single-record `GET <pk>`, and atomic `AdminAuditLog` recording.
    - Added `Reviews & Testimonials` navigation link in `AdminLayout.tsx`, `/admin/reviews` route in `App.tsx`, admin review service methods in `admin-service.ts`, and `AdminReviews.tsx` with Product Reviews & Platform Testimonials tabs, Pending/Approved/Rejected filters, search, pagination, responsive mobile cards & desktop tables, confirmation dialogs with optional audit reason, and toast notifications.
    - Verified with `98/98` backend tests (`12` new tests in `AdminReviewModerationTests`), `makemigrations --check --dry-run` (`No changes detected`), `14/14` Vitest files / `65/65` tests (`6` new tests in `admin-reviews.test.tsx`), `npx tsc --noEmit`, and `vite build` (`9.39s`). Deployed to `farmconnect.hpc.ac.zw` at commit `c824133` (`Section 4.18`).
12. **Section 4.19 — Admin Dashboard Improvements & Responsive Orders** (`2026-11-24`, deployed in `9c9b67c`):
    - Added `IsAdmin`-protected `GET /api/v1/auth/admin/stats/` returning real database counts (`total_users`, `total_farmers`, `total_products` excluding removed, `total_orders` excluding cancelled), `verified_payments_enabled=False`, `verified_sales_total=None` (preventing simulated checkouts from being reported as actual revenue), and 6-month `monthly_activity` order counts with zero PII exposure.
    - Updated `AdminDashboard.tsx` to fetch live statistics via `adminService.getDashboardStats()`, render `"Total Sales (Verified)"` as `"Not available"` with caption `"Payment verification not yet enabled"`, display loading/error-retry/zero-record states, and remove the decorative `Block`, `Unblock`, `Verify`, and `Reject` demo buttons and their local state.
    - Rebuilt `AdminOrders.tsx` (read-only) with search and status filtering, loading/error-retry/empty states, `md:hidden` mobile cards (`< 768px`), and a `hidden overflow-x-auto md:block` desktop table grouping all product line items under their parent order so `order.total_amount` is never repeated per item and simulated payment methods are clearly labeled.
    - Verified with `101/101` backend tests (`3` new in `AdminDashboardStatsTests`), `15/15` Vitest files / `71/71` tests (`6` new in `admin-dashboard-orders.test.tsx`), `npx tsc --noEmit`, and `vite build` (`9.84s`). Deployed to `farmconnect.hpc.ac.zw` at commit `9c9b67c` (`Section 4.21`).
13. **Section 4.22 Phase 2A — Product Listing V1 Backend Models, Migrations & Testing** (`2026-11-25`, dev only):
    - Added controlled selling units on `Product` (`backend/products/models.py` + `backend/products/validators.py`): continuous units (`kg`, `l`), countable units (`g`, `piece`, `head`, `bunch`, `bundle`, `tray`, `crate`, `bag`, `bucket`, `bird`), packaged units requiring a non-empty `unit_description` (`tray`, `crate`, `bag`, `bucket`, `max_length=40`), nullable `unit` for legacy products (required on new product creation without guessing `kg` for legacy records), and `min_order_quantity` (`DecimalField(max_digits=10, decimal_places=2, default=Decimal('1.00'))`).
    - Converted `Product.stock`, `CartItem.quantity`, and `OrderItem.quantity` to `DecimalField(max_digits=10, decimal_places=2)` via non-destructive migrations `products/migrations/0007_product_unit_fields_and_decimal_stock.py` and `orders/migrations/0006_decimal_quantities_and_orderitem_snapshots.py`.
    - Added `OrderItem.product_name` (`max_length=255`) and `OrderItem.unit_label` (`max_length=64`) snapshot fields populated at checkout and backfilled (`product_name = product.name`, `unit_label = ''`) for existing `OrderItem` rows without modifying historical prices or order totals.
    - Enforced strict decimal parsing (`max 2 decimal places`, no silent truncation, whole-number enforcement for countable/legacy units, fractional support for `kg` and `l`, `quantity >= min_order_quantity`, `quantity <= stock`) and `ROUND_HALF_UP` cent rounding (`Decimal('0.01')`) across `ProductSerializer`, `CartItemSerializer`, `CartSerializer`, `OrderItemSerializer`, `CreateOrderSerializer`, and cart/order views.
    - Documented Phase 2B stock-restoration design (`stock_restored`, `stock_restored_at`, `stock_restored_by` idempotency fields and atomic row locking on order cancellation).
    - Verified with `110/110` backend tests (`314.322s`, including `5` new tests in `ProductListingV1Tests` and `4` new tests in `OrderDecimalAndSnapshotTests`).
14. **Section 4.22 Phase 2B — Product Listing V1 Backend Integration & Inventory Safety** (`2026-11-25`, dev only):
    - Verified that the `$5.00` delivery fee (`DELIVERY_FEE = Decimal('5.00')`) was preserved in `CreateOrderSerializer.create` (`total_amount = quantize_currency(subtotal + DELIVERY_FEE)`).
    - Synced `CartItem.current_price` and `CartItem.total_price` to the live `Product.price` so `GET /api/v1/cart/` always matches checkout pricing and rejects client price-manipulation attempts.
    - Hardened `add_to_cart`, `cart_item_detail`, and `CreateOrderSerializer.create` against stale active carts when a farmer changes `unit`, `unit_description`, `min_order_quantity`, or `stock` (re-validating combined cart quantities on increment and blocking invalid checkouts without silently deleting customer carts).
    - Enforced deterministic lock acquisition order (`Cart` -> `CartItem` -> `Product.id ASC`) across checkout and cancellation, eliminating implicit join locks and deadlock risk.
    - Implemented atomic, idempotent pre-shipment order cancellation and stock restoration (`_cancel_order_and_restore_stock` in `backend/orders/order_views.py` + `OrderItem.stock_restored` and `OrderItem.stock_restored_at` in `orders/migrations/0007_orderitem_stock_restoration_tracking.py`), forward-only `Order` and `OrderItem` status transition guards, and customer status-update privilege lockdown (`customers may only request status='cancelled'`).
    - Added multi-threaded `TransactionTestCase` concurrency tests (`ConcurrentCheckoutTransactionTests`) and lifecycle/cart-staleness tests (`OrderLifecycleAndStockRestorationTests`), verifying `115/115` backend tests passing in `farmconnect-dev`.
15. **Section 4.22 Phase 2C — Product Listing V1 Frontend Contract Review & Farmer UI Implementation** (`2026-11-25`, dev only):
    - Created shared [`frontend/src/lib/product-units.ts`](../../frontend/src/lib/product-units.ts) and updated [`frontend/src/lib/services/product-service.ts`](../../frontend/src/lib/services/product-service.ts) with the 12 controlled selling units (`kg`, `l`, `g`, `piece`, `head`, `bunch`, `bundle`, `tray`, `crate`, `bag`, `bucket`, `bird`), unit formatting (`formatProductUnitDisplay`), and strict validation (`validateProductListingForm`, enforcing package descriptions for `bag`/`tray`/`crate`/`bucket` and whole numbers for countable units without silent rounding).
    - Enhanced [`frontend/src/pages/farmer/AddProduct.tsx`](../../frontend/src/pages/farmer/AddProduct.tsx) while preserving the existing visual layout: added Selling Unit selector, Package Size / Details field, Price per Unit ($), Available Stock, Minimum Order Quantity, and a lightweight pre-publication **Product Preview** confirmation dialog that requires explicit confirmation (`Confirm & Publish`) without uploading duplicate images.
    - Enhanced [`frontend/src/pages/farmer/FarmerProducts.tsx`](../../frontend/src/pages/farmer/FarmerProducts.tsx) with formatted unit pricing/stock, legacy `"No unit assigned"` badges, an **Edit Product** dialog supporting all product fields and optional image replacement, a legacy unitless warning banner requiring a valid selling unit before saving, and an active-cart confirmation prompt when changing an existing product's selling unit or package size.
    - Updated [`frontend/src/components/admin/AdminProductFormDialog.tsx`](../../frontend/src/components/admin/AdminProductFormDialog.tsx) and [`frontend/src/components/admin/AdminProductManagementPanel.tsx`](../../frontend/src/components/admin/AdminProductManagementPanel.tsx) for selling-unit, package-description, decimal-stock, minimum-order, and legacy-product-warning compatibility without altering moderation behavior.
    - Verified with `75/75` Vitest tests (`16/16` files), `npx tsc --noEmit`, `vite build` (`8.57s`), and backend `products` regression tests. Customer marketplace, cart, and checkout pages were intentionally left untouched for Phase 2D.
16. **Section 4.22 Phase 2D — Product Listing V1 Customer Marketplace, Cart, Checkout & Order History Integration** (`2026-11-25`, dev only):
    - Updated [`ProductCard.tsx`](../../frontend/src/components/ProductCard.tsx), [`ShopByCategorySection.tsx`](../../frontend/src/components/ShopByCategorySection.tsx), and [`CategoryProductPreviewModal.tsx`](../../frontend/src/components/CategoryProductPreviewModal.tsx) to display price per selling unit (`$1.50 / kg`, `$4.50 / tray (30 eggs)`), available stock with unit (`50 kg available`, `12 trays available`), and legacy unitless fallback (`$3.50`, `8 available`) without fabricated units.
    - Updated [`ProductDetails.tsx`](../../frontend/src/pages/ProductDetails.tsx) with selling unit, available stock, minimum order quantity, step + direct decimal quantity input (`validateCustomerOrderQuantity`), live item subtotal (`Selected quantity: 2.5 kg`, `Item subtotal: $3.75`), and a single atomic `addItem` call (replacing the legacy `for` loop).
    - Upgraded [`cart-context.tsx`](../../frontend/src/lib/cart-context.tsx) with synchronous `itemsRef` state updates (preventing rapid consecutive `addItem`/`updateQuantity` calls from losing updates to stale React state), cent-safe `ROUND_HALF_UP` subtotal/total math, and live server-cart reconciliation detecting farmer price/unit changes (`priceChanged`, `unitChanged`) and quantity validation errors without silently deleting cart items.
    - Updated [`CartPage.tsx`](../../frontend/src/pages/CartPage.tsx) and [`CheckoutPage.tsx`](../../frontend/src/pages/CheckoutPage.tsx) to display unit-aware quantities, prices, and line subtotals, preserve the `$5.00` delivery fee, surface price/unit change notices, and block checkout until any stale/invalid cart quantities are corrected.
    - Updated [`order-service.ts`](../../frontend/src/lib/services/order-service.ts), [`CustomerOrders.tsx`](../../frontend/src/pages/customer/CustomerOrders.tsx), [`OrderTracking.tsx`](../../frontend/src/pages/customer/OrderTracking.tsx), [`FarmerOrders.tsx`](../../frontend/src/pages/farmer/FarmerOrders.tsx), [`FarmerDashboard.tsx`](../../frontend/src/pages/farmer/FarmerDashboard.tsx), and [`AdminOrders.tsx`](../../frontend/src/pages/admin/AdminOrders.tsx) to render historical `OrderItem.product_name` and `OrderItem.unit_label` snapshots while displaying legacy blank `unit_label` orders gracefully without fabricated units.
    - Verified with `81/81` Vitest tests (`17/17` files, including `6` new tests in `customer-product-listing-v1.test.tsx`), `npx tsc --noEmit`, `vite build` (`9.22s`), and `115/115` backend tests in `farmconnect-dev`.
17. **Section 4.22 Phase 2E — Product Listing V1 Release Readiness Verification** (`2026-11-25`, dev only):
    - Completed full code & security review across Phases 2A–2D, live E2E & selling-unit A–E verification (`kg`, `L`, `tray`, `bag`, `head`), isolated pre-V1-to-V1 migration rehearsal (`rehearsal_v1_check` — caught and fixed `orders.0006` `RunPython` to use `schema_editor.connection.alias`), and order-lifecycle risk assessment.
    - Verified `115/115` backend tests, `81/81` Vitest tests (`17/17` files), `npx tsc --noEmit`, and `vite build` (`9.75s`). Verdict: **READY WITH CONDITIONS** (commit/push + pre-deploy production DB backup + running `products.0007`, `orders.0006`, `orders.0007` + manual mobile browser check at `320px`–`1280px` post-deploy or in staging).

## 3. Work In Progress / Outstanding Items

- **Admin Enhancement Plan**: Sections 1–4.7 + Organizational SMTP Support ready; Sections 5–7 and production deploy awaiting explicit authorization.
- **Production Safety**: `users.0005`–`0006`, `products.0005`–`0006`, `orders.0005`, and `reviews.0002` have NOT been applied to production (`farmconnect-db`), and production containers remain untouched.
- **Outstanding verification**:
  - Organizational SMTP in `backend/.env` (`PASSWORD_RESET_EMAIL_PROVIDER=smtp`, `mails.hpc.ac.zw:465`, `EMAIL_USE_SSL=True`) verified end-to-end with `DEBUG=False` and confirmed delivered to user's Gmail inbox in an isolated container; live production password-reset flow awaits authorized deployment.
  - Production `SECURE_SSL_REDIRECT` (defaults `True` when `DEBUG=False`) / CloudPanel `X-Forwarded-Proto` header forwarding is **Not yet verified**.
  - Automated headless Playwright browser tests require installing Playwright's Chromium binary (`npx playwright install`), which has not been done.

## 4. Next Recommended Task

1. Review the newly created `AGENTS.md` and `docs/` files and approve committing/pushing them to `kudzai`.
2. Verify live production password reset email delivery and `SECURE_SSL_REDIRECT` behavior with the infrastructure owner.

## 5. Key Files for the Next Agent

- [AGENTS.md](../../AGENTS.md)
- [docs/README.md](../README.md)
- [docs/05-project-memory/PROJECT_MEMORY.md](../05-project-memory/PROJECT_MEMORY.md)
- [docs/06-progress/PROGRESS_TRACKER.md](PROGRESS_TRACKER.md)
- [frontend/src/components/ShopByCategorySection.tsx](../../frontend/src/components/ShopByCategorySection.tsx)
- [frontend/src/layouts/FarmerLayout.tsx](../../frontend/src/layouts/FarmerLayout.tsx)
- [frontend/src/pages/farmer/FarmerProfile.tsx](../../frontend/src/pages/farmer/FarmerProfile.tsx)
- [backend/users/serializers.py](../../backend/users/serializers.py)

## 6. Safety Warnings

- **Never** modify, print, or commit `.env`, `backend/.env`, or `backend/.env.development`.
- **Never** run `docker compose down -v`, reset PostgreSQL, or rebuild/restart `docker-compose.yaml` production containers without explicit user approval.
- Always run `vitest` / `vite build` with Node 22 (`/home/farm-connect/.nvm/versions/node/v22.23.4/bin`) in `PATH`.

