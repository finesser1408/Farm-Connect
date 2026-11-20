# Architecture Decision Records (ADRs) — FarmConnect

All ADRs below document verified choices observed in the repository. Where historical rationale or dates were not explicitly recorded in commit messages, they are marked as inferred from code/config or **Not yet verified**.

---

## ADR-001: Separate PostgreSQL & Docker Compose Stacks for Dev and Production
- **Status**: Accepted & Implemented
- **Date**: 2026-11 (verified in `docker-compose.dev.yaml` and commit `d5e2c42`)
- **Context & Problem**: Developing and testing against the live `farmconnect.hpc.ac.zw` production database or volumes risks data loss and downtime.
- **Options Considered**: (1) Single Docker Compose stack; (2) Separate `docker-compose.dev.yaml` with dedicated volumes and ports.
- **Selected Approach**: Dedicated `docker-compose.dev.yaml` (`farmconnect-dev` project) binding to `127.0.0.1:18080` / `18000` with `farmconnect_dev_postgres_data` and `farmconnect_dev_media`.
- **Trade-offs & Consequences**: Requires specifying `-p farmconnect-dev --env-file ./backend/.env.development -f docker-compose.dev.yaml` for dev commands; completely isolates production data and volumes.

## ADR-002: Authoritative Farmer Profile Lookup Without Product Data Duplication
- **Status**: Accepted & Implemented
- **Date**: 2026-11 (verified in commits `d90d51c`, `f23d855`)
- **Context & Problem**: Displaying farmer name and location on Featured Products, Marketplace, Shop by Category, and Product Details could become stale if duplicated on `Product` rows.
- **Options Considered**: (1) Denormalize `farmer_name`/`farmer_location` columns onto `products_product`; (2) Read dynamically from `User` + `FarmerProfile` via `select_related` and invalidate React Query product caches on profile update.
- **Selected Approach**: Option 2 — [`ProductSerializer`](../../backend/products/serializers.py#L54-L95) derives `farmer_name` and `farmer_location` from `obj.farmer` and `obj.farmer.farmer_profile`, paired with `select_related('farmer', 'farmer__farmer_profile', 'category')` and client-side `queryClient.invalidateQueries` for `["products"]` and `["product"]`.
- **Trade-offs & Consequences**: Zero schema duplication and immediate consistency across all views after profile edits, with a minor join cost mitigated by `select_related`.

## ADR-003: Town/City-Level Public Locations & Client-Side Centroid Distance Calculation
- **Status**: Accepted & Implemented
- **Date**: 2026-11 (verified in commits `d90d51c`, `2ffe812`)
- **Context & Problem**: Customers want to know how close produce is without exposing farmers' residential addresses or requiring browser GPS permissions.
- **Options Considered**: (1) Browser Geolocation API + stored lat/lon coordinates; (2) Free-text city/town/district `FarmerProfile.location` + static Zimbabwe town centroids in [`zimbabwe-locations.ts`](../../frontend/src/lib/zimbabwe-locations.ts).
- **Selected Approach**: Option 2 — Optional town selector for customers and Haversine straight-line calculation against known Zimbabwe town centroids, returning `null` when a location is unrecognized.
- **Trade-offs & Consequences**: Preserves privacy and avoids GPS prompts; distances are approximate straight-line town-to-town estimates and are omitted for unrecognized village/ward names.

## ADR-004: Environment-Gated Email Provider for Password Resets
- **Status**: Accepted & Implemented
- **Date**: 2026-11 (verified in commit `1e0e3ba`, [settings.py](../../backend/backend/settings.py#L227-L238))
- **Context & Problem**: Local development uses Gmail SMTP (`backend/.env.development`), while production uses Resend (`RESEND_API_KEY`).
- **Selected Approach**: `PASSWORD_RESET_EMAIL_PROVIDER` (`'resend'` default, `'django'` allowed only when `DEBUG=True`, enforced via `ImproperlyConfigured`).
- **Trade-offs & Consequences**: Prevents accidental use of local Gmail SMTP config in production (`DEBUG=False`).

## ADR-005: Embla 3-Card Desktop Carousel with Ping-Pong Autoplay
- **Status**: Accepted & Implemented
- **Date**: 2026-11 (verified in [ShopByCategorySection.tsx](../../frontend/src/components/ShopByCategorySection.tsx))
- **Context & Problem**: With 4 products in a category (e.g., Fruits) and `xl:basis-1/4`, all 4 cards fit in the desktop viewport with zero horizontal overflow, making Embla's `scrollNext()` a no-op.
- **Selected Approach**: Cap desktop width at `lg:basis-1/3` (3 visible on desktop, 2 on tablet, 1 on mobile) with `loop: false`, `containScroll: "trimSnaps"`, and direction-reversing 5-second autoplay (`[1,2,3] ↔ [2,3,4]`).
- **Trade-offs & Consequences**: Smoothly animates 4+ product categories without duplicating or fabricating products; categories with `<= 3` products on desktop remain static without unnecessary arrows.

## ADR-006: Responsive Mobile Drawer + Stacked Cards in Farmer Dashboard
- **Status**: Accepted & Implemented
- **Date**: 2026-11 (verified in commit `f23d855`)
- **Context & Problem**: Desktop tables overflowed narrow mobile viewports (`360px`/`390px`), and the mobile sidebar drawer stayed open after clicking navigation items.
- **Selected Approach**: Auto-close Radix `Sheet` drawer on `NavLink` click in [`DashboardSidebar`](../../frontend/src/components/DashboardSidebar.tsx), enforce `min-w-0` / `overflow-x-clip` in [`FarmerLayout`](../../frontend/src/layouts/FarmerLayout.tsx), and render stacked card lists below `md` (`md:hidden`) while keeping tables on `hidden md:block`.
- **Trade-offs & Consequences**: Preserves desktop UX unchanged while eliminating horizontal scrolling on mobile.

