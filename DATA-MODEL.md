# Data Model Entity Relationship Diagrams

This document provides visual representations of the data models used across the Refinery application at three layers: Database, Service/Feature, and UI State.

---

## 1. Database Schema (Supabase/PostgreSQL)

The core persistence layer using Supabase with PostgreSQL and pgvector for embeddings.

```mermaid
erDiagram
    profiles ||--o{ notes : "owns"
    profiles ||--o{ conflicts : "owns"
    profiles ||--o{ conflict_judgments : "owns"
    profiles ||--o{ note_links : "owns"
    profiles ||--o{ note_chunks : "owns"
    notes ||--o{ conflicts : "note_a"
    notes ||--o{ conflicts : "note_b"
    notes ||--o{ conflict_judgments : "note_a"
    notes ||--o{ conflict_judgments : "note_b"
    notes ||--o{ note_links : "source"
    notes ||--o{ note_links : "target"
    notes ||--o{ note_chunks : "chunked into"

    profiles {
        uuid id PK
        user_role role "user|admin"
        timestamp created_at
        timestamp updated_at
    }

    notes {
        uuid id PK
        uuid user_id FK
        string title
        string problem "nullable"
        text content
        string[] tags
        boolean is_pinned
        int word_count
        vector embedding "1536-dim (mean-pooled)"
        tsvector fts "generated full-text search"
        embedding_status embedding_status "pending|processing|completed|failed"
        timestamp embedding_requested_at "nullable"
        timestamp embedding_updated_at "nullable"
        string embedding_content_hash "SHA-256 for idempotency"
        string embedding_error "nullable"
        string embedding_model "nullable"
        timestamp deleted_at "nullable (soft delete)"
        timestamp created_at
        timestamp updated_at
    }

    note_chunks {
        uuid id PK
        uuid note_id FK
        uuid user_id FK
        int chunk_index "zero-based"
        int content_start "char offset start"
        int content_end "char offset end"
        text text_chunk
        vector embedding "1536-dim"
        timestamp created_at
    }

    conflicts {
        uuid id PK
        uuid user_id FK
        uuid note_a_id FK
        uuid note_b_id FK
        text explanation
        conflict_type type "contradiction|tension"
        conflict_status status "active|dismissed"
        timestamp created_at
    }

    conflict_judgments {
        uuid id PK
        uuid user_id FK
        uuid note_a_id FK
        uuid note_b_id FK
        string pair_content_hash "idempotency key"
        judgment_result judgment_result "no_conflict|tension|contradiction"
        float confidence "0-1"
        text reasoning "internal LLM reasoning"
        text explanation "user-facing (nullable)"
        string model
        timestamp created_at
    }

    note_links {
        uuid id PK
        uuid user_id FK
        uuid source_note_id FK
        uuid target_note_id FK
        timestamp created_at
    }
```

### Enums

| Enum | Values | Description |
|------|--------|-------------|
| `user_role` | `user`, `admin` | Access control role |
| `conflict_type` | `contradiction`, `tension` | Direct vs indirect conflict |
| `conflict_status` | `active`, `dismissed` | Resolution status |
| `judgment_result` | `no_conflict`, `tension`, `contradiction` | LLM conflict judgment verdict |
| `embedding_status` | `pending`, `processing`, `completed`, `failed` | Embedding generation state |

### Key Constraints

| Table | Constraint | Description |
|-------|------------|-------------|
| `conflicts` | `note_a_id < note_b_id` | Prevents duplicate pairs (A,B) and (B,A) |
| `conflict_judgments` | `note_a_id < note_b_id` | Canonical ordering for pairs |
| `conflict_judgments` | `unique(note_a_id, note_b_id, pair_content_hash)` | Idempotency - one judgment per content state |
| `note_links` | `source_note_id != target_note_id` | No self-links |
| `note_chunks` | `unique(note_id, chunk_index)` | Ordered chunks per note |
| `note_chunks` | `content_start >= 0 and content_end > content_start` | Valid character offsets |

