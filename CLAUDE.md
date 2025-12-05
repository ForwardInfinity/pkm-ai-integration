# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Refinery** is a note-taking system that treats ideas as provisional theories requiring criticism. It implements evolutionary epistemology (Popper/Deutsch) where knowledge grows through conjecture and refutation, not accumulation. Notes are conjectures that face selection pressure through conflict detection, AI criticism, and semantic surfacing.

## Commands

```bash
npm run dev      # Start dev server with Turbopack (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Tech Stack

- **Framework**: Next.js 15 (App Router, React 19, TypeScript)
- **Database/Auth**: Supabase (PostgreSQL + Supabase Auth)
- **Styling**: Tailwind CSS + shadcn/ui (new-york style, neutral base)
- **State**: Zustand, TanStack Query
- **AI**: Vercel AI SDK + OpenRouter (planned)
- **Background Jobs**: Inngest (planned)
- **Editor**: Tiptap
- **Graph**: React Flow
- **Testing**: Vitest, React Testing Library, Playwright (planned)

## Architecture

### Directory Structure

```
app/                              # Next.js App Router (routes only)
  (auth)/                         # Route group: public auth pages
    login/                        # /login
    sign-up/                      # /sign-up
    forgot-password/              # /forgot-password
    update-password/              # /update-password
    sign-up-success/              # /sign-up-success
    error/                        # /error
    layout.tsx                    # Centered auth layout
  (dashboard)/                    # Route group: authenticated app
    layout.tsx                    # Three-panel shell layout
    notes/                        # /notes - main dashboard
      [id]/                       # /notes/:id - note editor
    conflicts/                    # /conflicts
    graph/                        # /graph
    search/                       # /search
    trash/                        # /trash
  (admin)/                        # Route group: admin area
    layout.tsx                    # Admin layout with role check
    admin/                        # /admin
  api/                            # API routes
    auth/confirm/                 # Email confirmation callback

components/                       # Shared/reusable components
  ui/                             # shadcn/ui design system (do not modify)
  editor/                         # Reusable Tiptap markdown editor
  layout/                         # Layout components (sidebar, inspector, header)
  forms/
    auth/                         # Auth form components
    note/                         # Note form components
  shared/                         # Generic utilities (theme-switcher, logos, etc.)
  tutorial/                       # Tutorial components (from starter kit)

features/                         # Feature modules (domain-specific)
  notes/                          # Note management
    components/                   # Feature-specific UI
    hooks/                        # TanStack Query hooks
    actions/                      # Server actions
    types.ts                      # Feature types
    index.ts                      # Public exports
  conflicts/                      # Conflict detection & resolution
  search/                         # Semantic search
  graph/                          # Problem graph visualization
  ai/                             # AI features (reconstruct, critique, clean)
  inspector/                      # Right panel features
  trash/                          # Trash management
  admin/                          # Admin dashboard

lib/                              # Core utilities and infrastructure
  supabase/
    client.ts                     # Browser Supabase client
    server.ts                     # Server Supabase client (async cookies)
    middleware.ts                 # Session refresh logic
  ai/                             # OpenRouter client setup
  inngest/
    client.ts                     # Inngest client
    functions/                    # Background job definitions
  db/
    queries/                      # Complex database queries
  validation/                     # Zod schemas
  utils.ts                        # cn() helper, env check

stores/                           # Zustand stores (global state)
hooks/                            # Shared custom hooks
types/                            # Global type definitions
  database.types.ts               # Supabase generated types
config/                           # App configuration
  site.ts                         # Site metadata
  navigation.ts                   # Sidebar navigation config

supabase/                         # Supabase local config
  migrations/                     # Database migrations

tests/                            # Test files
  unit/                           # Vitest unit tests
  integration/                    # Integration tests
  e2e/                            # Playwright E2E tests

