# Prompting Rules

How context is structured and provided to AI assistants working on Decisio.

## Context-First Prompting

Every prompt to an AI assistant begins with context about the current state of the codebase. Don't assume the assistant remembers previous sessions.

### Minimum context per prompt
- Which layer you're working in (model / service / route / frontend component)
- The current file and its purpose
- What the expected behavior should be, not just how to implement it

### Example — good prompt
> The `supersede_decision` service in `decision_service.py` creates a new decision and links it to the original. The route accepts a POST to `/api/decisions/<id>/supersede`. Currently the frontend sends `{ reason }` but the schema (`SupersedeDecisionSchema`) requires `title` and `context`. Update the schema to also accept an optional `reason` field with `load_default=""`.

### Example — bad prompt
> Fix the supersede endpoint, it returns 400.

The good prompt names the file, the function, the exact field mismatch, and the expected fix. The bad prompt forces the assistant to guess.

## Rule: One Concern Per Prompt

Each prompt should address one logical change. Combining unrelated changes in one prompt leads to partial implementations.

- **One concern:** "Add soft-delete to the Decision model with an `is_deleted` boolean, default `False`, and filter it out in `get_all_decisions`."
- **Mixed concerns:** "Add soft-delete and also change the dashboard chart colors and fix the login redirect."

If multiple changes are needed, sequence them. Let the first change land and verify before starting the next.

## Rule: Reference the Pattern

When asking for new code, point the assistant to an existing example to follow.

> "Add a `DELETE /api/decisions/<id>` route. Follow the same pattern as the `PATCH /api/decisions/<id>/status` route in `decision_routes.py` — use `@require_admin`, call a service function, return the result or error with proper status codes."

This avoids style drift and keeps the codebase consistent.

## Rule: Specify Constraints Up Front

State what must not happen before asking for what should happen.

> "Add an `expected_outcome` optional field to the Decision model. Do NOT change existing migrations, do NOT modify the status transition logic, and do NOT remove the CHECK constraints."

## Rule: Ask for Verification

End prompts with a verification step when the change is testable.

> "After making the change, run `pytest tests/test_decisions.py -v` and confirm all tests pass."

This closes the loop and catches regressions immediately.

## Template

```
Context: [file, function, current behavior]
Goal: [what the change should accomplish]
Constraints: [what must not change]
Pattern: [existing code to follow]
Verify: [how to confirm success]
```
