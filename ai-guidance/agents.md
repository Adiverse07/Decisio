# Agents — Delegation Rules

Guidelines for when and how AI agents interact with this codebase.

## Scope of Automation

AI agents (Claude, Copilot, etc.) are used as a productivity tool, not as an autonomous developer. Every generated change is reviewed before it reaches the codebase.

### What agents CAN do
- Generate boilerplate (new model, schema, route following existing patterns)
- Write test cases based on existing test structure
- Propose refactors with explanations
- Search for usages and dependencies before making changes
- Explain code behavior when asked

### What agents MUST NOT do
- Modify business rules (status transitions, immutability, audit logging) without explicit instruction
- Skip validation — if a new field is added to an API, the schema must be updated in the same change
- Introduce new dependencies without justification
- Generate UI that doesn't match existing patterns (Tailwind classes, ShadCN components, modal structure)
- Hard-delete any data — all deletes are soft deletes

## Change Protocol

1. **Read before writing.** Before modifying any file, read the existing implementation and at least one related file (e.g., read the route before changing the service, read the test before changing the route).

2. **Follow existing patterns.** If the codebase uses `(result, None)` / `(None, error)` tuples, new code uses the same pattern. If routes use `@require_login`, new routes use the same decorator.

3. **Test coverage is mandatory.** Any new backend endpoint must have at least one happy-path test and one failure-path test. Run the full suite after changes.

4. **Frontend changes need type safety.** If a backend response shape changes, update `lib/types.ts` and `lib/api.ts` before touching components.

## Multi-File Changes

When a change spans multiple files (common in this codebase), apply them in this order:

1. **Model** — add/change the database column or constraint
2. **Schema** — update the Marshmallow validation
3. **Service** — add/change the business logic
4. **Route** — expose the new functionality
5. **API client** — add the frontend method
6. **Data context** — wire it into the React state layer
7. **Component** — update the UI
8. **Test** — verify the change

Skipping a step causes errors. The full chain must be consistent.

## Error Handling

- Never swallow exceptions silently
- Backend errors return `{"error": "message"}` with an appropriate HTTP status
- Frontend catches `ApiError` and shows toast notifications
- If you're unsure what error code to use, check how similar routes handle errors

## Review Checklist

Before accepting any AI-generated change:

- [ ] Does it follow the existing patterns in the file it modifies?
- [ ] Are all related files updated (schema, type, API client)?
- [ ] Does `pytest -v` still pass with all tests green?
- [ ] Does `tsc --noEmit` pass with no type errors?
- [ ] Is the change minimal — does it touch only what's necessary?