middleware.ts                     # Auth protection
```

### Route Groups

Route groups (parentheses folders) organize routes without affecting URLs:
- `(auth)` - Public auth pages at `/login`, `/sign-up`, etc.
- `(dashboard)` - Authenticated pages at `/notes`, `/conflicts`, etc.
- `(admin)` - Admin pages at `/admin`

### Feature Module Pattern

Each feature in `features/` follows this structure:
```
features/[domain]/
  components/     # Domain-specific UI components
  hooks/          # TanStack Query hooks for data fetching
  actions/        # Server actions for mutations
  types.ts        # TypeScript interfaces
  index.ts        # Public exports (barrel file)
```

### Supabase Client Usage

- **Server Components/Actions**: Use `createClient()` from `@/lib/supabase/server` - must await it, creates fresh client per request
- **Client Components**: Use `createClient()` from `@/lib/supabase/client`
- **Middleware**: Session refresh handled in `@/lib/supabase/middleware`

### Path Aliases

- `@/*` maps to project root (e.g., `@/components`, `@/lib/supabase/server`, `@/features/notes`)

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

## Database Schema

### Tables

| Table | Description | RLS |
|-------|-------------|-----|
| `profiles` | User profiles with role (user/admin) | ✅ |
| `notes` | Notes with embeddings, tags, word_count | ✅ |
| `conflicts` | AI-detected conflicts between notes | ✅ |
| `note_links` | Backlink tracking for [[wikilinks]] | ✅ |

### Key Columns

**notes**: `id`, `user_id`, `title`, `problem`, `content`, `embedding` (vector 1536), `tags` (text[]), `word_count`, `is_pinned`, `deleted_at`, timestamps

**conflicts**: `id`, `user_id`, `note_a_id`, `note_b_id`, `explanation`, `status` (unresolved/resolved/dismissed), timestamps

### Database Functions (RPC)

```typescript
// Semantic search
supabase.rpc('search_notes', { query_embedding, match_threshold, match_count })

// Related notes
supabase.rpc('get_related_notes', { target_note_id, match_count })

// Backlinks
supabase.rpc('get_backlinks', { target_note_id })

// Conflict detection helper
supabase.rpc('find_potential_conflicts', { target_note_id, similarity_threshold, match_count })

// Sidebar badge
supabase.rpc('get_unresolved_conflict_count')

// Tag operations
supabase.rpc('get_notes_by_tags', { filter_tags, include_deleted })
supabase.rpc('get_all_tags')
```

### Triggers

- `updated_at` auto-update on profiles and notes
- Auto-create profile on user signup
- Auto-resolve conflicts when note is soft-deleted
- Auto-reactivate conflicts when note is restored

## Key Product Concepts

When implementing features, understand these core concepts from the PRD:

1. **Problem Field**: Every note has an explicit problem field - the epistemic differentiator. AI can help reconstruct problems from content.

2. **Conflict Detection**: System automatically detects contradicting claims across notes and surfaces them for resolution.

3. **Three-Panel Layout**: Left sidebar (navigation), Main content (workspace), Right inspector (conflicts, related notes, AI tools) - all collapsible.

4. **Selection Pressure**: Features should create productive friction that improves ideas: conflict surfacing, AI criticism, semantic relevance.

## Conventions

- Use shadcn/ui components from `@/components/ui`
- Use `cn()` from `@/lib/utils` for conditional classes
- Server-side Supabase clients must be created fresh per request (never global)
- Feature-specific components go in `features/[domain]/components/`
- Shared/reusable components go in `components/`
- Protected routes use middleware - unauthenticated users redirect to `/login`
- Auth pages redirect authenticated users to `/notes`

## URL Structure

| Route | Description |
|-------|-------------|
| `/` | Landing page (public) |
| `/login` | Login page |
| `/sign-up` | Sign up page |
| `/notes` | Notes list (dashboard home) |
| `/notes/:id` | Note editor |
| `/conflicts` | Conflict resolution |
| `/graph` | Problem graph |
| `/search` | Search results |
| `/trash` | Deleted notes |
| `/admin` | Admin dashboard |

## Rules

- Automatically use context7 for code generation and library documentation.
- Feature code goes in `features/`, not `components/`
- Keep `components/ui/` untouched (shadcn/ui managed)
- Co-locate feature-specific code (components, hooks, types) within feature directories
