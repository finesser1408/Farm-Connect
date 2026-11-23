# Issue & Resolution Log — FarmConnect

## Mandatory Agent Workflow for Errors

1. Search this log for similar symptoms before debugging.
2. Record a new issue entry using the template below (never include secrets, passwords, tokens, or personal customer data).
3. Investigate the root cause in actual source files and logs.
4. Document attempted solutions.
5. Implement only authorized changes.
6. Verify the fix with tests/builds.
7. Update the issue record with final status and resolution date.

---

## Reusable Issue Template

```markdown
### ISS-XXX — [Short Title]
- **Date Discovered**: YYYY-MM-DD
- **Feature / Component**:
- **Environment**: (Dev / Prod / Host CLI)
- **Symptoms & Error Message**:
- **Steps to Reproduce**:
- **Expected vs. Actual Behavior**:
- **Root Cause**:
- **Solutions Attempted**:
- **Successful Fix & Changed Files**:
- **Tests Performed**:
- **Final Status**: (Open / Investigating / Resolved)
- **Date Resolved**: YYYY-MM-DD
```

---

## Resolved Issues

### ISS-001 — `vitest` fails with `ERR_REQUIRE_ESM` on host default Node 18
- **Date Discovered**: 2026-11-19
- **Feature / Component**: Frontend test runner (`vitest`)
- **Environment**: Host CLI (`node v18.19.1`)
- **Symptoms & Error Message**: `Error: require() of ES Module .../node_modules/@exodus/bytes/encoding-lite.js from .../html-encoding-sniffer.js not supported.` (`ERR_REQUIRE_ESM`).
- **Steps to Reproduce**: Run `cd frontend && npm test` with default system Node `v18.19.1`.
- **Expected vs. Actual Behavior**: Vitest should execute tests; instead all 6 test suites errored during jsdom setup.
- **Root Cause**: Host default `/usr/bin/node` is `v18.19.1`, whereas `jsdom` v28 / `@exodus/bytes` requires Node 22+ `require(ESM)` support.
- **Solutions Attempted**: Checked installed nvm versions and found `v22.23.4`.
- **Successful Fix & Changed Files**: Prepend `/home/farm-connect/.nvm/versions/node/v22.23.4/bin` to `PATH` when running `npm test` or `npm run build` (documented in `AGENTS.md`).
- **Tests Performed**: `PATH="/home/farm-connect/.nvm/versions/node/v22.23.4/bin:$PATH" bash -c "cd frontend && npm test"` — all suites passed.
- **Final Status**: Resolved
- **Date Resolved**: 2026-11-19

### ISS-002 — `ProductCard` displayed farmer name beside the map-pin icon
- **Date Discovered**: 2026-11-19
- **Feature / Component**: Homepage Featured Products / `ProductCard.tsx`
- **Environment**: Dev & Prod
- **Symptoms & Error Message**: Product cards displayed `📍 Mr. Farmer` instead of `📍 Harare` and `👤 Farmer: Mr. Farmer`.
- **Steps to Reproduce**: View homepage Featured Products or Marketplace cards.
- **Expected vs. Actual Behavior**: Expected public farmer location beside `MapPin` and farmer name below it beside `UserRound`.
- **Root Cause**: `frontend/src/components/ProductCard.tsx` rendered `product.farmer_name` inside the `MapPin` row.
- **Solutions Attempted**: Inspected `ProductDetails.tsx` and `ProductSerializer` (both already had `farmer_location` and `farmer_name`).
- **Successful Fix & Changed Files**: Updated `frontend/src/components/ProductCard.tsx` (commit `e0d2697`) and added tests in `frontend/src/test/farmer-location.test.tsx`.
- **Tests Performed**: `vitest run` (`farmer-location.test.tsx`) + `vite build` + live verification on `farmconnect.hpc.ac.zw`.
- **Final Status**: Resolved
- **Date Resolved**: 2026-11-19

