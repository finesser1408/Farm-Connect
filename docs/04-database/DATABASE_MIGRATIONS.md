# Database Migrations — FarmConnect

## 1. Existing Django Migration History (Verified)

| App | Migration | Purpose |
| :--- | :--- | :--- |
| `users` | `0001_initial` | Creates `User`, `FarmerProfile`, `CustomerProfile` (including `FarmerProfile.location`) |
| `users` | `0002_alter_user_user_type` | Updates `User.user_type` choices |
| `users` | `0003_rename_bio_farmerprofile_description` | Renames `FarmerProfile.bio` -> `description` |
| `users` | `0004_alter_user_managers` | Sets `FarmConnectUserManager` (`use_in_migrations = False`) |
| `users` | `0005_adminauditlog` | Creates `AdminAuditLog` table in dev (`farmconnect-dev-db` only; prod migration pending final approval) |
| `users` | `0006_farmerprofile_status_farmerprofile_status_reason_and_more` | Adds `FarmerProfile.status`, `status_reason`, `status_updated_at`, `status_updated_by` and sets existing farmers to `approved` via `RunPython` (dev DB only) |
| `products` | `0001_initial` | Creates `Category` and `Product` |
| `products` | `0002_initial` | Links `Product.farmer` FK to `users.User` |
| `products` | `0003_alter_product_image_alter_product_stock` | Alters `Product.image` and `Product.stock` |
| `products` | `0004_seed_approved_categories` | Data migration seeding the 7 approved categories (`vegetables`, `fruits`, `grains-and-cereals`, `legumes-and-pulses`, `root-and-tuber-crops`, `oilseeds`, `livestock-and-poultry`) |
| `products` | `0005_product_moderated_at_product_moderated_by_and_more` | Adds `moderation_status` (`default='active'`, indexed), `moderated_by`, `moderated_at`, `moderation_reason` (applied strictly to `farmconnect-dev-db`) |
| `products` | `0006_alter_product_farmer` | Changes `Product.farmer` `on_delete` to `PROTECT` (`sqlmigrate` is SQL no-op; dev DB only) |
| `orders` | `0001_initial`, `0002_initial`, `0003_initial` | Creates `Order` and `OrderItem` |
| `orders` | `0004_order_phone_orderitem_status_cart_cartitem` | Adds `Order.phone`, `OrderItem.status`, `Cart`, and `CartItem` |
| `orders` | `0005_alter_order_customer_alter_orderitem_product` | Changes `Order.customer` & `OrderItem.product` `on_delete` to `PROTECT` (`sqlmigrate` is SQL no-op; dev DB only) |
| `payments` | `0001_initial` | Creates `Payment` |
| `reviews` | `0001_initial` | Creates `PlatformTestimonial` and `ProductReview` with uniqueness constraints |
| `reviews` | `0002_alter_productreview_customer_and_more` | Changes `ProductReview.customer` & `ProductReview.product` `on_delete` to `PROTECT` (`sqlmigrate` is SQL no-op; dev DB only) |

Current status: `makemigrations --check --dry-run` reports **No changes detected**.

---

## 2. Schema Versioning & Development Procedure

1. Modify models in `backend/<app>/models.py`.
2. Generate migrations inside `dev-backend`:
   ```bash
   docker compose -p farmconnect-dev --env-file ./backend/.env.development -f docker-compose.dev.yaml run --rm --no-deps dev-backend python manage.py makemigrations
   ```
3. Inspect the generated migration file for destructive operations (`RemoveField`, `DeleteModel`, non-nullable fields without defaults).
4. Apply and test against `dev-database`:
   ```bash
   docker compose -p farmconnect-dev --env-file ./backend/.env.development -f docker-compose.dev.yaml run --rm --no-deps dev-backend python manage.py migrate
   docker compose -p farmconnect-dev --env-file ./backend/.env.development -f docker-compose.dev.yaml run --rm --no-deps dev-backend python manage.py test
   ```

---

## 3. Production Migration Approval & Rollback Precautions

- **Approval Required**: Never run `migrate` against `farmconnect-db` (`docker-compose.yaml`) without explicit user approval.
- **Backward Compatibility**: Prefer additive/nullable columns first when deploying across running containers; avoid dropping columns still referenced by running code.
- **Pre-Migration Backup**: Take a `pg_dump` backup of `farmconnect-db` before any destructive or data-altering production migration.
- **Rollback**: Use `python manage.py migrate <app> <previous_migration_name>` only if the migration is reversible; restore from `pg_dump` if data was transformed irreversibly.
- **Never** run `docker compose down -v` or delete `postgres_data`.

