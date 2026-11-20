# Project Memory — FarmConnect

This document captures critical institutional knowledge and preservation rules that must remain true across all sessions.

## 1. Environments, Secrets & Email Separation

- **Private environment files** (`.env`, `backend/.env`, `backend/.env.development`) are gitignored and must **never** be read into documentation, committed, or overwritten.
- **Gmail SMTP (Development)**: Isolated to local development via `backend/.env.development` and `PASSWORD_RESET_EMAIL_PROVIDER=django` (allowed only when `DEBUG=True`, enforced in [backend/backend/settings.py](../../backend/backend/settings.py#L235-L238)).
- **Production Email**: Uses Resend (`RESEND_API_KEY`, `PASSWORD_RESET_EMAIL_PROVIDER=resend`). Live delivery in production depends on `RESEND_API_KEY` and verified sender domain (**Not yet verified** live).
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