### ISS-003 — Shop by Category carousel did not move on desktop with 4 products
- **Date Discovered**: 2026-11-19
- **Feature / Component**: `ShopByCategorySection.tsx` (Fruits category, 4 products)
- **Environment**: Prod (`farmconnect.hpc.ac.zw`) desktop viewport
- **Symptoms & Error Message**: 4 product cards rendered in one static row; 5-second autoplay did not visibly slide.
- **Steps to Reproduce**: Open homepage on desktop (`>=1280px`), click "See types" on Fruits (4 products), wait 5+ seconds.
- **Expected vs. Actual Behavior**: Carousel should show 3 cards and advance smoothly to `[2, 3, 4]`, then reverse back to `[1, 2, 3]`.
- **Root Cause**: `xl:basis-1/4` fit all 4 cards inside the Embla viewport with zero overflow (`canScrollNext() === false`), making `scrollNext()` a no-op; `IntersectionObserver` also lacked `categoryProducts.length` in its dependency array.
- **Solutions Attempted**: Inspected `CarouselItem` classes and Embla `opts`.
- **Successful Fix & Changed Files**: Set `lg:basis-1/3` (3 desktop cards), configured `loop: false` + `containScroll: "trimSnaps"` + ping-pong direction reversal (`autoplayDirectionRef`), fixed `IntersectionObserver` deps, and added `scroll-mt-24` smooth scroll in `frontend/src/components/ShopByCategorySection.tsx`; updated `frontend/src/test/shop-by-category.test.tsx`.
- **Tests Performed**: `vitest run` (`36/36`), `vite build`, and live production deployment.
- **Final Status**: Resolved
- **Date Resolved**: 2026-11-19

### ISS-004 — `docker compose` dev commands failed with container name conflict
- **Date Discovered**: 2026-11-19
- **Feature / Component**: `docker-compose.dev.yaml`
- **Environment**: Host CLI
- **Symptoms & Error Message**: `Conflict. The container name "/farmconnect-dev-backend" is already in use`.
- **Steps to Reproduce**: Run `docker compose -f docker-compose.dev.yaml up -d ...` without `-p farmconnect-dev`.
- **Expected vs. Actual Behavior**: Compose should recreate the existing dev container.
- **Root Cause**: Running dev containers were started under Compose project `farmconnect-dev`, whereas omitting `-p` defaults to `farm-connect`.
- **Solutions Attempted**: Inspected container `com.docker.compose.project` label.
- **Successful Fix & Changed Files**: Always pass `-p farmconnect-dev --env-file ./backend/.env.development -f docker-compose.dev.yaml` for dev commands (documented in `AGENTS.md` and `PROJECT_MEMORY.md`).
- **Tests Performed**: Verified `up -d --build --no-deps` and `run --rm --no-deps` succeed cleanly with `-p farmconnect-dev`.
- **Final Status**: Resolved
- **Date Resolved**: 2026-11-19

### ISS-005 — `setUp` failed with `IntegrityError` on category slug during review test initialization
- **Date Discovered**: 2026-11-23
- **Feature / Component**: `backend/reviews/tests.py`
- **Environment**: Dev container (`dev-backend`)
- **Symptoms & Error Message**: `django.db.utils.IntegrityError: duplicate key value violates unique constraint "products_category_slug_key" DETAIL: Key (slug)=(vegetables) already exists.`
- **Steps to Reproduce**: Call `Category.objects.create(name='Vegetables', slug='vegetables')` in test `setUp()`.
- **Expected vs. Actual Behavior**: Test setup should initialize the test category without unique violation.
- **Root Cause**: Migration `products.0004_seed_approved_categories` runs during test DB creation and already inserts `'vegetables'` into `products_category`.
- **Solutions Attempted**: Changed `Category.objects.create` to `Category.objects.get_or_create`.
- **Successful Fix & Changed Files**: `Category.objects.get_or_create(slug='vegetables', defaults={'name': 'Vegetables'})` in `backend/reviews/tests.py`.
- **Tests Performed**: `docker compose -p farmconnect-dev run --rm dev-backend python manage.py test` — 53/53 tests passed.
- **Final Status**: Resolved
- **Date Resolved**: 2026-11-23

