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

