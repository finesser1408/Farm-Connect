# AGENTS.md — FarmConnect Engineering & Agent Instructions

Welcome to **FarmConnect**. Every AI coding agent and human contributor must follow these rules before inspecting, modifying, or testing this repository.

## 1. Mandatory Startup Sequence

1. **Read this file (`AGENTS.md`) first.**
2. **Read the project memory and current handover**:
   - [docs/05-project-memory/PROJECT_MEMORY.md](docs/05-project-memory/PROJECT_MEMORY.md)
   - [docs/06-progress/HANDOVER.md](docs/06-progress/HANDOVER.md)
3. **Review relevant product, architecture, and database documents**:
   - Documentation index: [docs/README.md](docs/README.md)
   - Product management: [docs/01-product-management/PRODUCT_MANAGEMENT.md](docs/01-product-management/PRODUCT_MANAGEMENT.md)
   - Product development: [docs/02-product-development/PRODUCT_DEVELOPMENT.md](docs/02-product-development/PRODUCT_DEVELOPMENT.md)
   - System architecture: [docs/03-architecture/SYSTEM_ARCHITECTURE.md](docs/03-architecture/SYSTEM_ARCHITECTURE.md)
   - Architecture decisions (ADRs): [docs/03-architecture/ARCHITECTURE_DECISIONS.md](docs/03-architecture/ARCHITECTURE_DECISIONS.md)
   - Database design: [docs/04-database/DATABASE_DESIGN.md](docs/04-database/DATABASE_DESIGN.md)
   - Database migrations: [docs/04-database/DATABASE_MIGRATIONS.md](docs/04-database/DATABASE_MIGRATIONS.md)
4. **Inspect the actual code** before making changes. Documentation must never override actual source files, test results, or explicit user instructions.

## 2. Critical Preservation & Safety Rules

5. **Preserve Gmail SMTP development settings and all private environment files**:
   - Never modify, overwrite, or commit `.env`, `backend/.env`, or `backend/.env.development`.
   - Preserve the isolated development email configuration (`PASSWORD_RESET_EMAIL_PROVIDER=django` with Gmail SMTP when `DEBUG=True`) and production email configuration (`resend` when `DEBUG=False`).
6. **Never expose secrets**:
   - Never print, log, or paste passwords, JWT secrets, database credentials, SMTP app passwords, or API keys (`RESEND_API_KEY`) into code, tests, logs, or documentation.
7. **Never modify production infrastructure without explicit user approval**:
   - Do not rebuild or restart production containers (`docker-compose.yaml`: `farmconnect-backend`, `farmconnect-frontend`, `farmconnect-nginx`, `farmconnect-db`).
   - Do not reset databases, remove Docker volumes (`postgres_data`, `media_data`, `farmconnect_dev_postgres_data`, `farmconnect_dev_media`), or apply migrations to production without approval.
   - Do not modify CloudPanel or host reverse-proxy configuration.

## 3. Verification, Issue Tracking & Handover

8. **Run appropriate tests** before finishing any code change:
   - Frontend: `PATH="/home/farm-connect/.nvm/versions/node/v22.23.4/bin:$PATH" bash -c "cd frontend && npm test && npm run build"` (Vitest requires Node 22+; default system Node 18 hits `ERR_REQUIRE_ESM`).
   - Backend: `docker compose -p farmconnect-dev --env-file ./backend/.env.development -f docker-compose.dev.yaml run --rm --no-deps dev-backend python manage.py test`.
9. **Record issues and verified solutions** in [docs/07-issues/ISSUE_RESOLUTION_LOG.md](docs/07-issues/ISSUE_RESOLUTION_LOG.md). Search the log before debugging recurring errors.
10. **Update the progress tracker and handover** at the end of every development session:
    - [docs/06-progress/PROGRESS_TRACKER.md](docs/06-progress/PROGRESS_TRACKER.md)
    - [docs/06-progress/HANDOVER.md](docs/06-progress/HANDOVER.md)
    - [docs/05-project-memory/DECISION_LOG.md](docs/05-project-memory/DECISION_LOG.md) (for new non-trivial decisions)

