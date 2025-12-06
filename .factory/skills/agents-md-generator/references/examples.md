# AGENTS.md Examples

Complete examples for different project types. Use these as starting points, adapting to your specific codebase.

## Table of Contents

1. [Node.js + React Monorepo](#nodejs--react-monorepo)
2. [Python Microservice](#python-microservice)
3. [Full-Stack Application](#full-stack-application)
4. [Minimal Example](#minimal-example)

---

## Node.js + React Monorepo

```markdown
# MyApp

Monorepo with React frontend and Express API backend.

## Core Commands

• Type-check and lint: `pnpm check`
• Auto-fix style: `pnpm check:fix`
• Run full test suite: `pnpm test --run --no-color`
• Run single test file: `pnpm test --run <path>.test.ts`
• Start dev servers: `pnpm dev`
• Build for production: `pnpm build`

## Project Layout

├─ apps/web/     → React + Vite frontend
├─ apps/api/     → Express backend
├─ packages/ui/  → Shared component library
├─ packages/db/  → Database client and schemas

Frontend code lives only in `apps/web/`. Backend code lives only in `apps/api/`.

## Workspace Navigation

• Jump to a package: `pnpm dlx turbo run where <package_name>`
• Add dependency to workspace: `pnpm install --filter <package_name> <dep>`
• Check the `name` field in each package's `package.json` for the correct name

## Verification

Before committing: `pnpm check && pnpm test`

## Additional Context

- Database schema: see `packages/db/schema.prisma`
- API patterns: see `docs/api-patterns.md`
```

---

## Python Microservice

```markdown
# user-service

FastAPI microservice for user management.

## Core Commands

• Install dependencies: `pip install -e .`
• Run tests: `pytest`
• Run with coverage: `pytest --cov=app`
• Start dev server: `uvicorn app.main:app --reload`
• Type check: `mypy app/`

## Project Layout

├─ app/
│  ├─ main.py      → FastAPI application entry
│  ├─ routers/     → API route handlers
│  ├─ models/      → Pydantic models
│  └─ services/    → Business logic
├─ tests/          → Pytest tests
└─ alembic/        → Database migrations

## Key Patterns

• Config via Pydantic settings in `app/config.py`
• Celery tasks live in `app/tasks/`
• All API responses use models from `app/models/responses.py`

## Verification

Tests must pass: `pytest`
Types must check: `mypy app/`
```

---

## Full-Stack Application

```markdown
# TaskTracker

Full-stack task management app with Next.js frontend and GraphQL API.

## Core Commands

• Install: `npm install`
• Dev mode: `npm run dev` (starts both frontend and API)
• Test all: `npm test -- --runInBand`
• Build: `npm run build`
• Lint: `npm run lint`

## Project Layout

├─ src/
│  ├─ pages/       → Next.js pages and API routes
│  ├─ components/  → React components
│  ├─ graphql/     → GraphQL schema and resolvers
│  └─ lib/         → Shared utilities
├─ prisma/         → Database schema and migrations
└─ tests/          → Jest tests

## External Services

• Database: PostgreSQL (connection in `DATABASE_URL`)
• Auth: NextAuth.js with GitHub provider
• Storage: S3 for file uploads (`AWS_BUCKET`)

## Git Workflow

1. Branch from `main`: `feature/<slug>` or `fix/<slug>`
2. Run `npm run lint && npm test` before committing
3. PR requires passing CI and one approval

## Gotchas

• Test snapshot paths are absolute—run `npm test -- -u` after refactors
• GraphQL schema changes require `npm run codegen`
```

---

## Minimal Example

For simple projects, AGENTS.md can be very short:

```markdown
# my-cli-tool

CLI tool for processing log files.

## Commands

• Test: `cargo test`
• Build: `cargo build --release`
• Run: `cargo run -- <input-file>`

## Layout

• `src/main.rs` → Entry point and CLI parsing
• `src/parser.rs` → Log parsing logic
• `src/output.rs` → Report generation
```

---

## Anti-Patterns to Avoid

**Too long (>300 lines):** Split into AGENTS.md + referenced docs.

**Too prescriptive:**
```markdown
# BAD: Over-specified style rules
• Always use 2-space indentation
• Use single quotes for strings
• Add trailing commas
• Maximum line length 100 characters
```

Use a linter config file instead.

**Task-specific instructions:**
```markdown
# BAD: One-off task instructions
When adding a new database table:
1. Create migration with `prisma migrate dev`
2. Update the schema file
3. Run `prisma generate`
4. Add model to `src/models/index.ts`
```

Put this in `docs/adding-tables.md` and reference it.

**Explaining the obvious:**
```markdown
# BAD: Things Claude already knows
React components are functions that return JSX.
Use `useState` for local state management.
TypeScript provides static type checking.
```

Only include non-obvious, codebase-specific information.
