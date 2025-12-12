import type {
  GraphNoteData,
  GraphConflictData,
  GraphNodeType,
  GraphEdgeType,
  ProblemNode,
  NoteNode,
  GraphData,
} from '../types'

const ORPHAN_CLUSTER_ID = '__orphan__'
const ORPHAN_CLUSTER_LABEL = 'No Problem Defined'

interface ClusterInfo {
  id: string
  label: string
  noteIds: string[]
  isOrphan: boolean
}

function createClusterId(problem: string | null): string {
  if (!problem) return ORPHAN_CLUSTER_ID
  const normalized = problem.trim().toLowerCase()
  return `problem-${normalized.replace(/\s+/g, '-').slice(0, 50)}`
}

export function buildClusters(notes: GraphNoteData[]): Map<string, ClusterInfo> {
  const clusters = new Map<string, ClusterInfo>()

  for (const note of notes) {
    const clusterId = createClusterId(note.problem)
    const isOrphan = !note.problem

    if (!clusters.has(clusterId)) {
      clusters.set(clusterId, {
        id: clusterId,
        label: isOrphan ? ORPHAN_CLUSTER_LABEL : note.problem!,
        noteIds: [],
        isOrphan,
      })
    }

    clusters.get(clusterId)!.noteIds.push(note.id)
  }

  return clusters
}

export function transformToGraph(
  notes: GraphNoteData[],
  conflicts: GraphConflictData[]
): GraphData {
  const clusters = buildClusters(notes)
  const conflictingNoteIds = new Set<string>()

  // Collect all note IDs involved in conflicts
  for (const conflict of conflicts) {
    conflictingNoteIds.add(conflict.note_a_id)
    conflictingNoteIds.add(conflict.note_b_id)
  }

  const nodes: GraphNodeType[] = []
  const edges: GraphEdgeType[] = []

  // Create problem nodes (cluster centers)
  for (const [clusterId, cluster] of clusters) {
    const problemNode: ProblemNode = {
      id: clusterId,
      type: 'problem',
      position: { x: 0, y: 0 }, // Will be set by layout engine
      data: {
        label: cluster.label,
        noteCount: cluster.noteIds.length,
        isOrphan: cluster.isOrphan,
      },
    }
    nodes.push(problemNode)
  }

  // Create note nodes
  for (const note of notes) {
    const clusterId = createClusterId(note.problem)
    const noteNode: NoteNode = {
      id: note.id,
      type: 'note',
      position: { x: 0, y: 0 }, // Will be set by layout engine
      data: {
        title: note.title,
        problem: note.problem,
        isPinned: note.is_pinned,
        hasConflicts: conflictingNoteIds.has(note.id),
        clusterId,
      },
    }
    nodes.push(noteNode)
  }

  // Create conflict edges
  for (const conflict of conflicts) {
    edges.push({
      id: `conflict-${conflict.id}`,
      source: conflict.note_a_id,
      target: conflict.note_b_id,
      type: 'conflict',
      data: {
        conflictId: conflict.id,
        conflictType: conflict.conflict_type,
      },
      animated: true,
      style: { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '5,5' },
    })
  }

  return { nodes, edges }
}

export function getClusterIdForNote(problem: string | null): string {
  return createClusterId(problem)
}

export { ORPHAN_CLUSTER_ID, ORPHAN_CLUSTER_LABEL }
