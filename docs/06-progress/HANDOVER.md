# Agent Handover — FarmConnect

**Last Updated**: 2026-11-20

## 1. Current Verified Project State

- **Active Branch**: `kudzai` (up to date with `origin/kudzai` at commit `f23d855`).
- **Working Tree**: Clean prior to creating this documentation system (`AGENTS.md` and `docs/`).
- **Production (`farmconnect.hpc.ac.zw`)**: `farmconnect-backend`, `farmconnect-frontend`, `farmconnect-nginx`, and `farmconnect-db` are running and serving `200` on `/` and `/api/v1/products/`.
- **Development (`127.0.0.1:18080`)**: `farmconnect-dev-backend`, `farmconnect-dev-frontend`, `farmconnect-dev-gateway`, and `farmconnect-dev-db` are running.
- **Database Migrations**: Clean (`makemigrations --check --dry-run` reports `No changes detected`).

## 2. Work Completed in Recent Sessions

1. **Farmer Location Integration** (`d90d51c`, `e0d2697`): Reused `FarmerProfile.location` across registration, profile, `ProductSerializer`, `ProductDetails`, and `ProductCard`.
2. **Interactive Shop by Category** (`2ffe812`): Added expandable *"Types of [Category]"* panel, 3-card desktop Embla carousel with 5-second ping-pong autoplay, optional Zimbabwe town-centroid distance estimation, and `CategoryProductPreviewModal` (`Shop [Product Name]` CTA).
3. **Farmer Dashboard Mobile Responsiveness & Profile Sync** (`f23d855`): Auto-closing mobile drawer, stacked mobile cards across Farmer pages, `first_name`/`last_name` support in `UserUpdateSerializer`, and React Query `["products"]` + `["product"]` cache invalidation on profile save.
4. **Permanent Documentation System** (`2026-11-20`): Created `AGENTS.md` and `docs/01-*` through `docs/07-*`.

## 3. Work In Progress / Outstanding Items

- **Uncommitted documentation**: `AGENTS.md` and `docs/` have been created in the workspace and are **not** committed or pushed (per documentation-only task instructions).
- **Outstanding verification**:
  - Live production Resend email delivery (`RESEND_API_KEY`) is **Not yet verified**.
  - Production `SECURE_SSL_REDIRECT` / CloudPanel `X-Forwarded-Proto` handling is **Not yet verified**.
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

