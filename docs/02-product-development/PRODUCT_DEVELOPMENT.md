# Product Development — FarmConnect

## 1. Technology Stack (Verified)

### Frontend ([frontend/package.json](../../frontend/package.json))
- **React 18.3.1** + **TypeScript 5.8.3** + **Vite 5.4.19** (`@vitejs/plugin-react-swc`)
- **UI & Styling**: Tailwind CSS 3.4.17, Radix UI primitives (`@radix-ui/react-dialog`, `@radix-ui/react-toast`, etc.), `lucide-react` icons, `framer-motion` animations, `embla-carousel-react` for carousels, `recharts` for analytics charts
- **Routing & State**: `react-router-dom` v6.30.1, `@tanstack/react-query` v5.83.0, `axios` v1.16.0, `zod` + `react-hook-form`
- **Testing**: `vitest` v3.2.4, `@testing-library/react` v16.0.0, `jsdom` v28.1.0, `@playwright/test` v1.57.0 (installed; Chromium binary not installed on host)

### Backend ([backend/requirements.txt](../../backend/requirements.txt) & [backend/backend/settings.py](../../backend/backend/settings.py))
- **Django** + **Django REST Framework** (`rest_framework`)
- **Authentication**: `rest_framework_simplejwt` (60-minute access token, 1-day refresh token with rotation and token blacklisting)
- **Filtering & Media**: `django-filter`, `django-cors-headers`, `Pillow` (validated image uploads up to 5 MB for JPEG/PNG/WebP)
- **Database**: PostgreSQL (`django.db.backends.postgresql`, `postgres:16-alpine` in Docker Compose)
- **Email**: SMTP (`smtplib` / Django `EmailBackend`) and Resend HTTP API (`requests`)

---

## 2. Frontend Architecture

- **Entry & Routing**: [frontend/src/App.tsx](../../frontend/src/App.tsx) wraps the app in `QueryClientProvider`, `TooltipProvider`, `AuthProvider`, `CartProvider`, `ProductProvider`, and `BrowserRouter`, lazy-loading all page components.
- **Role Protection**: [frontend/src/components/RoleProtectedRoute.tsx](../../frontend/src/components/RoleProtectedRoute.tsx) waits for profile loading (`isLoading`) before enforcing `customer`, `farmer`, or `admin` role guards.
- **API Client & Auth**:
  - [frontend/src/lib/api-client.ts](../../frontend/src/lib/api-client.ts): Axios instance targeting `VITE_API_URL` (defaults to `/api/v1`). Attaches `Bearer <access>` from `localStorage` (`auth_tokens`) and transparently refreshes expired tokens via `POST /auth/token/refresh/`.
  - [frontend/src/lib/auth-context.tsx](../../frontend/src/lib/auth-context.tsx): Manages `user`, `login`, `register`, `updateProfile` (`PATCH /auth/profile/update/`), and `logout`.
- **Services**:
  - [frontend/src/lib/services/product-service.ts](../../frontend/src/lib/services/product-service.ts): `getProducts`, `getProductBySlug`, `getCategories`, `createProduct`, `deleteProduct`.
  - [frontend/src/lib/services/order-service.ts](../../frontend/src/lib/services/order-service.ts): Customer, admin, and farmer order endpoints.
- **Key Homepage & Farmer Components**:
  - [frontend/src/pages/Index.tsx](../../frontend/src/pages/Index.tsx): Hero animations (`HeroCarousel`, `MobileHeroGallery`), [`ShopByCategorySection`](../../frontend/src/components/ShopByCategorySection.tsx), and Featured Products ([`ProductCard`](../../frontend/src/components/ProductCard.tsx)).
  - [frontend/src/components/CategoryProductPreviewModal.tsx](../../frontend/src/components/CategoryProductPreviewModal.tsx): Radix Dialog preview modal with `"Shop [Product Name]"` link to `/product/:slug`.
  - [frontend/src/lib/zimbabwe-locations.ts](../../frontend/src/lib/zimbabwe-locations.ts): Town/city centroid lookup for approximate straight-line distance estimation.
  - [frontend/src/layouts/FarmerLayout.tsx](../../frontend/src/layouts/FarmerLayout.tsx) & [frontend/src/components/DashboardSidebar.tsx](../../frontend/src/components/DashboardSidebar.tsx): Collapsible mobile drawer (`< 768px` via `useIsMobile`) and desktop sidebar.