### Key Database Functions (RPCs)

| Function | Purpose |
|----------|---------|
| `hybrid_search` | Combined full-text + chunk-based semantic search via RRF |
| `get_related_notes` | Find similar notes using chunk-to-chunk similarity |
| `get_backlinks` | Notes linking to target |
| `find_potential_conflicts` | Detect conflicts using chunk-level embeddings (0.8 threshold) |
| `get_unresolved_conflict_count` | Count for sidebar badge |
| `get_all_tags` | Aggregate tag counts |
| `get_notes_by_tags` | Filter notes by tags |

### Trigger Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `update_updated_at` | Before UPDATE | Auto-update `updated_at` timestamp |
| `handle_new_user` | After INSERT on auth.users | Auto-create profile |
| `on_note_soft_delete` | After UPDATE on notes | Delete active conflicts when note trashed |
| `on_note_restore` | After UPDATE on notes | Clean up stale dismissed conflicts |

---

## 2. Service/Feature Models

Application-level types derived from database schema, used in server actions and React Query hooks.

```mermaid
erDiagram
    Note ||--o| NoteListItem : "projects to"
    Note ||--o| TrashNoteItem : "projects to"
    Note ||--o| RelatedNote : "similarity search"
    Note ||--o| SearchResult : "semantic search"
    Note ||--o| BacklinkNote : "backlink query"
    Note ||--o| TextSearchResult : "text search"
    Conflict ||--|| ConflictWithNotes : "extends with notes"
    Note ||--o{ GraphNode : "renders as"
    Note }|--o{ GraphEdge : "connects via"

    Note {
        string id
        string title
        string problem
        string content
        string[] tags
        boolean is_pinned
        int word_count
        string embedding
        embedding_status embedding_status
        string deleted_at
    }

    NoteListItem {
        string id
        string title
        string problem
        string[] tags
        boolean is_pinned
        string updated_at
        int word_count
    }

    RelatedNote {
        string id
        string title
        string problem
        float similarity
    }

    SearchResult {
        string id
        string title
        string problem
        string content
        string snippet
        string match_type "hybrid|keyword|semantic"
        float rrf_score
    }

    BacklinkNote {
        string id
        string title
        string problem
    }

    TextSearchResult {
        string id
        string title
        string problem
        string snippet
        string matchField
        int matchIndex
        int queryLength
        string updatedAt
    }

    TrashNoteItem {
        string id
        string title
        string problem
        string deleted_at
        int word_count
    }

    GraphNode {
        string id
        string type "note|problem"
        string label
        object data
    }

    GraphEdge {
        string id
        string source
        string target
        string type "shared_problem|conflict|semantic"
    }

    Conflict {
        string id
        string user_id
        string note_a_id
        string note_b_id
        string explanation
        conflict_type type
        conflict_status status
    }

    ConflictWithNotes {
        Conflict base
        Note note_a
        Note note_b
    }
```

### AI Feature Types

```mermaid
erDiagram
    CritiqueResult {
        string[] counterarguments
        string[] weakLinks
        string[] hiddenAssumptions
        string[] blindspots
    }

    ProblemReconstructionResult {
        string suggestion
        string[] alternatives
    }

    CleanedNote {
        string title
        string problem
        string content
    }

    DiffPart {
        string value
        boolean added
        boolean removed
    }
```

---

## 3. UI State Models (Zustand Stores)

Client-side state management for UI interactions, persisted to localStorage/cookies.

```mermaid
erDiagram
    TabsStore ||--o{ Tab : "manages"
    Tab ||--o| Note : "references"
    NoteEditorStore ||--o| Note : "edits"
    LayoutStore ||--|| LayoutSizes : "contains"

    TabsStore {
        Tab[] tabs
        string activeTabId
        boolean showListView
    }

    Tab {
        string id
        string noteId
        string title
    }

    NoteEditorStore {
        string currentNoteId
        Note currentNote
    }

    LayoutStore {
        boolean isSidebarCollapsed
        boolean isInspectorCollapsed
        LayoutSizes sizes
    }

    LayoutSizes {
        number sidebar "percentage"
        number main "percentage"
        number inspector "percentage"
    }
```

