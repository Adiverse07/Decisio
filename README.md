# Decisio

A lightweight architectural decision-tracking system for engineering teams. Teams use Decisio to record decisions, link them to projects, move them through a controlled lifecycle, and maintain a complete audit trail of every change.

The goal is a small, well-structured system — not a feature-rich one. Every layer validates its own boundaries, business rules are enforced in both application code and database constraints, and every state change is logged.

---

## 🛠 Tech Stack

| Layer     | Technology                                      |
|-----------|------------------------------------------------|
| Backend   | Python 3.12, Flask 3.1, SQLAlchemy 3.1, Marshmallow 3.25 |
| Frontend  | Next.js 16, React 19, TypeScript 5.7, Tailwind CSS v4 |
| Database  | PostgreSQL 18                                   |
| Auth      | JWT (PyJWT, HS256, 24h expiry) + Flask-Bcrypt   |
| UI Kit    | ShadCN / Radix UI, Recharts, React Hook Form + Zod |
| Testing   | pytest — 36 tests across 4 domains              |

---

## ✨ Features

### Decision Lifecycle
Every decision moves through a forward-only workflow: **Draft → Proposed → Decided → Superseded**. Backward transitions are rejected. The transition rules are defined in the Decision model and enforced in the service layer — no route or frontend logic can bypass them.

When a decided record needs to be replaced, the **supersede** action creates a new decision and links it to the original via a `superseded_by` foreign key. The original is automatically marked `Superseded`. A partial unique index ensures no two decisions can supersede the same original.

