# AGENTS.md

This project is an **AI-first modular monolith**. Optimize changes for clear boundaries, small context, and repeatable patterns.

For full architecture details, read `docs/ARCHITECTURE.md`. This file is the short operating guide for AI coding agents.

---

## Layer Responsibilities

```text
app/        Next.js routes, pages, layouts, server actions, UI composition
use-cases/  cross-module workflows
modules/    isolated domain modules
shared/     domain-agnostic infrastructure
```

Allowed direction is top-down only:

```text
app -> use-cases -> modules -> shared
app -> modules    // allowed only for single-module usage
```

---

## Placement Rules

Before adding code, decide where it belongs:

- **Route, form binding, page/layout, server action** → `app/`
- **One domain module only** → `modules/<module>/internal/actions/`
- **Two or more modules synchronously composed** → `use-cases/`
- **Fire-and-forget side effect** → module emits event, another module listens
- **Domain-agnostic infrastructure** → `shared/`

Do not add code to `shared/` just because it is reused. If it has domain meaning, keep it in the owning module.

---

## Import Rules

### Inside `modules/*`

- Must not import another module.
- Must not import `app/`, `use-cases/`, or `scenarios/`.
- May import only:
  - its own `internal/**`
  - `shared/**`
  - external packages

### Outside modules

- Never import from `modules/*/internal/**`.
- Use only `modules/<module>/index.ts` public APIs.

### Inside `use-cases/`

- May import module public APIs and `shared/**`.
- Must not import another use-case.
- Must not contain UI, routing, form parsing, or direct DB access.

### Inside `app/`

- May compose UI and bind route/server-action inputs.
- May call a module directly only if the flow uses one module.
- If business logic uses two or more modules, move it to `use-cases/`.

### Inside `shared/`

- Must not import `app/`, `use-cases/`, `modules/`, or `scenarios/`.
- Must not contain domain types such as `Order`, `User`, `Payment`, etc.

---

## Module Public API Rules

Each module exposes intentional APIs through:

```text
modules/<module>/index.ts
```

Do not export:

- repositories
- internal helpers
- private mappers
- implementation details

Export only what external callers actually need.

### Domain UI Exports

Domain UI components may be exported from `modules/<module>/index.ts` when they represent that module's capability, such as `OrderList` or `UserBadge`.

Keep them in the owning module, not `shared/ui`, if they contain domain meaning.

Move UI exports to `modules/<module>/ui.ts` only when:

- the module public API becomes too crowded,
- client/server component boundaries become unclear,
- many callers need UI-only imports without domain actions.

`shared/ui` is only for domain-agnostic components such as `Button`, `Modal`, `TextField`, or `Spinner`.

---

## Event Rules

- Modules may call `emit()`.
- Event listeners belong to the module that owns the side effect.
- Modules should not call `flushOutbox()`.
- Prefer `runWithOutbox()` at application/use-case boundary for workflows that emit events.
- Direct `flushOutbox()` calls are reserved for low-level event scenarios or tests.
- Prefer explicit listener registration over side-effect-only imports when refactoring.

---

## Naming and File Rules

Prefer intention-revealing names:

- `create-order.ts`
- `cancel-order.ts`
- `submitOrderForm.ts`
- `createOrderForKnownUser.ts`

Avoid vague dumping-ground names:

- `utils.ts`
- `helpers.ts`
- `common.ts`
- `service.ts` unless it has a precise, established role

Avoid generic shared files:

- `shared/utils.ts`
- `shared/helpers.ts`
- `shared/types.ts`
- `shared/constants.ts`

Prefer named infrastructure folders:

- `shared/events/`
- `shared/db/`
- `shared/logger/`
- `shared/ui/`

---

## Change Discipline

When implementing a feature:

1. Identify whether it is single-module or cross-module.
2. Change the smallest reasonable set of files.
3. Follow existing file and naming patterns.
4. Update module `index.ts` only when a public API is truly needed.
5. Do not bypass architecture rules to make code compile.
6. Run validation before finishing.

---

## Validation

After code changes, run:

```bash
npm run check
```

This runs:

```text
typecheck -> lint -> module verification
```

For behavior changes, also run the relevant scenario:

```bash
npm run scenario:order
npm run scenario:failure
```
