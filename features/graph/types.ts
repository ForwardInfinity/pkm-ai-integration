// Graph-related type definitions

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

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
