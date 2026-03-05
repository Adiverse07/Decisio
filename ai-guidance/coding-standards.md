# Coding Standards

Conventions enforced across the Decisio codebase. These apply to both human-written and AI-generated code.

---

## Backend (Python / Flask)

### Project Organization

```
backend/
├── app.py              # Flask factory — create_app()
├── config.py           # Dev / Test / Prod config classes
├── extensions.py       # db, migrate, bcrypt — initialized once
├── models/             # SQLAlchemy models, one file per entity
├── schemas/            # Marshmallow schemas, one file per entity
├── services/           # Business logic, one file per domain
├── routes/             # Blueprint definitions, one file per domain
├── middleware/         # auth_middleware.py, admin_middleware.py
├── utils/              # errors.py, helpers.py, logger.py
└── tests/              # conftest.py + test files per domain
```

### Naming

- Files: `snake_case.py`
- Classes: `PascalCase` — `Decision`, `AuditLog`, `CreateDecisionSchema`
- Functions / variables: `snake_case` — `get_all_decisions`, `current_user`
- Constants: `UPPER_SNAKE_CASE` — `STATUS_TRANSITIONS`, `VALID_STATUSES`
- Route URLs: kebab-case where needed — `/api/decisions/<id>/status`

### Model Conventions

- Every model inherits from `db.Model`
- Primary keys are `id = db.Column(db.Integer, primary_key=True)`
- Timestamps use `db.func.now()` as server defaults
- Relationships use `db.relationship()` with explicit `back_populates`
- Constraints (CHECK, unique, foreign key) are defined in the model, not in migrations

### Service Layer

- Services accept plain dicts (from schema.load) and return `(result, None)` or `(None, error_string)`
- Services handle all database operations — routes never call `db.session` directly
- Services handle `db.session.commit()` — one commit per operation
- If an operation fails, the service returns an error message, not an exception

### Route Conventions

- Each domain has one blueprint registered in `app.py`
- Routes are thin — validate input via schema, call service, return response
- Standard response shape: `{"data": ...}` for success, `{"error": "..."}` for failure
- HTTP status codes: 200 (OK), 201 (created), 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found)

### Error Handling

- Custom `ApiError` class in `utils/errors.py` for known failures
- Global error handler in `app.py` catches `ApiError` and returns JSON
- Services never raise unhandled exceptions to routes
- All database errors are caught and wrapped with context

### Testing

- Framework: `pytest` with fixtures in `conftest.py`
- Each test file covers one domain: auth, admin, projects, decisions
- Fixtures provide `client`, `auth_header`, `admin_header`, `sample_project`, `sample_decision`
- Tests follow Arrange-Act-Assert pattern
- Test names: `test_<action>_<expected_outcome>` — `test_create_decision_success`, `test_create_decision_missing_title`

---

## Frontend (TypeScript / Next.js)

### Project Organization

```
frontend/
├── app/                # Next.js app router — layout.tsx, page.tsx
├── components/
│   ├── pages/          # Full page components, one per route
│   ├── ui/             # ShadCN / Radix primitives
│   ├── app-shell.tsx   # Layout wrapper
│   ├── app-sidebar.tsx # Navigation sidebar
│   └── decisio-app.tsx # Root app with routing
├── hooks/              # Custom React hooks
├── lib/
│   ├── api.ts          # API client singleton
│   ├── types.ts        # Shared TypeScript interfaces
│   ├── data-context.tsx    # Global state + data fetching
│   ├── auth-context.tsx    # Auth state + JWT management
│   ├── toast-context.tsx   # Toast notification helpers
│   └── utils.ts        # Utility functions (cn, formatDate)
└── styles/             # Global CSS
```

### Naming

- Files: `kebab-case.tsx` — `decision-detail-page.tsx`, `app-sidebar.tsx`
- Components: `PascalCase` — `DecisionDetailPage`, `StatusBadge`
- Hooks: `camelCase` with `use` prefix — `useMobile`, `useToast`
- Interfaces / types: `PascalCase` — `Decision`, `Project`, `ApiError`
- Context providers: `PascalCase` with `Provider` suffix — `DataProvider`, `AuthProvider`

### Component Patterns

- Page components live in `components/pages/` and are full-page layouts
- UI primitives live in `components/ui/` and are stateless where possible
- Data fetching happens through `DataContext`, not inside individual components
- Forms use React Hook Form + Zod for validation
- Modals use ShadCN `Dialog` component with controlled open state

### TypeScript

- No `any` types — use proper interfaces from `lib/types.ts`
- API responses are typed through the `ApiClient` methods
- Props interfaces are defined in the same file as the component
- Prefer `interface` over `type` for object shapes

### Styling

- Tailwind CSS v4 utility classes — no custom CSS unless absolutely necessary
- Use `cn()` utility from `lib/utils.ts` for conditional class merging
- Color tokens follow ShadCN theme variables (e.g., `bg-primary`, `text-muted-foreground`)
- Responsive design uses Tailwind breakpoints (`sm:`, `md:`, `lg:`)

### State Management

- Auth state: `AuthContext` — login, logout, current user, JWT token
- App data: `DataContext` — decisions, projects, tags, CRUD operations
- No additional state libraries — Context API covers the needs
- Local component state for UI-only concerns (modal open, form values)

### API Integration

- `ApiClient` class in `lib/api.ts` is a singleton
- All methods return typed responses or throw `ApiError`
- JWT token is attached automatically via `Authorization: Bearer` header
- Base URL comes from environment or defaults to `http://localhost:5000/api`