---

## 3. Backend Architecture & API Endpoints

Root URL routing in [backend/backend/urls.py](../../backend/backend/urls.py):
- `GET /` — API root template (`api_root`)
- `/admin/` — Django Admin
- `/api/v1/auth/` → [backend/users/urls.py](../../backend/users/urls.py)
- `/api/v1/products/` → [backend/products/urls.py](../../backend/products/urls.py)
- `/api/v1/cart/` → [backend/orders/urls.py](../../backend/orders/urls.py)

### Auth & User Endpoints (`/api/v1/auth/`)
| Method | Path | Permission | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `token/` & `token/refresh/` | Public | SimpleJWT token obtain & refresh |
| `POST` | `register/` | `AllowAny` | Register customer or farmer (`farm_name`, `location` required for farmers); blocks `admin` registration |
| `POST` | `login/` | `AllowAny` | Email + password authentication returning JWT pair + `UserSerializer` |
| `POST` | `logout/` | `IsAuthenticated` | Blacklists refresh token and logs out |
| `GET` | `profile/` | `IsAuthenticated` | Returns current `UserSerializer` (including `farmer_profile` / `customer_profile`) |
| `PUT/PATCH` | `profile/update/` | `IsAuthenticated` | Updates `request.user` (`first_name`, `last_name`, `username`, `phone`, `farmer_profile`, `customer_profile`) via `UserUpdateSerializer` |
| `GET` | `admin/users/` & `admin/users/<pk>/` | `IsAdmin` | Admin user management |
| `POST` | `password-reset/` | `AllowAny` + `PasswordResetRateThrottle` (`5/hour`) | Dispatches password reset link |
| `POST` | `password-reset/confirm/<uidb64>/<token>/` | `AllowAny` | Validates token and sets new password |

### Product & Category Endpoints (`/api/v1/products/`)
| Method | Path | Permission | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | `IsAuthenticatedOrReadOnly` | Lists available products (`page_size` up to 100) with `search`, `category`, `location`, `price`, `min_price`, `max_price`, `farmer` (`me` or email), `ordering` |
| `POST` | `/` | Farmer or Admin | Creates product with auto-generated unique `slug` and validated image (`ProductImageField`) |
| `GET` | `categories/` | `AllowAny` | Lists the 7 approved categories in canonical order (`APPROVED_CATEGORY_SLUGS`) |
| `GET/PUT/PATCH/DELETE` | `<slug>/` | Read: Public; Write: Owner Farmer or Admin | Retrieves, updates, or deletes product; `ProductSerializer` reads `farmer_name` & `farmer_location` from `User` and `FarmerProfile` |

### Cart & Order Endpoints (`/api/v1/cart/`)
| Method | Path | Permission | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | `IsAuthenticated` | Current customer cart |
| `POST` | `add/` | `IsAuthenticated` | Add item to cart |
| `PUT/PATCH/DELETE` | `items/<product_id>/` | `IsAuthenticated` | Update/remove cart item |
| `GET` | `orders/` | `IsAuthenticated` | List customer orders |
| `POST` | `orders/create/` | `IsAuthenticated` | Create order from cart |
| `GET` | `orders/<order_id>/` | `IsAuthenticated` | Order detail |
| `PATCH` | `orders/<order_id>/status/` | Admin | Update order status |
| `POST` | `orders/<order_id>/cancel/` | `IsAuthenticated` | Cancel order |
| `GET` | `admin/orders/` | Admin | List all orders |
| `GET` | `farmer/items/` | Farmer or Admin | List order items for `product__farmer=request.user` |
| `PATCH` | `farmer/items/<item_id>/status/` | Owner Farmer | Accept/reject order item (`product__farmer=request.user`) |