### ISS-006 — Vitest failed with `ResizeObserver is not defined` when rendering review dialogs in JSDOM
- **Date Discovered**: 2026-11-23
- **Feature / Component**: `frontend/src/test/reviews-system.test.tsx`
- **Environment**: Vitest in JSDOM environment
- **Symptoms & Error Message**: `ReferenceError: ResizeObserver is not defined`
- **Steps to Reproduce**: Render Radix Dialog modals (`TestimonialSubmissionModal`) in JSDOM without a stub for `ResizeObserver`.
- **Expected vs. Actual Behavior**: Test should mount Dialog components cleanly.
- **Root Cause**: JSDOM does not provide native `ResizeObserver` implementation used by Radix UI.
- **Solutions Attempted**: Mocked `ResizeObserver` global similarly to `IntersectionObserver`.
- **Successful Fix & Changed Files**: Added `MockResizeObserver` with `observe`, `unobserve`, `disconnect` in `frontend/src/test/reviews-system.test.tsx`.
- **Tests Performed**: `npm test -- --run` — 42/42 tests passed.
- **Final Status**: Resolved
- **Date Resolved**: 2026-11-23

### ISS-007 — `AdminUsers` and `AdminFarmers` tables rendered empty due to hardcoded `[]` state and `AdminLayout` referenced `user?.name`
- **Date Discovered**: 2026-11-23
- **Feature / Component**: `frontend/src/pages/admin/AdminUsers.tsx`, `frontend/src/layouts/AdminLayout.tsx`
- **Environment**: Dev & Prod UI
- **Symptoms & Error Message**: Opening `/admin/users` always showed an empty table; `AdminLayout` always fell back to `"Admin"` because `User` has `first_name`/`last_name`/`email` rather than `name`.
- **Steps to Reproduce**: Navigate to `/admin/users` as an administrator.
- **Expected vs. Actual Behavior**: Registered users should load from `/api/v1/auth/admin/users/` with search, filter, pagination, and RBAC-gated actions; `AdminLayout` should display the admin's real name and avoid horizontal mobile overflow.
- **Root Cause**: `AdminUsers.tsx` initialized `setUsers([])` inside `useEffect` with a `TODO` stub; `AdminLayout.tsx` omitted `overflow-x-clip`, `min-w-0`, mobile drawer `onLogout`, and referenced `user?.name`.
- **Solutions Attempted**: Created `frontend/src/lib/services/admin-service.ts`, wired `AdminUsers.tsx` to live paginated `/api/v1/auth/admin/users/` with Super-Admin confirmation dialogs, mobile stacked cards (`< 768px`), and updated `AdminLayout.tsx` to match `FarmerLayout.tsx` responsive patterns. (`AdminFarmers.tsx` will be addressed in Section 3.)
- **Successful Fix & Changed Files**: `frontend/src/lib/auth-context.tsx`, `frontend/src/lib/services/admin-service.ts`, `frontend/src/layouts/AdminLayout.tsx`, `frontend/src/pages/admin/AdminUsers.tsx`, `frontend/src/test/admin-users.test.tsx`.
- **Tests Performed**: `npx tsc --noEmit`, `npm test -- --run` (`49/49` tests incl. `7/7` in `admin-users.test.tsx`), `npm run build`.
- **Final Status**: Resolved (for `AdminUsers` & `AdminLayout`; `AdminFarmers` tracked for Section 3)
- **Date Resolved**: 2026-11-23

