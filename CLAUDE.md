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
- **State**: Zustand (planned), TanStack Query (planned)
- **AI**: Vercel AI SDK + OpenRouter (planned)
- **Background Jobs**: Inngest (planned)
- **Testing**: Vitest, React Testing Library, Playwright (planned)

## Architecture

### Directory Structure

```
app/                    # Next.js App Router pages
  auth/                 # Auth routes (login, sign-up, forgot-password, etc.)
  protected/            # Authenticated user area
components/
  ui/                   # shadcn/ui components
  tutorial/             # Tutorial components (from starter kit)
lib/
  supabase/
    client.ts           # Browser Supabase client
    server.ts           # Server Supabase client (async cookies)
    middleware.ts       # Session refresh logic
  utils.ts              # cn() helper, env check
middleware.ts           # Auth protection (redirects unauthenticated to /auth/login)
```

### Supabase Client Usage

- **Server Components/Actions**: Use `createClient()` from `@/lib/supabase/server` - must await it, creates fresh client per request
- **Client Components**: Use `createClient()` from `@/lib/supabase/client`
- **Middleware**: Session refresh handled in `@/lib/supabase/middleware`

### Path Aliases

- `@/*` maps to project root (e.g., `@/components`, `@/lib/supabase/server`)

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

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
- Protected routes are under `/protected` - middleware handles auth redirect