---

## 4. Password Reset & Email-Provider Selection

Configured in [backend/backend/settings.py](../../backend/backend/settings.py#L213-L248) and [backend/users/api_views.py](../../backend/users/api_views.py):
- `PASSWORD_RESET_EMAIL_PROVIDER` defaults to `'resend'` and only permits `'resend'` or `'django'`.
- Setting `PASSWORD_RESET_EMAIL_PROVIDER=django` when `DEBUG=False` raises `ImproperlyConfigured` at startup — enforcing that local Gmail SMTP (`EmailBackend` + `backend/.env.development`) stays isolated to development (`DEBUG=True`), while production uses Resend (`RESEND_API_KEY`).
- `PASSWORD_RESET_TIMEOUT = 60 * 60 * 24` (24 hours) and `PasswordResetRateThrottle` limits requests to `5/hour`.

---

## 5. Docker Development vs. Production Separation

| Aspect | Development ([docker-compose.dev.yaml](../../docker-compose.dev.yaml)) | Production ([docker-compose.yaml](../../docker-compose.yaml)) |
| :--- | :--- | :--- |
| **Compose Project** | `farmconnect-dev` | `farm-connect` |
| **Env Files** | `./backend/.env.development` (gitignored) | `./.env` & `./backend/.env` (gitignored) |
| **Containers** | `farmconnect-dev-db`, `farmconnect-dev-backend`, `farmconnect-dev-frontend`, `farmconnect-dev-gateway` | `farmconnect-db`, `farmconnect-backend`, `farmconnect-frontend`, `farmconnect-nginx` |
| **Exposed Ports** | `127.0.0.1:18080` (gateway), `127.0.0.1:18000` (backend) | `10.50.103.90:8080` (`farmconnect-nginx` behind CloudPanel reverse proxy) |
| **Volumes** | `farmconnect_dev_postgres_data`, `farmconnect_dev_media` | `postgres_data`, `media_data` |
| **Proxy Config** | [nginx-dev.conf](../../nginx-dev.conf) | [nginx-proxy.conf](../../nginx-proxy.conf) (`client_max_body_size 6M`) |

---

## 6. Testing Strategy

- **Backend**: Django `APITestCase` suite across `users`, `products`, `orders`, and `payments` (`44` tests verified passing against PostgreSQL in `farmconnect-dev`).
- **Frontend**: Vitest + React Testing Library (`9` test files, `37` tests verified passing with Node `v22.23.4`) covering route guards, public routes, login redirect, cart auth restore, password reset, farmer location, Shop by Category carousel & modal, and Farmer Dashboard mobile navigation.
- **Production Build**: `npm run build` (`vite build`) verifies TypeScript/bundler compilation.
- **Browser E2E**: Playwright is installed as a devDependency, but headless browser binaries are not installed on the host (**Not yet verified** in automated headless Chromium; verified manually by user on live domain).

---

## 7. Security & Performance Considerations

- **Security**: `UserUpdateSerializer` only updates `request.user`; admin registration is blocked on public `/register/`; uploaded product images are verified via `Pillow` (`image.verify()` + extension-to-format match + 5 MB cap); `SESSION_COOKIE_SECURE` and `CSRF_COOKIE_SECURE` are `True`; `SECURE_SSL_REDIRECT` is currently `False` (TLS terminated at CloudPanel proxy — **Not yet verified** whether CloudPanel forwards `X-Forwarded-Proto: https` consistently).
- **Performance**: `Product.objects.select_related('farmer', 'farmer__farmer_profile', 'category')` prevents N+1 queries on product listing and detail endpoints; React Query caches category queries (`staleTime: 5 min`) and invalidates `["products"]` / `["product"]` on profile save.