### ISS-008 — PostgreSQL rejected `select_for_update()` combined with nullable `select_related('farmer__farmer_profile')` during checkout
- **Date Discovered**: 2026-11-23
- **Feature / Component**: `backend/orders/serializers.py` (`CreateOrderSerializer.create`)
- **Environment**: Dev PostgreSQL container (`farmconnect-dev-db`)
- **Symptoms & Error Message**: `500 Internal Server Error` with `FOR UPDATE cannot be applied to the nullable side of an outer join` during `test_checkout_creates_order_payment_and_decrements_stock` and `test_farmer_lifecycle_approve_suspend_reactivate_and_product_order_enforcement`.
- **Steps to Reproduce**: Call `POST /api/v1/cart/orders/create/` while locking `Product` with `.select_related('farmer', 'farmer__farmer_profile').select_for_update()`.
- **Expected vs. Actual Behavior**: Checkout should lock the `Product` row and verify `is_product_farmer_purchasable(product)` without outer-join lock errors.
- **Root Cause**: Reverse `OneToOneField` (`farmer_profile`) generates a nullable `LEFT OUTER JOIN` in PostgreSQL, which cannot be combined with an unqualified `FOR UPDATE`.
- **Solutions Attempted**: Kept `Product.objects.select_for_update().get(pk=item.product_id)` cleanly scoped to the `Product` table and evaluated `is_product_farmer_purchasable(product)` inside the `@transaction.atomic` block.
- **Successful Fix & Changed Files**: Updated `CreateOrderSerializer.create` in `backend/orders/serializers.py`.
- **Tests Performed**: Re-ran full Django test suite in `farmconnect-dev`.
- **Final Status**: Resolved
- **Date Resolved**: 2026-11-23

### ISS-009 — Product deletion previously called hard `.delete()` and lacked non-destructive moderation
- **Date Discovered**: 2026-11-23
- **Feature / Component**: `backend/products/models.py`, `backend/products/api_views.py`, `frontend/src/pages/admin/AdminProducts.tsx`
- **Environment**: Dev (`farmconnect-dev`)
- **Symptoms & Error Message**: `DELETE /api/v1/products/<slug>/` performed a hard SQL `DELETE`, cascading across related `OrderItem` (`orders_orderitem`) and `ProductReview` (`reviews_productreview`) rows; no `hidden`/`removed` moderation state or admin edit/add/restore controls existed.
- **Steps to Reproduce**: Remove a product linked to an order or review, or inspect `AdminProducts.tsx` for hide/restore/edit actions.
- **Expected vs. Actual Behavior**: Admins (and farmers) removing a product should soft-remove (`moderation_status = 'removed'`) without breaking historical orders or reviews; admins should also be able to add, edit, hide, and restore products with audit logging.
- **Root Cause**: `Product` had only `is_available = (stock > 0)` with no `moderation_status`, and `product_detail` called `product.delete()`.
- **Solutions Attempted**: Added `moderation_status` (`active`, `hidden`, `removed`), `moderated_by`, `moderated_at`, `moderation_reason` via `products/migrations/0005_*`, replaced `product.delete()` with soft-removal, enforced `moderation_status == 'active'` across public catalog/detail/cart/checkout, and built shared `AdminProductFormDialog` + `AdminProductManagementPanel`.
- **Successful Fix & Changed Files**: `backend/products/models.py`, `backend/products/serializers.py`, `backend/products/api_views.py`, `backend/products/urls.py`, `backend/products/admin.py`, `backend/users/permissions.py`, `backend/orders/api_views.py`, `backend/orders/serializers.py`, `frontend/src/lib/services/product-service.ts`, `frontend/src/components/admin/AdminProductFormDialog.tsx`, `frontend/src/components/admin/AdminProductManagementPanel.tsx`, `frontend/src/pages/admin/AdminFarmers.tsx`, `frontend/src/pages/admin/AdminProducts.tsx`.
- **Tests Performed**: `75/75` backend tests (`products.tests.AdminProductModerationTests` + existing suite), `59/59` Vitest tests (`13/13` files), `npx tsc --noEmit`, `vite build`.
- **Final Status**: Resolved
- **Date Resolved**: 2026-11-23

