# FarmConnect — Release Candidate Manifest (Section 4.9)

**Branch:** `kudzai`  
**Base Commit:** `34ca559` (`origin/kudzai`)  
**Release Candidate Target:** Customer Review & Testimonials System + Admin Enhancement Sections 1–4.6 + Organizational SMTP Support (`mails.hpc.ac.zw:465`)  
**Release Status:** Prepared in working tree (`CONDITIONAL GO`; pending review, commit/tag, backup, and deployment authorization)

---

## 1. Included Functional Scope

1. **Database-Backed Customer Review & Testimonials System**:
   - Dedicated `reviews` app (`PlatformTestimonial`, `ProductReview`), DB uniqueness/consent constraints, anti-abuse guards, and admin moderation.
   - Homepage testimonials and `ProductDetails` ratings/reviews connected to live APIs with customer submission modals; verified-purchase badges kept disabled for simulated payments.
2. **Admin RBAC & Immutable Audit Trail (Section 1)**:
   - Reused `User.is_superuser`, `is_staff`, and `user_type` to separate Super Admin vs General Admin; protected self, Super Admins, and last active Super Admin; added immutable `AdminAuditLog` with credential sanitization.
3. **Admin User Management (Section 2)**:
   - Connected `AdminUsers.tsx` to live paginated `/api/v1/auth/admin/users/` with full-name search, role/status filtering, responsive mobile cards, Super-Admin-only role/status confirmation dialogs, and `AdminLayout` mobile drawer fixes.
4. **Farmer Account Lifecycle Management (Section 3)**:
   - Added `FarmerProfile.status` (`pending`, `approved`, `suspended`) + reason/audit metadata via `users.0006` (`RunPython` preserving existing farmers as `approved`).
   - Enforced farmer approval across product writes, public catalog, cart, and checkout without disabling `User.is_active` or breaking historical orders.
5. **Farmer Product Management & Moderation (Section 4)**:
   - Added `Product.moderation_status` (`active`, `hidden`, `removed`) + moderation metadata via `products.0005` (preserving existing products as `active`).
   - Built shared `AdminProductFormDialog` and `AdminProductManagementPanel` used by both `AdminFarmers` (`View Products`) and `AdminProducts`, backed by `/api/v1/products/<slug>/{hide,restore,remove}/` and non-destructive `DELETE` soft removal.
6. **Security & Historical Order Remediation (Section 4.6)**:
   - Added `ActiveUserTokenRefreshSerializer`/`ActiveUserTokenRefreshView` + `revoke_user_refresh_tokens` so suspended users have outstanding refresh tokens blacklisted and refresh exchanges rejected (`401`).
   - Added `NoHardDeleteAdminMixin`, fixed `FarmerProfileInline` (`description`, `status`), blocked destructive user deletion in `admin_user_detail` (`400`), added zero-DDL `on_delete=PROTECT` migrations (`products.0006`, `orders.0005`, `reviews.0002`), and set `client_max_body_size 6M` in `nginx-dev.conf`.
