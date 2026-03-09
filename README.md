# Refinery

A note-taking app where ideas compete, not just accumulate.

Most note apps treat notes as static storage. Refinery treats them as conjectures — ideas that face selection pressure through automated conflict detection, AI criticism, and semantic surfacing. Based on Popper/Deutsch's evolutionary epistemology: knowledge grows through conjecture and refutation.

## What makes this interesting

**Conflict detection pipeline** — When you save a note, the system automatically finds other notes that contradict or create tension with it. This isn't keyword matching. It's a multi-stage pipeline: chunk-based vector similarity finds candidates via a Supabase RPC (`find_potential_conflicts`, cosine threshold 0.8), then an LLM judges each pair with structured output (Zod schema → `generateObject`). Judgments are keyed by `pair_content_hash` so re-editing a note re-evaluates only changed pairs. Only conflicts with confidence ≥ 0.7 surface to the user.

**Hybrid search** — Combines full-text search (PostgreSQL `tsvector`) with chunk-level semantic search (pgvector) using Reciprocal Rank Fusion. Notes are chunked (2000 chars, 200 overlap) so long notes don't lose semantic detail in a single mean-pooled vector. Each chunk gets its own embedding; the note-level embedding is a mean pool of its chunks.

**Local-first sync** — Notes save to IndexedDB first, then sync to Supabase in the background via a queue. Temp-to-server ID mappings persist in IndexedDB across sessions. Version conflicts are detected and surfaced (not silently overwritten). The sync queue has retry logic with max 3 attempts.

**AI tools that aren't chatbots** — No chat interface. Instead: critique (counterarguments, hidden assumptions, weak logic, blindspots), problem reconstruction (what problem is this note actually trying to solve?), and note cleaning (restructure messy writing, show diff before applying).

## Tech stack

Next.js 15 (App Router), React 19, TypeScript, Supabase (PostgreSQL + pgvector + RLS), Vercel AI SDK 5, Inngest, TanStack Query v5, Zustand, Tiptap, Tailwind CSS + shadcn/ui

Testing: Vitest + React Testing Library (49 test files), Playwright for e2e.

## Architecture

```
app/                     # Routes only — no business logic here
  (auth)/                # /login, /sign-up, /forgot-password
  (dashboard)/           # /notes, /conflicts, /trash
  (admin)/               # /admin (role-gated)

features/                # Domain modules — each has actions/, components/, hooks/, types.ts
  notes/                 # CRUD, auto-save, tag filtering, bulk operations
  conflicts/             # Conflict list, dismiss, per-note conflicts
  ai/                    # Critique, problem reconstruction, note cleaning + diff view
  search/                # Hybrid search (full-text + semantic + RRF)
  inspector/             # Side panel: related notes, backlinks, conflicts, AI tools, tags
  admin/                 # Dashboard stats, user management, system health
  trash/                 # Soft delete, restore, permanent delete

lib/
  inngest/functions/     # Background jobs:
                         #   generate-embedding — chunked embedding with content-hash idempotency
                         #   detect-conflicts — LLM judgment pipeline
                         #   reconcile-embeddings — 5-min cron, catches stale/failed embeddings
                         #   reconcile-conflicts — re-checks after embedding updates
                         #   purge-old-trash — auto-delete after retention period
  local-db/              # IndexedDB schema, note cache, sync queue, ID mappings
  embedding/             # Chunker, content-hash (SHA-256), mean pooling
  ai/                    # LLM conflict judgment (structured output + Zod)
  supabase/              # Server client (async, per-request) vs browser client (singleton)

components/
  editor/                # Tiptap with markdown, bubble menu, syntax highlighting
  layout/                # Three-panel resizable layout, sidebar, tab bar, inspector
  ui/                    # shadcn/ui primitives (untouched)

stores/                  # Zustand — tabs (localStorage), layout (cookies), editor state (memory)
```

## Key technical decisions

**Chunk-level embeddings instead of note-level only.** A single 1536-dim vector can't represent a 5000-word note. Chunking (2000 chars, 200 overlap) with per-chunk embeddings gives better recall for both search and conflict detection. The note-level vector (mean pool of chunks) exists for quick similarity, but RPCs operate on chunks.

**Content-hash idempotency everywhere.** Embedding generation, conflict judgment — all keyed by SHA-256 of content. If content hasn't changed, no work is done. If Inngest retries a failed job, it won't duplicate embeddings or judgments.

**Structured LLM output, not free text.** Conflict judgments use Zod schemas with `generateObject` — the LLM returns `{ reasoning, result, confidence, explanation }` with typed enums and bounded floats. No parsing, no "sometimes it returns JSON sometimes it doesn't."

**Background pipelines, not request-time AI.** Embedding generation and conflict detection run as Inngest functions triggered by events (`note/embedding.requested`, `note/conflicts.detection.requested`). A 5-minute reconciliation cron catches anything that fell through. The user never waits for AI during editing.

**Local-first with explicit conflict handling.** Not just "save locally and hope sync works." The sync queue tracks retry counts, version conflicts are detected via server version comparison, and ID mappings persist across browser sessions in IndexedDB.

## Database

PostgreSQL (Supabase) with pgvector extension. 6 tables, all RLS-enabled. 9 migrations.

Key RPCs:
- `hybrid_search` — full-text + chunk-based semantic via RRF
- `find_potential_conflicts` — chunk-level similarity (threshold 0.8)
- `get_related_notes` — chunk-to-chunk similarity for the inspector panel
- `get_backlinks` — bidirectional note links

Triggers handle `updated_at` timestamps, auto-profile creation on signup, and conflict cleanup on soft delete/restore.

## How it was built

This project was built using AI-assisted development (Pi, Claude Code). I provided the vision, problem definitions, architecture decisions, and product direction. AI handled implementation. This is how I build: problems and taste first, AI as execution layer.

## Running locally

```bash
npm install
npm run dev              # Next.js dev server (Turbopack, localhost:3000)
npm run dev:inngest      # Inngest dev server (required for background jobs)
```

Requires: Supabase project (with pgvector), OpenRouter API key, Inngest account.

```bash
npm run build            # Production build
npm run test             # Vitest
npm run lint             # ESLint
```