### ISS-010 — Suspended administrator refresh tokens continued minting new access tokens (`HTTP 200`)
- **Date Discovered**: 2026-11-23 (Section 4.5 Pre-Production Verification)
- **Feature / Component**: `backend/users/urls.py`, `backend/users/serializers.py`, `backend/users/api_views.py`
- **Environment**: `farmconnect-dev` HTTP Gateway (`http://127.0.0.1:18080/api/v1/auth/token/refresh/`)
- **Symptoms & Error Message**: After suspending a General Admin (`is_active=False`), their existing access JWT was rejected (`401`), but `POST /api/v1/auth/token/refresh/` with their existing refresh token still returned `200` with a new access token.
- **Steps to Reproduce**: Issue JWTs -> Super Admin suspends user via `/api/v1/auth/admin/users/<pk>/status/` -> POST `refresh` to `/api/v1/auth/token/refresh/`.
- **Expected vs. Actual Behavior**: Refresh requests from suspended/inactive users must return `401 Unauthorized` and outstanding refresh tokens should be blacklisted upon suspension.
- **Root Cause**: Default `TokenRefreshSerializer` validates JWT signature/expiry without verifying `user.is_active`, and `admin_user_status_update` did not blacklist `OutstandingToken` records on deactivation.
- **Solutions Attempted**: Created `ActiveUserTokenRefreshSerializer` + `ActiveUserTokenRefreshView` checking `user.is_active` via `api_settings.USER_ID_CLAIM` (`user_id`), and added `revoke_user_refresh_tokens()` (`backend/users/tokens.py`) called during suspension and Django Admin bulk deactivation.
- **Successful Fix & Changed Files**: `backend/users/tokens.py`, `backend/users/serializers.py`, `backend/users/api_views.py`, `backend/users/urls.py`, `backend/users/tests.py`.
- **Tests Performed**: `SecurityAndHistoricalDataRemediationTests`, full `77/77` backend suite, and `25/25` live HTTP verification checks (`refresh_after=401`).
- **Final Status**: Resolved
- **Date Resolved**: 2026-11-23

### ISS-011 — Django Admin / User-Delete API could cascade-delete historical orders and `FarmerProfileInline` referenced stale `'bio'`
- **Date Discovered**: 2026-11-23 (Section 4.5 Pre-Production Verification)
- **Feature / Component**: `backend/orders/models.py`, `backend/products/models.py`, `backend/reviews/models.py`, `backend/users/admin.py`, `backend/products/admin.py`, `backend/orders/admin.py`, `backend/payments/admin.py`, `backend/users/api_views.py`, `nginx-dev.conf`
- **Environment**: `farmconnect-dev` Django Admin & API
- **Symptoms & Error Message**: Django Admin deletion of a `Product` or `User` (`delete_model` / `delete_selected`), and `DELETE /api/v1/auth/admin/users/<pk>/`, cascaded and deleted historical `Order`/`OrderItem` rows; `FarmerProfileInline` listed removed field `'bio'`; `nginx-dev.conf` omitted `client_max_body_size 6M;`.
- **Steps to Reproduce**: Inspect `ProductAdmin`/`CustomUserAdmin` permissions, run `delete_model` on records with `OrderItem`/`Order` rows, or upload >1MB image through dev gateway.
- **Expected vs. Actual Behavior**: Historical orders, items, payments, and reviews must be preserved; admins should deactivate accounts and soft-remove products; dev gateway should accept 5 MB + multipart overhead (`6M`).
- **Root Cause**: Core FKs used `on_delete=CASCADE`, Django Admin allowed default delete actions, `admin_user_detail` executed `target.delete()`, `FarmerProfileInline` predated migration `users.0003`, and `nginx-dev.conf` defaulted to 1MB.
- **Solutions Attempted**: Added zero-DDL `on_delete=PROTECT` migrations (`orders.0005`, `products.0006`, `reviews.0002`), shared `NoHardDeleteAdminMixin` (`backend/backend/admin_mixins.py`), safe moderation/deactivation bulk actions, disabled `DELETE` hard-removal in `admin_user_detail` (`400`), fixed `FarmerProfileInline` fields (`description`, `status`), and set `client_max_body_size 6M;` in `nginx-dev.conf`.
- **Successful Fix & Changed Files**: `backend/backend/admin_mixins.py`, `backend/orders/models.py`, `backend/orders/admin.py`, `backend/products/models.py`, `backend/products/admin.py`, `backend/reviews/models.py`, `backend/reviews/admin.py`, `backend/payments/admin.py`, `backend/users/admin.py`, `backend/users/api_views.py`, `nginx-dev.conf`.
- **Tests Performed**: `77/77` backend tests (`226.573s`), `59/59` Vitest tests, `vite build`, and `25/25` live HTTP + Django Admin probe checks (`> 1 MB` upload HTTP `200`).
- **Final Status**: Resolved
- **Date Resolved**: 2026-11-23

