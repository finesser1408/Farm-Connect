# FarmConnect Documentation Index

This directory contains the permanent architecture, product, database, memory, progress, and issue-tracking documentation for **FarmConnect**.

> **Start here**: Read [AGENTS.md](../AGENTS.md) first, then [PROJECT_MEMORY.md](05-project-memory/PROJECT_MEMORY.md) and [HANDOVER.md](06-progress/HANDOVER.md).

## Directory Structure

| Folder | Document | Purpose |
| :--- | :--- | :--- |
| Root | [AGENTS.md](../AGENTS.md) | Mandatory agent startup sequence, safety rules, and test commands |
| `01-product-management` | [PRODUCT_MANAGEMENT.md](01-product-management/PRODUCT_MANAGEMENT.md) | Vision, users, roles, existing/planned features, requirements, roadmap |
| `02-product-development` | [PRODUCT_DEVELOPMENT.md](02-product-development/PRODUCT_DEVELOPMENT.md) | Tech stack, frontend/backend structure, API endpoints, testing, deployment |
| `03-architecture` | [SYSTEM_ARCHITECTURE.md](03-architecture/SYSTEM_ARCHITECTURE.md) | System context, Mermaid architecture, workflows, security, scalability |
| `03-architecture` | [ARCHITECTURE_DECISIONS.md](03-architecture/ARCHITECTURE_DECISIONS.md) | Architecture Decision Records (ADRs) |
| `04-database` | [DATABASE_DESIGN.md](04-database/DATABASE_DESIGN.md) | PostgreSQL schema, ERD, columns, constraints, indexes, consistency |
| `04-database` | [DATABASE_MIGRATIONS.md](04-database/DATABASE_MIGRATIONS.md) | Migration history, dev/prod migration procedures, rollback precautions |
| `05-project-memory` | [PROJECT_MEMORY.md](05-project-memory/PROJECT_MEMORY.md) | Environment separation, preservation rules, domain & feature memory |
| `05-project-memory` | [DECISION_LOG.md](05-project-memory/DECISION_LOG.md) | Chronological project & product decisions |
| `06-progress` | [PROGRESS_TRACKER.md](06-progress/PROGRESS_TRACKER.md) | Feature/task status table with verification evidence |
| `06-progress` | [HANDOVER.md](06-progress/HANDOVER.md) | Current verified state, branch status, recent work, next steps |
| `07-issues` | [ISSUE_RESOLUTION_LOG.md](07-issues/ISSUE_RESOLUTION_LOG.md) | Reusable incident template and resolved issue history |

## Existing Repository Documentation

- [README.md](../README.md) — Original project overview and quick-start guide (note: some sections still reference the earlier "Farm Fresh Hub" name and SQLite dev setup; current Docker setups use PostgreSQL).
- [backend/README_EMAIL_SETUP.md](../backend/README_EMAIL_SETUP.md) — Email setup notes for backend notifications.

