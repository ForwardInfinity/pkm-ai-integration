// Graph feature public exports

// Components
export { ProblemGraphCanvas, ProblemNode, NoteNode, ConflictEdge, GraphControls } from './components'

// Hooks
export { useGraphData } from './hooks'

// Actions
export { getGraphData, type RawGraphData } from './actions'

// Utilities
export {
  transformToGraph,
  computeLayout,
  buildClusters,
  getClusterIdForNote,
  ORPHAN_CLUSTER_ID,
  ORPHAN_CLUSTER_LABEL,
  LAYOUT_CONFIG,
} from './lib'

// Types
export type {
  GraphNoteData,
  GraphConflictData,
  ProblemNodeData,
  NoteNodeData,
  GraphNodeType,
  GraphEdgeType,
  GraphData,
  SimulationNode,
  ClusterCentroid,
  ConflictEdgeData,
  ProblemNode as ProblemNodeType,
  NoteNode as NoteNodeType,
  ConflictEdge as ConflictEdgeType,
} from './types'

export { graphKeys } from './types'
