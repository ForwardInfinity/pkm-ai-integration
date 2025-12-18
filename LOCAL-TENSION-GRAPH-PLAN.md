# Local Tension Graph - Implementation Plan

## Overview

Build a conflict-first graph visualization centered on the current note. Conflicts are the primary edges (red/orange), with semantic similarity and wikilinks as secondary context layers.

**Stack**: React Flow (`@xyflow/react` v12.10.0), existing TanStack Query hooks, Zustand stores

---

## Phase 1: Conflicts as Graph

### Context
Starting fresh. No graph page exists yet. Navigation entry at `/graph` is configured but returns 404.

### Objective
Render all active conflicts as a basic graph with notes as nodes and conflicts as edges.

### Read First
- `features/conflicts/types.ts` — ConflictWithNotes type
- `features/conflicts/hooks/use-conflicts.ts` — useConflicts() query hook
- `features/graph/types.ts` — GraphNode, GraphEdge types (extend these)
- `app/(dashboard)/conflicts/page.tsx` — Route pattern reference

### Specifications
```typescript
// Replace features/graph/types.ts with React Flow compatible types
import { Node, Edge } from '@xyflow/react';

export type NoteNodeData = {
  noteId: string;
  title: string;
  problem?: string;
  conflictCount: number;
  isCenter?: boolean;  // For local graph mode
};

export type ConflictEdgeData = {
  conflictId: string;
  conflictType: 'contradiction' | 'tension';
  explanation: string;
};

export type NoteNode = Node<NoteNodeData, 'note'>;
export type ConflictEdge = Edge<ConflictEdgeData>;
```

### Create
- `app/(dashboard)/graph/page.tsx` — Route wrapper
- `features/graph/components/conflict-graph.tsx` — Main graph component
- `features/graph/hooks/use-conflict-graph-data.ts` — Transform conflicts to nodes/edges

### Modify
- `features/graph/types.ts` — Add ConflictGraphNode, ConflictGraphEdge

### Acceptance Criteria
1. Navigate to `/graph` → see graph with nodes for each note involved in conflicts
2. Contradiction edges render in red, tension edges in orange
3. Click a node → navigate to `/notes/{id}`

---

## Phase 2: Local Graph Mode

### Context
Phase 1 delivers a global conflict graph. Now scope it to a single note.

### Objective
Center the graph on a specific note, showing only its direct conflicts and connections.

### Read First
- `features/conflicts/actions/get-note-conflicts.ts` — getNoteConflicts(noteId)
- `features/notes/hooks/use-backlinks.ts` — useBacklinks(noteId)
- `features/notes/types.ts` — NoteLink type for wikilinks

### Specifications
```typescript
// Query param: /graph?noteId=abc123
// OR embed as component with noteId prop

interface LocalGraphData {
  centerNote: { id: string; title: string; problem?: string };
  conflicts: NoteConflict[];
  backlinks: BacklinkNote[];
  outgoingLinks: NoteLink[];
}
```

### Create
- `features/graph/components/local-graph.tsx` — Centered layout component
- `features/graph/hooks/use-local-graph-data.ts` — Fetches centered note's relationships

### Modify
- `app/(dashboard)/graph/page.tsx` — Handle `?noteId=` param, render LocalGraph vs ConflictGraph

### Acceptance Criteria
1. `/graph?noteId=abc` → center node is styled distinctly (larger, blue)
2. Conflict edges connect from center to conflicting notes
3. Wikilink edges (source + backlinks) shown in gray

---

## Phase 3: Semantic + Problem Layers

### Context
Local graph shows conflicts and wikilinks. Add semantic similarity and problem clustering.

### Objective
Add toggle-able layers for semantic neighbors and notes sharing the same problem field.

### Read First
- `features/notes/hooks/use-related-notes.ts` — useRelatedNotes(noteId)
- `supabase/migrations/002_functions.sql` — get_related_notes RPC, get_notes_by_tags RPC
- `features/graph/types.ts` — GraphEdge types

### Specifications
```typescript
// Layer visibility state
interface GraphLayerState {
  showConflicts: boolean;    // default: true
  showSemantic: boolean;     // default: false
  showProblem: boolean;      // default: true
  showLinks: boolean;        // default: true
}

// Edge type styling
const edgeStyles = {
  conflict_contradiction: { stroke: '#ef4444', strokeWidth: 3, animated: true },
  conflict_tension: { stroke: '#f59e0b', strokeWidth: 2 },
  semantic: { stroke: '#9ca3af', strokeDasharray: '5,5', strokeWidth: 1 },
  problem: { stroke: '#8b5cf6', strokeWidth: 2 },
  wikilink: { stroke: '#3b82f6', strokeWidth: 1 },
};
```

### Create
- `features/graph/components/graph-controls.tsx` — Toggle buttons for layers
- `features/graph/hooks/use-problem-peers.ts` — Fetch notes with same problem field

### Modify
- `features/graph/hooks/use-local-graph-data.ts` — Add semantic + problem data fetching
- `features/graph/components/local-graph.tsx` — Integrate layer controls, filter edges

### Acceptance Criteria
1. Toggle "Semantic" off → gray dashed edges disappear
2. Toggle "Problem" on → purple edges connect notes with identical problem field
3. Controls are visible and responsive

---

## Phase 4: Interactions

