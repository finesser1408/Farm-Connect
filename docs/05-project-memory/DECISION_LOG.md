# Decision Log — FarmConnect

Chronological log of verified product, architecture, and operational decisions. See [ARCHITECTURE_DECISIONS.md](../03-architecture/ARCHITECTURE_DECISIONS.md) for detailed ADRs.

| Date | Decision | Evidence / Commit | Rationale & Impact |
| :--- | :--- | :--- | :--- |
| 2026-10/11 | Migrated from SQLite to PostgreSQL and containerized with Docker Compose | `26bc8ee`, `94cf8ed`, `docker-compose.yaml` | Consistent production persistence via `postgres:16-alpine` and `postgres_data` volume |
| 2026-11 | Separated dev Docker stack (`docker-compose.dev.yaml`) and isolated Gmail SMTP for `DEBUG=True` | `d5e2c42`, `1e0e3ba`, `settings.py` | Prevents dev work from affecting live `farmconnect.hpc.ac.zw` data or production email |
| 2026-11 | Enforced 7 approved product categories via data migration `0004_seed_approved_categories` | `f84105e`, `products/migrations/0004_seed_approved_categories.py` | Keeps homepage and marketplace categories standardized |
| 2026-11 | Reused existing `FarmerProfile.location` field and exposed `farmer_location` / `farmer_name` dynamically on `ProductSerializer` | `d90d51c`, `e0d2697`, `products/serializers.py` | Avoided schema duplication; fixed `ProductCard` to show location with `MapPin` and farmer name with `UserRound` |
| 2026-11 | Built interactive Shop by Category carousel (3 desktop cards, 5s ping-pong autoplay) + preview modal + town-centroid distances | `2ffe812`, `ShopByCategorySection.tsx`, `zimbabwe-locations.ts` | Avoids empty/static 4-card overflow and protects farmer privacy (no GPS or street addresses) |
| 2026-11 | Made Farmer Dashboard mobile-responsive and synchronized `FarmerProfile` updates via `UserUpdateSerializer` + React Query invalidation | `f23d855`, `FarmerLayout.tsx`, `FarmerProfile.tsx` | Eliminates mobile overflow, auto-closes drawer, and updates all product views immediately after profile save |
| 2026-11-20 | Established permanent `AGENTS.md` and `docs/` system | Documentation task | Enables seamless agent/developer onboarding without rediscovery |