7. **Organizational SMTP Production Support & Env Isolation**:
   - Enabled `PASSWORD_RESET_EMAIL_PROVIDER='smtp'` when `DEBUG=False`, reading host/port/encryption (`EMAIL_USE_TLS` for STARTTLS or `EMAIL_USE_SSL` for implicit TLS via `SMTP_SSL`) strictly from environment variables while keeping `'django'` dev Gmail isolation restricted to `DEBUG=True` and enforcing startup `ImproperlyConfigured` checks if required production SMTP settings are missing or conflicting.
   - Replaced implicit `SECRET_KEY`-based `load_dotenv(BASE_DIR / '.env')` with explicit opt-in `DJANGO_ENV_FILE` loading in [`backend/backend/settings.py`](file:///home/farm-connect/Farm-Connect/backend/backend/settings.py#L23-L32), ensuring Docker Compose `env_file` runs (`backend/.env` for prod, `backend/.env.development` for dev) never cross-load `backend/.env` implicitly.
8. **Release & Ignore Hardening (Section 4.9)**:
   - Updated `.gitignore` to exclude `backups/`, `*.dump`, `*.sql`, `*.sql.gz`, `*.bak`, and `.env.*` (preserving `.env.example` / `.env.*.example`).
   - Updated `backend/.dockerignore` to exclude `.env.*`, `backups/`, `*.dump`, and `media/` while preserving `.env.example` / `.env.*.example`.

---

## 2. Database Migrations Included

Current production DB (`farmconnect-db`) already has `users.0001`–`0004`, `products.0001`–`0004`, `orders.0001`–`0004`, `reviews.0001_initial`, and `payments.0001_initial` applied. Pending migrations to apply during cutover:

| Order | App & Migration | Operation Summary | Existing Prod Data Impact |
| :--- | :--- | :--- | :--- |
| 1 | `users.0005_adminauditlog` | Create `users_adminauditlog` table + indexes | Additive; `0` existing rows touched |
| 2 | `users.0006_farmerprofile_status_...` | Add `status`, `status_reason`, `status_updated_*` + `RunPython` | Sets all `21` existing `FarmerProfile` rows to `approved` |
| 3 | `products.0005_product_moderated_at_...` | Add `moderation_status`, `moderation_reason`, `moderated_*` | Keeps all `21` existing `Product` rows `active` |
| 4 | `products.0006_alter_product_farmer` | `Product.farmer` -> `PROTECT` (`sqlmigrate`: `-- (no-op)`) | Zero SQL DDL; preserves farmers with products |
| 5 | `orders.0005_alter_order_customer_...` | `Order.customer` & `OrderItem.product` -> `PROTECT` (`-- (no-op)`) | Zero SQL DDL; preserves `2` `Order`s & `3` `OrderItem`s |
| 6 | `reviews.0002_alter_productreview_customer_...` | `ProductReview.customer` & `product` -> `PROTECT` (`-- (no-op)`) | Zero SQL DDL; preserves `1` `ProductReview` |

---

## 3. Configuration Requirements (`backend/.env` & Reverse Proxy)

- **`backend/.env`** (verified present & cleanly parsed without quotes/whitespace/CRLF):
  - `PASSWORD_RESET_EMAIL_PROVIDER=smtp`
  - `EMAIL_HOST=mails.hpc.ac.zw`
  - `EMAIL_PORT=465`
  - `EMAIL_USE_TLS=False`
  - `EMAIL_USE_SSL=True`
  - `EMAIL_TIMEOUT=15`
  - `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL`, `SECRET_KEY`, `DB_PASSWORD`
- **Production Proxy & TLS**:
  - CloudPanel reverse proxy terminates TLS for `https://farmconnect.hpc.ac.zw` and forwards `Host` + `X-Forwarded-Proto: https` to `farmconnect-nginx` (`10.50.103.90:8080`, verified `200` with zero redirect loop).

---

## 4. Verification Summary

| Suite / Check | Environment | Verified Result |
| :--- | :--- | :--- |
| `python manage.py check` & `makemigrations --check --dry-run` | `farmconnect-dev` | `0 issues`, `No changes detected` |
| Full Backend Suite (`python manage.py test`) | `farmconnect-dev` PostgreSQL | **`86/86` passed** (includes `SettingsConfigurationIsolationTests`) |
| TypeScript (`npx tsc --noEmit`) | Host Node `v22.23.4` | **Passed** (`exit 0`) |
| Frontend Vitest (`npm test -- --run`) | Host Node `v22.23.4` | **`13/13` files, `59/59` passed** (`30.04s`) |
| Vite Production Build (`npm run build`) | Host Node `v22.23.4` | **Passed** (`11.06s`) |
| Dev HTTP Integration + Security Probe | `http://127.0.0.1:18080/api/v1/` | **`25/25` passed, `0 failed`** |
| Isolated SMTP Auth & Delivery (`mails.hpc.ac.zw:465`, `DEBUG=False`) | Ephemeral `--rm` container + `backend/.env` | **Auth `noop_250` & inbox delivery confirmed** |
| Secret Scan on Release Files | Working tree (`kudzai`) | **Zero hardcoded real secrets** (`3` env lookups + `3` unit-test mock strings only) |

---

## 5. Runbook Quick Checklist (Backup, Restore Test, Cutover & Rollback)

1. **Build First**: `docker compose -f docker-compose.yaml build backend frontend`
2. **Write Freeze**: `docker compose -f docker-compose.yaml stop nginx backend` *(halts all HTTP/API DB writes before dump & schema shift)*
3. **Database + Media Backups** *(store outside Git in `/home/farm-connect/farmconnect-backups` with `chmod 700` since `/var/backups` is root-owned; current sizes: `farmconnect_db` `9495 kB`, `farm-connect_media_data` `8.3M`, host `/dev/xvda2` `46G` free)*:
   - Setup: `mkdir -p /home/farm-connect/farmconnect-backups && chmod 700 /home/farm-connect/farmconnect-backups`
   - DB: `docker compose -f docker-compose.yaml exec -T database pg_dump -U farmconnect_user -Fc farmconnect_db > /home/farm-connect/farmconnect-backups/farmconnect_pre_release_${TS}.dump && chmod 600 /home/farm-connect/farmconnect-backups/farmconnect_pre_release_${TS}.dump`
   - DB Verify: `docker compose -f docker-compose.yaml exec -T database pg_restore --list < /home/farm-connect/farmconnect-backups/farmconnect_pre_release_${TS}.dump`
   - Media: `docker run --rm -v farm-connect_media_data:/media:ro -v /home/farm-connect/farmconnect-backups:/bak alpine tar -czf /bak/media_pre_release_${TS}.tar.gz -C /media . && chmod 600 /home/farm-connect/farmconnect-backups/media_pre_release_${TS}.tar.gz`
   - Media Verify: `tar -tzf /home/farm-connect/farmconnect-backups/media_pre_release_${TS}.tar.gz >/dev/null`
   - **MANDATORY Pre-Cutover Isolated PostgreSQL Restore Drill (Gate Requirement)**: Production migration and container cutover **MUST NOT proceed** until all 5 criteria below are verified without overwriting or interfering with the existing production database (`farmconnect_db`):
     1. A valid PostgreSQL custom-format backup exists (`/home/farm-connect/farmconnect-backups/farmconnect_pre_release_${TS}.dump`, `chmod 600`).
     2. The backup has been restored successfully into an isolated disposable database (`CREATE DATABASE restore_drill_tmp;` -> `pg_restore -U farmconnect_user -d restore_drill_tmp ...` -> `DROP DATABASE restore_drill_tmp;`).
     3. Restored schema and essential records (`users_user`, `users_farmerprofile`, `products_product`, `orders_order`, `orders_orderitem`, `reviews_productreview`) have been verified in `restore_drill_tmp`.
     4. Media backup integrity (`tar -tzf /home/farm-connect/farmconnect-backups/media_pre_release_${TS}.tar.gz >/dev/null`) has been checked.
     5. Backup location (`/home/farm-connect/farmconnect-backups`, permissions `0700`/`0600`) and recovery procedure are documented.
4. **Migrate in Dependency Order**: `docker compose -f docker-compose.yaml run --rm --no-deps backend python manage.py migrate` -> `check`
5. **Cutover**: `docker compose -f docker-compose.yaml up -d --no-deps backend frontend nginx`
6. **Smoke Tests**: `https://farmconnect.hpc.ac.zw/` (`200`), `/api/v1/products/categories/` (`200`), `/api/v1/reviews/testimonials/` (`200`), `21` existing farmers `Approved` & `21` products `Active`, Admin RBAC & Audit logs, suspended-token `401`, and live password-reset request + confirmation email link.
7. **Rollback Conditions & Data-Loss Prevention**:
   - Trigger rollback if migrations fail, `500` errors occur, existing products/farmers disappear, or TLS/auth breaks.
   - Stop `nginx` and `backend` immediately; never run `docker compose down -v`.
   - Take a post-failure dump before restoring if any new user writes happened after cutover; otherwise restore `/var/backups/farmconnect/farmconnect_pre_release_${TS}.dump` and `/bak/media_pre_release_${TS}.tar.gz`, checkout the pre-release tag, and rebuild/start prior containers.
