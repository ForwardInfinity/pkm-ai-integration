# Refinery

Note-taking system implementing evolutionary epistemology (Popper/Deutsch)—knowledge grows through conjecture and refutation. Notes are conjectures facing selection pressure via conflict detection, AI criticism, and semantic surfacing.

## Core Commands

```bash
npm run dev          # Dev server with Turbopack (localhost:3000)
npm run dev:inngest  # Background job dev server
npm run build        # Production build — must pass 
npm run lint         # ESLint — must pass
npm run test         # Vitest — must pass
```

## Operating Rules
- CRITICAL: MUST take time to fully break down and analyze problems before attempting to solve them. Deeply understanding the problem is non-negotiable. Your thinking should be thorough and deep, so it's fine if it's very long
- MUST read and understand the codebase for relevant files before any planning or doing any task
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
features/               # Feature modules (domain logic)
  [domain]/actions/     # Server actions
  [domain]/components/  # Domain-specific UI
  [domain]/hooks/       # TanStack Query hooks
  [domain]/types.ts     # TypeScript interfaces
components/             # Shared components
  ui/                   # shadcn/ui — Do NOT modify
lib/
  supabase/             # Supabase clients (server.ts, client.ts)
  inngest/              # Background job client
  local-db/             # IndexedDB cache + sync queue
stores/                 # Zustand stores
tests/                  # Testing
types/database.types.ts # Generated Supabase types
```

Path alias: `@/*` → project root

## Critical Patterns

### Supabase Client

```typescript
// Server Components/Actions: MUST await, create fresh per request
const supabase = await createClient() // from @/lib/supabase/server

// Client Components: NO await
const supabase = createClient() // from @/lib/supabase/client
```

See `lib/supabase/server.ts` and `lib/supabase/client.ts` for implementations.

### State Management

**TanStack Query** (server state):
- Query key factories in `features/[domain]/hooks/` (e.g., `noteKeys.detail(id)`)
- Optimistic updates with rollback — see `features/notes/hooks/use-note-mutations.ts`
- QueryClient setup in `app/providers.tsx`

**Zustand** (client state):
- Stores in `stores/` with `persist` middleware for localStorage
- Use `useShallow` for action selectors to prevent unnecessary rerenders
- Example: `stores/tabs-store.ts`

### Local-First Sync

Notes use IndexedDB for offline support and optimistic UI:
- `lib/local-db/note-cache.ts` — local note storage
- `lib/local-db/sync-queue.ts` — background sync to Supabase
- Pattern: save locally first → queue sync → update on success

### Component Placement

- Feature-specific → `features/[domain]/components/`
- Shared/reusable → `components/`
- shadcn/ui → `components/ui/` (never edit)
- Use `cn()` from `@/lib/utils` for conditional classes

## Database

**Tables** (all RLS-enabled): `profiles`, `notes`, `conflicts`, `note_links`

**Key RPCs**:
- `search_notes` — semantic search via embeddings
- `get_related_notes` — find similar notes
- `get_backlinks` — notes linking to target
- `find_potential_conflicts` — conflict detection
- `get_unresolved_conflict_count` — sidebar badge

See `types/database.types.ts` for full schema and `supabase/migrations/` for SQL.

## AI Integration

- Use Vercel AI SDK (`ai` package) with `@openrouter/ai-sdk-provider`
- AI actions go in `features/[domain]/` as server actions
- Embeddings: OpenAI text-embedding-3-small (1536 dimensions)
- Background processing via Inngest client in `lib/inngest/client.ts`

## Additional Context

- Product vision: `PRD.md`
- Data model: `DATA-MODEL.md`
- Database migrations: `supabase/migrations/`
- Editor implementation: `components/editor/markdown-editor.tsx`
- Note editor with local-first: `features/notes/components/note-editor.tsx`