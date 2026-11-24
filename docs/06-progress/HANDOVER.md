# Agent Handover — FarmConnect

**Last Updated**: 2026-11-24 (Section 4.16 — Admin Reviews & Testimonials Moderation)

## 1. Current Verified Project State

- **Active Branch**: `kudzai` (HEAD `cd4d1d24d869c3e8e0a7d494dfb91d91722bde61`, synced with `origin/kudzai`; Section 4.16 changes are currently uncommitted in the working tree awaiting review).
- **Production (`farmconnect.hpc.ac.zw`)**: Deployed at commit `cd4d1d2` (`Section 4.14` completed `2026-11-23`); untouched during Section 4.16 development.
- **Development (`farmconnect-dev`)**: Isolated `dev-backend` rebuilt and verified (`98/98` backend tests, `0` migration changes); frontend verified on Node 22 (`65/65` Vitest tests, `tsc --noEmit`, `vite build`).
- **Database Migrations**: Clean (`makemigrations --check --dry-run` reports `No changes detected`; Section 4.16 required no new migrations).

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
    - Verified with `98/98` backend tests (`12` new tests in `AdminReviewModerationTests`), `makemigrations --check --dry-run` (`No changes detected`), `14/14` Vitest files / `65/65` tests (`6` new tests in `admin-reviews.test.tsx`), `npx tsc --noEmit`, and `vite build` (`9.39s`).

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