### Projects & Tagging
Decisions are grouped by project. Projects can be archived (which hides them from default listings but doesn't delete anything). Decisions can be tagged with reusable labels for cross-project filtering and search.

### Audit Trail
Every meaningful action — creation, status transition, supersede, soft-delete — writes a timestamped `AuditLog` entry recording who did what and when. Per-decision audit is visible to all authenticated users. The full system audit log is restricted to admins.

### Role-Based Access
Two roles: **Admin** and **Member**. Members can create and manage decisions. Admins can additionally approve decisions (Proposed → Decided), manage users, soft-delete decisions, and access the system-wide audit log. Authorization is enforced via middleware decorators (`@require_login`, `@require_admin`), not frontend visibility checks.

### Soft Deletes
Decisions are never hard-deleted. The `is_deleted` flag hides them from queries while preserving the full audit history and referential integrity. Deleted decisions return 404 on subsequent fetches.

---

## 📋 Prerequisites

- Python 3.12+
- Node.js 22+ with pnpm
- PostgreSQL 18

---

## 🚀 Getting Started

### 1. Clone and configure

```bash
git clone <repo-url> && cd Decisio
cp .env.example backend/.env
```

Edit `backend/.env` with your PostgreSQL credentials:

```
FLASK_ENV=development
SECRET_KEY=<random-string>
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/decisio_dev
JWT_SECRET_KEY=<random-string>
```

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
```

Create the database and apply migrations:

```bash
createdb decisio_dev
flask db upgrade
```

Seed demo data (6 users, projects, decisions with tags and options):

```bash
python seed_demo.py
```

Start the API server:

```bash
flask run
```

The API runs on `http://localhost:5000`.

### 3. Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

The UI runs on `http://localhost:3000`.

### 4. Demo Users

| Name          | Email                | Role   | Password  |
|---------------|----------------------|--------|-----------|
| Admin         | admin@decisio.local  | Admin  | admin123  |
| Eva Novak     | eva@decisio.local    | Admin  | password1 |
| Alice Chen    | alice@decisio.local  | Member | password1 |
| Bob Martinez  | bob@decisio.local    | Member | password1 |
| Carol Wright  | carol@decisio.local  | Member | password1 |
| David Kim     | david@decisio.local  | Member | password1 |

---

## 📡 API Reference

All endpoints require a valid JWT token in the `Authorization: Bearer <token>` header unless noted otherwise.

### Auth
| Method | Endpoint             | Access   | Description                  |
|--------|----------------------|----------|------------------------------|
| POST   | `/api/auth/login`    | Public   | Authenticate, receive JWT    |
| GET    | `/api/auth/me`       | Logged in | Return current user profile |
| POST   | `/api/auth/logout`   | Logged in | Client-side token discard   |

### Decisions
| Method | Endpoint                              | Access   | Description                        |
|--------|---------------------------------------|----------|------------------------------------|
| GET    | `/api/decisions`                      | Logged in | List decisions (filterable by project, status, tag) |
| GET    | `/api/decisions/:id`                  | Logged in | Get single decision with options and tags |
| POST   | `/api/decisions`                      | Logged in | Create a new decision              |
| PATCH  | `/api/decisions/:id`                  | Logged in | Update title, context, options, tags |
| PATCH  | `/api/decisions/:id/status`           | Logged in | Advance status (Proposed→Decided requires admin) |
| POST   | `/api/decisions/:id/supersede`        | Logged in | Create replacement decision        |
| DELETE | `/api/decisions/:id`                  | Admin    | Soft-delete a decision             |

### Projects
| Method | Endpoint                  | Access   | Description                        |
|--------|---------------------------|----------|------------------------------------|
| GET    | `/api/projects`           | Logged in | List projects (optional `include_archived`) |
| GET    | `/api/projects/:id`       | Logged in | Get single project                 |
| POST   | `/api/projects`           | Logged in | Create project                     |
| PATCH  | `/api/projects/:id`       | Logged in | Update project (including archive) |

### Tags
| Method | Endpoint       | Access   | Description       |
|--------|----------------|----------|-------------------|
| GET    | `/api/tags`    | Logged in | List all tags    |
| POST   | `/api/tags`    | Logged in | Create a new tag |

### Users (Admin)
| Method | Endpoint                      | Access | Description                 |
|--------|-------------------------------|--------|-----------------------------|
| GET    | `/api/users`                  | Admin  | List all users              |
| GET    | `/api/users/:id`              | Admin  | Get user details            |
| POST   | `/api/users`                  | Admin  | Create new user             |
| PATCH  | `/api/users/:id`              | Admin  | Update user profile / role  |
| PATCH  | `/api/users/:id/toggle-active`| Admin  | Activate / deactivate user  |

### Audit
| Method | Endpoint                          | Access   | Description                  |
|--------|-----------------------------------|----------|------------------------------|
| GET    | `/api/decisions/:id/audit`        | Logged in | Audit trail for one decision |
| GET    | `/api/audit`                      | Admin    | System-wide audit log        |

---

## 🧪 Testing

```bash
cd backend
createdb decisio_test    # one-time setup
pytest -v
```

36 tests across 4 domains, all independent. Each test creates its own data through fixtures and rolls back after execution. Tests use a separate `decisio_test` database.

| Domain     | Tests | Coverage                                                 |
|------------|-------|----------------------------------------------------------|
| Auth       | 8     | Login success / failure, token validation, deactivated users |
| Admin      | 5     | Role-based access, user CRUD, system audit restriction   |
| Projects   | 7     | CRUD, duplicate names, archiving, unauthorized access    |
| Decisions  | 16    | CRUD, status transitions (forward-only, skip, reverse), supersede, audit logging, soft-delete (admin/non-admin/already-deleted) |

---

## 📁 Project Structure

```
Decisio/
├── backend/
│   ├── app.py              # Flask application factory
│   ├── config.py           # Dev / Test / Prod configuration
│   ├── extensions.py       # SQLAlchemy, Migrate, Bcrypt — initialized once
│   ├── models/             # 6 models: User, Project, Decision, Option, Tag, AuditLog
│   ├── schemas/            # Marshmallow input validation (one per entity)
│   ├── services/           # Business logic layer (one per domain)
│   ├── routes/             # Blueprint-based REST endpoints (one per domain)
│   ├── middleware/         # JWT authentication + admin authorization decorators
│   ├── utils/              # ApiError, helpers, structured logger
│   ├── tests/              # pytest suite — conftest.py + 4 test modules
│   └── seed_demo.py        # Realistic demo data seeder
├── frontend/
│   ├── app/                # Next.js app router (layout + entry page)
│   ├── components/
│   │   ├── pages/          # Full page components (dashboard, detail, form, admin, etc.)
│   │   └── ui/             # ShadCN / Radix primitives
│   ├── lib/
│   │   ├── api.ts          # API client singleton (typed methods, JWT attachment)
│   │   ├── types.ts        # Shared TypeScript interfaces
│   │   ├── auth-context.tsx # Auth state + JWT management
│   │   ├── data-context.tsx # Application data + CRUD operations
│   │   └── utils.ts        # cn(), formatDate, helpers
│   └── hooks/              # useMobile, useToast
├── ai-guidance/            # AI assistant configuration (5 docs)
│   ├── claude.md           # Project context for Claude
│   ├── agents.md           # Delegation rules for AI agents
│   ├── prompting-rules.md  # Structured prompting patterns
│   ├── constraints.md      # 20 hard constraints on the codebase
│   └── coding-standards.md # Naming, patterns, conventions
└── .env.example            # Environment variable template
```

---

## 🏗 Architecture

![Architecture Diagram](https://github.com/AdityaKale22420263/Testing/blob/main/hosting/better/FRONTEND%20(1).png?raw=true)

### Backend — Three-Layer Separation

```
HTTP Request
  → Route (validate input via Marshmallow, check auth via middleware)
    → Service (business logic, database operations, audit logging)
      → Model (SQLAlchemy ORM, database constraints, relationships)
```

- **Routes** are thin. They deserialize input, call a service function, and serialize the output. No business logic lives here.
- **Services** return `(result, None)` on success or `(None, "error message")` on failure. They own `db.session.commit()`. Routes never touch the session directly.
- **Models** define the schema with database-level constraints — CHECK constraints (`no_self_supersede`, `supersede_status_sync`), a partial unique index on `superseded_by`, and standard foreign keys. The database is the last line of defense if application logic is bypassed.

### Frontend — Context-Based State

```
Component
  → DataContext (global state: decisions, projects, tags, CRUD actions)
    → ApiClient (singleton, typed HTTP methods, automatic JWT header)
      → Backend API
```

- **AuthContext** manages login/logout, stores JWT in localStorage, and provides the current user to the component tree.
- **DataContext** wraps all data fetching and mutation. Components never call the API directly — they call context methods like `createDecision()` or `transitionStatus()`.
- **ApiClient** is a singleton class that attaches the JWT token, handles errors, and returns typed responses.

### Database Schema

![ER Diagram](https://github.com/AdityaKale22420263/Testing/blob/main/hosting/better/Decisio%20ER%20Diagrams.jpg?raw=true)

### Validation at Three Levels

1. **Frontend** — Zod schemas in forms prevent obviously bad input from being submitted
2. **Backend schemas** — Marshmallow validates every request body before it reaches business logic
3. **Database constraints** — CHECK constraints, NOT NULL, UNIQUE, and foreign keys reject anything that slips through

---

## 💡 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Forward-only status transitions** | Decisions follow Draft → Proposed → Decided → Superseded. The `STATUS_TRANSITIONS` dict defines allowed moves. Backward transitions are rejected in the service layer. |
| **Supersede instead of edit** | Once a decision reaches `Decided`, it becomes immutable. To change direction, you supersede it — creating a new decision linked to the original. This preserves the historical record. |
| **Soft deletes only** | The `is_deleted` boolean hides decisions from queries without breaking foreign keys or losing audit entries. Hard deletes are not available through any endpoint. |
| **Database-level constraints** | CHECK constraints enforce that a decision cannot supersede itself and that `superseded_by` can only be set when status is `Superseded`. A partial unique index prevents duplicate supersedes. These constraints protect against bugs in application code. |
| **Schema validation at the boundary** | All input is validated by Marshmallow before reaching the service layer. Services trust the output of `schema.load()` and don't re-validate field types. |
| **Audit everything** | Every status change, supersede action, and deletion writes an `AuditLog` entry with actor, action, and timestamp. Per-decision audit is visible to all users; system-wide audit is admin-only. |
| **Stateless JWT auth** | No server-side session storage. JWT tokens (HS256, 24h expiry) are issued on login and validated on every request via middleware. Logout is client-side token disposal. |
