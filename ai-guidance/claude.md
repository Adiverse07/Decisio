# Claude — Project Context

You are assisting with **Decisio**, an internal decision-tracking tool for engineering teams. Read this file before making any changes.

## What This System Does

Decisio lets teams record, discuss, and finalize technical decisions. It replaces scattered Slack threads, meeting notes, and forgotten email chains with a structured workflow: Draft → Proposed → Decided → (optionally) Superseded.

Every decision has options with pros/cons, tags for categorization, and an immutable audit trail.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12, Flask 3.1, PostgreSQL 18 |
| ORM | SQLAlchemy 3.1.1, Flask-Migrate 4.1 |
| Validation | Marshmallow 3.25 |
| Auth | PyJWT (HS256, 24h expiry), Flask-Bcrypt |
| Frontend | Next.js 16, React 19, TypeScript 5.7 |
| Styling | Tailwind CSS v4, Radix UI / ShadCN |
| Testing | pytest 9.0 (36 integration tests) |

## Project Layout

```
backend/
  app.py              # Flask factory, error handlers, blueprint registration
  config.py           # Dev/Test/Prod configs, env var driven
  extensions.py       # db, migrate, bcrypt — initialized without app
  models/             # 6 SQLAlchemy models
  schemas/            # Marshmallow request validation
  services/           # Business logic (never called from outside routes)
  routes/             # 6 Flask blueprints (thin handlers)
  middleware/         # @require_login, @require_admin
  tests/              # pytest suite, conftest.py fixtures
  utils/              # Logger, error helpers

frontend/
  app/                # Next.js entry (layout.tsx, page.tsx)
  components/pages/   # Page-level components
  components/ui/      # Reusable ShadCN primitives
  lib/api.ts          # API client singleton
  lib/auth-context.tsx
  lib/data-context.tsx
  lib/types.ts        # TypeScript interfaces matching API shapes
```

## Business Rules You Must Not Break

1. **Status transitions are forward-only.** Draft → Proposed → Decided → Superseded. No skipping, no reversing. This is enforced in `decision_service.py` via the `STATUS_TRANSITIONS` dict and at the DB level via CHECK constraints.

2. **Decided decisions are immutable.** Once status is "Decided", no field can be changed. The only way forward is supersede, which creates a new Draft and links back to the old one.

3. **Supersede creates a linked pair.** The old decision gets status "Superseded" and a `superseded_by` FK pointing to the new one. A CHECK constraint ensures `superseded_by` can only be set when status is "Superseded". A partial unique index prevents double-superseding.

4. **Audit trail is append-only.** Every create, edit, status change, supersede, and delete writes an `AuditLog` row. Never update or delete audit entries.

5. **Soft delete, not hard delete.** `is_deleted` flag hides a decision from all views. The data stays for audit purposes. Only admins can delete.

6. **Backend is the source of truth.** The frontend is never trusted for authorization or business rules. All validation happens server-side through Marshmallow schemas and service-layer checks.

## Patterns to Follow

- **Services return tuples:** `(result, None)` on success, `(None, "error message")` on failure. Routes inspect the error to pick the HTTP status code.
- **Routes are thin:** validate input → call service → return JSON. No business logic in route handlers.
- **Schemas validate everything:** Marshmallow schemas reject unknown fields by default. If you add a field to an API endpoint, add it to the schema first.
- **One decorator per route:** `@require_login` for authenticated routes, `@require_admin` for admin-only. The admin decorator chains login internally.
- **Frontend mutations go through DataContext:** components never call `api.*` directly for writes. They call `useData()` methods which handle the API call + state refresh.

## Before Committing Any Change

- Run `python -m pytest -v` from `backend/` — all 36 tests must pass.
- Run `npx tsc --noEmit` from `frontend/` — no type errors.
- If you changed a service function, check that the corresponding route and test still match.
- If you added a new API field, update the Marshmallow schema, the TypeScript interface in `types.ts`, and the API client in `api.ts`.
