# Refinery

Note-taking system implementing evolutionary epistemology (Popper/Deutsch)—knowledge grows through conjecture and refutation. Notes are conjectures facing selection pressure via conflict detection, AI criticism, and semantic surfacing.

## Core Commands

- Dev server: `npm run dev` (Turbopack, localhost:3000)
- Background jobs: `npm run dev:inngest` (required for embeddings/purge)
- Build: `npm run build` — must pass
- Lint: `npm run lint` — must pass
- Test: `npm run test` — must pass

## Operating Rules

- IMPORTANT: Always use `ref` MCP to check docs before writing code for: Tiptap, Vercel AI SDK, Inngest and React Flow
- Must write tests for new functionality (tests go in `tests/` directory, not colocated)
- Use TypeScript strict mode

## Tech Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Database/Auth**: Supabase (PostgreSQL + pgvector + RLS)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Zustand (client) + TanStack Query v5 (server)
- **AI**: Vercel AI SDK 5.0 + OpenRouter
- **Background Jobs**: Inngest
- **Validation**: Zod
- **Editor**: Tiptap + tiptap-markdown
- **Graph**: React Flow (@xyflow/react)
- **Testing**: Vitest, React Testing Library, Playwright

## Project Layout

```
app/                    # Next.js App Router (routes only)
  (auth)/               # Public: /login, /sign-up, /forgot-password
  (dashboard)/          # Protected: /notes, /conflicts, /graph, /trash
  (admin)/              # Admin: /admin
  api/                  # API routes (auth callbacks, inngest webhook)
features/               # Feature modules (domain logic)
  [domain]/actions/     # Server actions
  [domain]/components/  # Domain-specific UI
  [domain]/hooks/       # TanStack Query hooks
  [domain]/types.ts     # TypeScript interfaces
components/             # Shared components
  ui/                   # shadcn/ui — Do NOT modify
  editor/               # Tiptap editor components
  layout/               # App shell, sidebar, header
lib/
  supabase/             # Supabase clients (server.ts, client.ts)
  inngest/              # Background job client + functions
  local-db/             # IndexedDB cache + sync queue
  embedding/            # Content hashing, chunking, mean pooling
  db/validation/        # Zod schemas for DB entities
config/                 # Site config, navigation definitions
hooks/                  # Shared hooks (debounce, beforeunload)
stores/                 # Zustand stores
tests/                  # Mirrors feature structure
types/database.types.ts # Generated Supabase types
```

Path alias: `@/*` → project root

## Critical Patterns

### Supabase Client

Server vs client usage differs critically:
- `lib/supabase/server.ts` — MUST await, create fresh per request
- `lib/supabase/client.ts` — NO await, can reuse

### State Management

- **TanStack Query**: Query key factories in `features/[domain]/hooks/`, optimistic updates with rollback

- **Zustand**: Stores in `stores/` with `persist` middleware, use `useShallow` for action selectors

### Local-First Sync

Notes use IndexedDB for offline support and optimistic UI:
- `lib/local-db/index.ts` — IndexedDB schema (notes, syncQueue, idMappings)
- `lib/local-db/note-cache.ts` — local note storage + ID mapping persistence
- `lib/local-db/sync-queue.ts` — background sync to Supabase
- Pattern: save locally first → queue sync → update on success
- Temp→server ID mappings persist in IndexedDB for cross-session reliability

### Embeddings

Notes are chunked (2000 chars, 200 overlap) and stored in `note_chunks`:
- `features/notes/actions/trigger-embedding.ts` — computes hash, sends Inngest event
- `lib/inngest/functions/generate-embedding.ts` — hash-guarded chunked embedding
- `lib/inngest/functions/reconcile-embeddings.ts` — 5-min cron for stale recovery
- `lib/embedding/` — chunker, content-hash, mean pooling utilities

Idempotency: content hash guards all writes. Notes track `embedding_status` ('pending'→'processing'→'completed'|'failed'). RPCs use chunk-level search for full semantic coverage.

### Component Placement

- Feature-specific → `features/[domain]/components/`
- Shared/reusable → `components/`
- shadcn/ui → `components/ui/` (never edit)
- Use `cn()` from `@/lib/utils` for conditional classes

## Database

**Tables** (all RLS-enabled): `profiles`, `notes`, `note_chunks`, `conflicts`, `note_links`

**Key RPCs**: `hybrid_search`, `get_related_notes`, `get_backlinks`, `find_potential_conflicts`, `get_unresolved_conflict_count`, `get_all_tags`, `get_notes_by_tags`

## AI Integration

- Vercel AI SDK with `@openrouter/ai-sdk-provider`
- AI actions go in `features/[domain]/` as server actions
- Embeddings: Chunked with mean pooling via `text-embedding-3-small` (1536 dims)
- Background processing via Inngest client in `lib/inngest/client.ts`

## Additional Context

- Product vision: `PRD.md`
- Data model: `DATA-MODEL.md`
- Database migrations: `supabase/migrations/`
- Full schema: `types/database.types.ts`
- Editor: `components/editor/markdown-editor.tsx`
- Note editor (local-first): `features/notes/components/note-editor.tsx`