### Store Locations

| Store | File | Persistence |
|-------|------|-------------|
| `TabsStore` | `stores/tabs-store.ts` | localStorage |
| `NoteEditorStore` | `stores/note-editor-store.ts` | Memory only |
| `LayoutStore` | `stores/layout-store.ts` | Cookies |

---

## 4. Local-First Sync (IndexedDB)

Offline-first architecture for notes with background sync to Supabase.

```mermaid
erDiagram
    LocalNote ||--o{ SyncQueueItem : "queued for sync"
    LocalNote }o--|| Note : "syncs to server"
    IdMapping ||--|| LocalNote : "maps temp to server id"

    LocalNote {
        string id PK
        string tempId "for new notes"
        string title
        string problem
        string content
        int wordCount
        number updatedAt "local timestamp"
        SyncStatus syncStatus "synced|pending|error"
        string serverVersion "for conflict detection"
    }

    SyncQueueItem {
        number id PK "auto-increment"
        string noteId
        string operation "create|update"
        object data
        number timestamp
        int retryCount
    }

    IdMapping {
        string tempId PK
        string serverId
    }
```

### Sync Flow

1. **Save locally** → IndexedDB with `syncStatus: 'pending'`
2. **Queue sync** → Add to `SyncQueueItem` table
3. **Background sync** → Process queue, call Supabase
4. **Update status** → Mark `syncStatus: 'synced'` on success

### File Locations

| Module | File |
|--------|------|
| DB Setup | `lib/local-db/index.ts` |
| Note Cache | `lib/local-db/note-cache.ts` |
| Sync Queue | `lib/local-db/sync-queue.ts` |

---

## 5. Embedding Pipeline

Chunked embedding system for full semantic coverage of long notes.

```mermaid
flowchart LR
    A[Note Updated] --> B[Compute Content Hash]
    B --> C{Hash Changed?}
    C -->|No| D[Skip - Idempotent]
    C -->|Yes| E[Set status: pending]
    E --> F[Trigger Inngest Event]
    F --> G[Generate Embedding Function]
    G --> H[Chunk Content]
    H --> I[2000 chars, 200 overlap]
    I --> J[Generate Chunk Embeddings]
    J --> K[Store in note_chunks]
    K --> L[Mean Pool → Note Embedding]
    L --> M[Set status: completed]
```

### Embedding Configuration

| Setting | Value |
|---------|-------|
| Model | `text-embedding-3-small` |
| Dimensions | 1536 |
| Chunk Size | 2000 characters |
| Chunk Overlap | 200 characters |
| Conflict Threshold | 0.8 similarity |
| Related Notes Threshold | 0.3 similarity |

### File Locations

| Module | File |
|--------|------|
| Trigger Action | `features/notes/actions/trigger-embedding.ts` |
| Generate Function | `lib/inngest/functions/generate-embedding.ts` |
| Reconcile Cron | `lib/inngest/functions/reconcile-embeddings.ts` |
| Content Hash | `lib/embedding/content-hash.ts` |
| Chunker | `lib/embedding/chunker.ts` |
| Mean Pooling | `lib/embedding/mean-pooling.ts` |

---

## Type Definition Locations

| Layer | Location |
|-------|----------|
| Database Types | `types/database.types.ts` (generated) |
| Notes Feature | `features/notes/types.ts` |
| Conflicts Feature | `features/conflicts/types.ts` |
| Graph Feature | `features/graph/types.ts` |
| Search Feature | `features/search/types.ts` |
| AI Feature | `features/ai/types.ts` |
| Trash Feature | `features/trash/types.ts` |
| Layout Types | `types/layout.types.ts` |