### Context
Graph renders with all layers. Now make it actionable.

### Objective
Add hover previews, click-to-open conflict details, and edge animations.

### Read First
- `features/conflicts/components/conflict-card.tsx` — Conflict display pattern
- `features/inspector/components/conflicts-section.tsx` — Side panel pattern
- `@xyflow/react` docs for custom nodes and edge click handlers

### Specifications
```typescript
// Node hover preview data
interface NodePreview {
  title: string;
  problem?: string;
  snippet: string;  // first ~100 chars of content
  conflictCount: number;
}

// Edge click opens side panel with:
interface ConflictDetail {
  conflictId: string;
  noteA: { id: string; title: string };
  noteB: { id: string; title: string };
  explanation: string;
  conflictType: 'contradiction' | 'tension';
}
```

### Create
- `features/graph/components/node-preview-card.tsx` — Hover tooltip component
- `features/graph/components/conflict-detail-panel.tsx` — Slide-out panel for edge clicks
- `features/graph/components/custom-edge.tsx` — Animated edge with click handler

### Modify
- `features/graph/components/local-graph.tsx` — Wire up custom nodes/edges
- `features/conflicts/hooks/use-dismiss-conflict.ts` — Reuse for panel dismiss action

### Acceptance Criteria
1. Hover node → preview card appears with title, problem, snippet
2. Click red/orange edge → side panel opens with conflict explanation
3. "Dismiss" button in panel dismisses the conflict
4. Contradiction edges pulse/animate subtly

---

## Phase 5: Discovery Insights

### Context
Graph is fully interactive. Add intelligence layer for unchallenged thinking warnings.

### Objective
Show badges/warnings for problems with only one note and highly similar unlinked notes.

### Read First
- `supabase/migrations/002_functions.sql` — find_potential_conflicts RPC
- `features/graph/hooks/use-local-graph-data.ts` — Data structure

### Specifications
```typescript
// Insight types to detect
interface GraphInsight {
  type: 'unchallenged_problem' | 'unlinked_similarity' | 'orphan_note';
  message: string;
  relatedNoteIds: string[];
}

// Badge display
// - Unchallenged: "1 note for this problem - is your thinking settled?"
// - Unlinked similarity: "High similarity (>0.85) but no link or conflict"
```

### Create
- `features/graph/components/insight-badge.tsx` — Warning badge component
- `features/graph/hooks/use-graph-insights.ts` — Compute insights from graph data

### Modify
- `features/graph/components/local-graph.tsx` — Render insight badges on relevant nodes
- `features/graph/components/graph-controls.tsx` — Add depth slider (1-3 hops)

### Acceptance Criteria
1. Node with single-note problem shows teal "unchallenged" badge
2. Depth slider expands graph to 2nd/3rd degree connections
3. Insights panel lists all detected gaps/warnings

---

## Phase 6: Integration

### Context
Graph is complete. Integrate it into the main workflow.

### Objective
Add entry points from note editor and sidebar.

### Read First
- `features/notes/components/note-editor.tsx` — Editor header structure
- `components/layout/sidebar.tsx` — Navigation with badges
- `features/inspector/components/note-inspector.tsx` — Inspector panel structure

### Specifications
```typescript
// Editor header button
<Button variant="ghost" size="sm" onClick={() => router.push(`/graph?noteId=${noteId}`)}>
  <Network className="h-4 w-4" />
  View in Graph
</Button>

// Sidebar badge (conflict count)
// Reuse useConflictCount() hook
```

### Create
- `features/inspector/components/graph-preview.tsx` — Mini local graph for inspector

### Modify
- `features/notes/components/note-editor.tsx` — Add "View in Graph" button to header
- `components/layout/sidebar.tsx` — Add conflict count badge to Graph nav item
- `features/inspector/components/note-inspector.tsx` — Add GraphPreview section

### Acceptance Criteria
1. Note editor header has "View in Graph" button → opens `/graph?noteId=...`
2. Sidebar "Problem Graph" link shows conflict count badge
3. Inspector has collapsible mini-graph preview (optional, lower priority)

---

## File Summary

### New Files
```
app/(dashboard)/graph/page.tsx
features/graph/components/conflict-graph.tsx
features/graph/components/local-graph.tsx
features/graph/components/graph-controls.tsx
features/graph/components/node-preview-card.tsx
features/graph/components/conflict-detail-panel.tsx
features/graph/components/custom-edge.tsx
features/graph/components/insight-badge.tsx
features/graph/hooks/use-conflict-graph-data.ts
features/graph/hooks/use-local-graph-data.ts
features/graph/hooks/use-problem-peers.ts
features/graph/hooks/use-graph-insights.ts
features/inspector/components/graph-preview.tsx
```

### Modified Files
```
features/graph/types.ts
features/notes/components/note-editor.tsx
features/inspector/components/note-inspector.tsx
components/layout/sidebar.tsx
```

---

## Phase Dependencies

```
Phase 1 (conflicts as graph)
    ↓
Phase 2 (local graph mode)
    ↓
Phase 3 (semantic + problem layers)
    ↓
Phase 4 (interactions)
    ↓
Phase 5 (discovery insights)
    ↓
Phase 6 (integration)
```

Each phase is a valid stopping point. Start with Phase 1 and continue if satisfied.
