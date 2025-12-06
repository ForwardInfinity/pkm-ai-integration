# Refinery

Note-taking system implementing evolutionary epistemology (Popper/Deutsch)—knowledge grows through conjecture and refutation, not accumulation. Notes are conjectures facing selection pressure through conflict detection, AI criticism, and semantic surfacing.

## Commands

- `npm run dev` — Dev server with Turbopack (http://localhost:3000)
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run lint` — ESLint

## Tech Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Database/Auth**: Supabase (PostgreSQL + Auth, RLS on all tables)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Zustand (global), TanStack Query (server state)
- **AI**: Vercel AI SDK + OpenRouter
- **Background Jobs**: Inngest
- **Editor**: Tiptap | **Graph**: React Flow

## Project Layout

```
app/                    # Next.js App Router (routes only)
  (auth)/               # Public: /login, /sign-up, /forgot-password
  (dashboard)/          # Protected: /notes (other routes not yet wired)
  (admin)/              # Admin: /admin
features/               # Feature modules (domain logic—some awaiting route wiring)
components/             # Shared/reusable components
  ui/                   # shadcn/ui (do not modify)
lib/                    # Core utilities
  supabase/             # server.ts (await), client.ts (no await)
  inngest/              # Background job definitions
stores/                 # Zustand stores
types/                  # Global types (database.types.ts)
```

Path alias: `@/*` maps to project root

## Critical Patterns

### Supabase Client (IMPORTANT)

```typescript
// Server Components/Actions: MUST await, create fresh per request (never global)
const supabase = await createClient(); // from @/lib/supabase/server

// Client Components: no await
const supabase = createClient(); // from @/lib/supabase/client
```

### Feature Module Structure

New domain features go in `features/[domain]/`:
- `components/` — Domain-specific UI
- `hooks/` — TanStack Query hooks
- `actions/` — Server actions
- `types.ts` — TypeScript interfaces
- `index.ts` — Public exports (barrel)

### Component Placement

- Feature-specific → `features/[domain]/components/`
- Shared/reusable → `components/`
- shadcn/ui → `components/ui/` (never edit directly)
- Use `cn()` from `@/lib/utils` for conditional classes

### AI Integration

- Use Vercel AI SDK (`ai` package) with OpenRouter
- AI actions go in `features/[domain]/actions/` as server actions
- Background jobs via Inngest (`lib/inngest/`)

## Database

**Tables** (all RLS-enabled):
- `profiles` — User profiles with role (user/admin)
- `notes` — id, user_id, title, problem, content, embedding (vector 1536), tags (text[]), word_count, is_pinned, deleted_at, timestamps
- `conflicts` — id, user_id, note_a_id, note_b_id, explanation, status (unresolved/resolved/dismissed), timestamps
- `note_links` — Backlink tracking for [[wikilinks]]

**Key RPCs**:
- `search_notes` — Semantic search via embeddings
- `get_related_notes` — Find similar notes
- `get_backlinks` — Notes linking to target
- `find_potential_conflicts` — Conflict detection helper
- `get_unresolved_conflict_count` — Sidebar badge

## Key Product Concepts

When implementing features, understand these core concepts from the PRD:

1. **Problem Field**: Every note has an explicit problem field—the epistemic differentiator. Solutions without problems are unjudgeable. AI can reconstruct problems from content.

2. **Conflict Detection**: System automatically detects contradicting claims across notes and surfaces them for resolution. This creates selection pressure.

3. **Three-Panel Layout**: Left sidebar (navigation), Main content (workspace), Right inspector (AI tools, conflicts, related notes, tags, backlinks)—all collapsible.

4. **Selection Pressure**: Features should create productive friction that improves ideas: conflict surfacing, AI criticism, semantic relevance.

## Verification

Before completing work:
1. `npm run build` — must pass
2. `npm run lint` — must pass
3. Check TypeScript errors in affected files

## Additional Context

- Product vision, user stories: see `PRD.md`
- Database migrations: see `supabase/migrations/`
- Generated types: see `types/database.types.ts`

## Rules
- Automatically use context7 mcp for code generation and library documentation
