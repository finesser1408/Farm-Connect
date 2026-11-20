# Database Migrations — FarmConnect

## 1. Existing Django Migration History (Verified)

| App | Migration | Purpose |
| :--- | :--- | :--- |
| `users` | `0001_initial` | Creates `User`, `FarmerProfile`, `CustomerProfile` (including `FarmerProfile.location`) |
| `users` | `0002_alter_user_user_type` | Updates `User.user_type` choices |
| `users` | `0003_rename_bio_farmerprofile_description` | Renames `FarmerProfile.bio` -> `description` |
| `users` | `0004_alter_user_managers` | Sets `FarmConnectUserManager` (`use_in_migrations = False`) |
| `products` | `0001_initial` | Creates `Category` and `Product` |
| `products` | `0002_initial` | Links `Product.farmer` FK to `users.User` |
| `products` | `0003_alter_product_image_alter_product_stock` | Alters `Product.image` and `Product.stock` |
| `products` | `0004_seed_approved_categories` | Data migration seeding the 7 approved categories (`vegetables`, `fruits`, `grains-and-cereals`, `legumes-and-pulses`, `root-and-tuber-crops`, `oilseeds`, `livestock-and-poultry`) |
| `orders` | `0001_initial`, `0002_initial`, `0003_initial` | Creates `Order` and `OrderItem` |
| `orders` | `0004_order_phone_orderitem_status_cart_cartitem` | Adds `Order.phone`, `OrderItem.status`, `Cart`, and `CartItem` |
| `payments` | `0001_initial` | Creates `Payment` |

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

