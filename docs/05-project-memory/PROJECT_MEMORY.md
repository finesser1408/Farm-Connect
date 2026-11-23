# Project Memory — FarmConnect

This document captures critical institutional knowledge and preservation rules that must remain true across all sessions.

## 1. Environments, Secrets & Email Separation

- **Private environment files** (`.env`, `backend/.env`, `backend/.env.development`) are gitignored and must **never** be read into documentation, committed, or overwritten.
- **Gmail SMTP (Development)**: Isolated to local development via `backend/.env.development` and `PASSWORD_RESET_EMAIL_PROVIDER=django` (allowed only when `DEBUG=True`, enforced in [backend/backend/settings.py](../../backend/backend/settings.py#L266-L270)).
- **Production Email (Organizational SMTP / Resend)**: Supports `PASSWORD_RESET_EMAIL_PROVIDER=smtp` with `DEBUG=False` via environment variables (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USE_TLS` for STARTTLS e.g. `587` OR `EMAIL_USE_SSL` for implicit TLS e.g. `465`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL`), alongside `'resend'`. Live organizational SMTP credentials must be entered manually in `backend/.env` before deployment (connectivity probe skipped here per instruction).
- **Password Reset**: Implemented via `/password-reset` and `/password-reset/confirm/:uidb64/:token` with `PasswordResetRateThrottle` (`5/hour`) and 24-hour token expiry.

## 2. Database & Docker Volume Preservation

- **PostgreSQL Separation**: Development (`farmconnect-dev-db` / volume `farmconnect_dev_postgres_data`) and Production (`farmconnect-db` / volume `postgres_data`) are completely separate.
- **Media Volumes**: `farmconnect_dev_media` (dev) and `media_data` (prod).
- **Rule**: Never run `docker compose down -v`, never reset databases, and never rebuild/restart production containers (`docker-compose.yaml`) without explicit approval.
- **Compose Project Names**:
  - Dev stack uses `-p farmconnect-dev --env-file ./backend/.env.development -f docker-compose.dev.yaml`.
  - Prod stack uses default project `farm-connect` (`-f docker-compose.yaml`).

## 3. Infrastructure & Domain

- **Production Domain**: `https://farmconnect.hpc.ac.zw`
- **Reverse Proxy**: CloudPanel reverse proxy forwards traffic to `farmconnect-nginx` on `10.50.103.90:8080`, which proxies `/api/` to `backend:8000` and `/` + `/media/` to `frontend:80` ([nginx-proxy.conf](../../nginx-proxy.conf)). Do not modify CloudPanel or host proxy configs.
- **Node.js Version Note**: Host default `node` is `v18.19.1`, which fails `vitest` with `ERR_REQUIRE_ESM` (`@exodus/bytes`). Always prepend `/home/farm-connect/.nvm/versions/node/v22.23.4/bin` to `PATH` when running `npm test` or `npm run build` on the host.

## 4. Product & UI Behavior to Preserve

- **Homepage Animations**: Hero entrance animations (`home-hero__enter`), desktop `HeroCarousel`, and mobile `MobileHeroGallery` in [Index.tsx](../../frontend/src/pages/Index.tsx).
- **Shop by Category**: Expandable *"Types of [Category]"* panel with smooth scroll (`scroll-mt-24`), 3-card desktop / 2-card tablet / 1-card mobile Embla carousel, 5-second ping-pong autoplay, optional Zimbabwe town-centroid distance estimation, and `CategoryProductPreviewModal` (`Shop [Product Name]` CTA).
- **Farmer Location & Profile Sync**: `FarmerProfile.location` (public city/town/district) + `User.first_name`/`last_name` are the single source of truth; `ProductSerializer` reads them dynamically, and [`FarmerProfile.tsx`](../../frontend/src/pages/farmer/FarmerProfile.tsx) invalidates `["products"]` and `["product"]` React Query keys on save.
- **Farmer Dashboard Mobile UX**: Collapsible mobile drawer auto-closes on navigation; responsive stacked cards on `< md` for Dashboard, Products, Orders, Analytics, Add Product, and Profile.
- **Review System & Verified Purchases**: Customer reviews are submitted with `status='pending'` and require admin moderation; customers cannot approve their own reviews. Verified-purchase badges are kept disabled while checkout runs with simulated payments (`SIMULATED-*`), until an independently verifiable real payment gateway integration is established. Platform testimonials require explicit customer consent before public display.
- **Admin RBAC & Audit Trail (Section 1)**:
  - Reuse Django's `is_superuser`, `is_staff`, and `user_type` fields (no duplicate role column): Super Admin = active `is_superuser=True` with `user_type='admin'`/`is_staff=True`; General Admin = active `user_type='admin'` or `is_staff=True` with `is_superuser=False`.
  - Privilege escalation via `/api/v1/auth/profile/update/` and `admin_user_detail` (`PUT`/`PATCH`) is blocked; role assignments and admin status changes require `IsSuperAdmin` on dedicated endpoints and log to immutable `AdminAuditLog` without secrets.
- **Admin User Management UI (Section 2)**: [`AdminUsers.tsx`](../../frontend/src/pages/admin/AdminUsers.tsx) fetches live paginated data from `/api/v1/auth/admin/users/`, hides role/status controls from General Admins (`View only`), protects self and Super Admin rows, and aligns `AdminLayout.tsx` with `FarmerLayout.tsx` mobile overflow/drawer rules.
- **Farmer Account Lifecycle (Section 3)**: `FarmerProfile.status` (`pending`, `approved`, `suspended`) is separate from `User.is_active`. Admin farmer registration (`/api/v1/auth/admin/farmers/`) sets initial status `pending` and skips welcome emails; suspending a farmer keeps `User.is_active=True` and preserves all products and orders while blocking product writes and public purchase. Reactivation restores `approved` status without altering product-level availability/moderation.
- **Farmer Product Moderation (Section 4)**: `Product.moderation_status` (`active`, `hidden`, `removed`) controls catalog visibility alongside `is_available` (`stock > 0`) and approved farmer checks (`is_product_publicly_visible`, `public_purchasable_product_q`). `DELETE /api/v1/products/<slug>/` and `/remove/` perform safe soft-removal (`removed`), preserving `OrderItem` and `ProductReview` rows; `removed` products cannot be restored via `/restore/` or edited via `PATCH`. Both `AdminFarmers.tsx` (`View Products`) and `AdminProducts.tsx` share `AdminProductManagementPanel` and `AdminProductFormDialog`.
- **Security & Historical Order Remediation (Section 4.6)**:
  - Suspended/deactivated users have outstanding refresh tokens blacklisted (`revoke_user_refresh_tokens`) and `ActiveUserTokenRefreshSerializer` rejects inactive users (`401`) on `/api/v1/auth/token/refresh/` (extracting claim via `api_settings.USER_ID_CLAIM`).
  - `NoHardDeleteAdminMixin` disables individual and bulk hard deletion in Django Admin for `User`, `FarmerProfile`, `Product`, `Order`, `OrderItem`, `Payment`, `PlatformTestimonial`, and `ProductReview`; `FarmerProfileInline` uses `description` (not stale `'bio'`); `DELETE /api/v1/auth/admin/users/<pk>/` returns `400`; and `Order.customer`, `OrderItem.product`, `Product.farmer`, `ProductReview.product`, and `ProductReview.customer` use `on_delete=PROTECT`.
  - `nginx-dev.conf` matches `nginx-proxy.conf` with `client_max_body_size 6M` for up to 5 MB product image uploads plus multipart overhead.

