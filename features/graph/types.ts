// Graph-related type definitions
import type { Node, Edge } from '@xyflow/react';

// Raw data from database
export interface GraphNoteData {
  id: string;
  title: string;
  problem: string | null;
  is_pinned: boolean;
  has_embedding: boolean;
}

export interface GraphConflictData {
  id: string;
  note_a_id: string;
  note_b_id: string;
  conflict_type: string;
}

// React Flow node data types
export interface ProblemNodeData extends Record<string, unknown> {
  label: string;
  noteCount: number;
  isOrphan?: boolean;
}

export interface NoteNodeData extends Record<string, unknown> {
  title: string;
  problem: string | null;
  isPinned: boolean;
  hasConflicts: boolean;
  clusterId: string;
}

// React Flow node types
export type ProblemNode = Node<ProblemNodeData, 'problem'>;
export type NoteNode = Node<NoteNodeData, 'note'>;
export type GraphNodeType = ProblemNode | NoteNode;

// React Flow edge types
export type EdgeType = 'conflict' | 'semantic';

export interface ConflictEdgeData extends Record<string, unknown> {
  conflictId: string;
  conflictType: string;
}

export type ConflictEdge = Edge<ConflictEdgeData, 'conflict'>;
export type GraphEdgeType = ConflictEdge | Edge;

// Graph data structure for React Flow
export interface GraphData {
  nodes: GraphNodeType[];
  edges: GraphEdgeType[];
}

// D3-force simulation node
export interface SimulationNode {
  id: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  type: 'note' | 'problem';
  clusterId: string;
}

// Cluster centroid for force layout
export interface ClusterCentroid {
  id: string;
  x: number;
  y: number;
  noteCount: number;
}

// Graph query keys for TanStack Query
export const graphKeys = {
  all: ['graph'] as const,
  data: () => [...graphKeys.all, 'data'] as const,
};

// Legacy types for backwards compatibility
export interface GraphNode {
  id: string;
  type: 'note' | 'problem';
  label: string;
  data: {
    title: string;
    problem?: string;
    hasConflicts: boolean;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'shared_problem' | 'conflict' | 'semantic_similarity';
}
