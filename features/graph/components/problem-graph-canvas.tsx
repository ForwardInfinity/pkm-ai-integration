'use client'

import { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useGraphData } from '../hooks'
import { ProblemNode } from './problem-node'
import { NoteNode } from './note-node'
import { ConflictEdge } from './conflict-edge'
import { GraphControls } from './graph-controls'
import { Loader2, Network } from 'lucide-react'

const nodeTypes: NodeTypes = {
  problem: ProblemNode,
  note: NoteNode,
}

const edgeTypes: EdgeTypes = {
  conflict: ConflictEdge,
}

function GraphCanvas() {
  const router = useRouter()
  const { graphData, isLoading, isError, error, noteCount, conflictCount } = useGraphData()

  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[])
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[])

  // Update nodes/edges when data changes
  useEffect(() => {
    if (graphData) {
      setNodes(graphData.nodes as Node[])
      setEdges(graphData.edges as Edge[])
    }
  }, [graphData, setNodes, setEdges])

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === 'note') {
        router.push(`/notes/${node.id}`)
      }
    },
    [router]
  )

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      if (edge.type === 'conflict' && edge.data?.conflictId) {
        router.push(`/conflicts?highlight=${edge.data.conflictId}`)
      }
    },
    [router]
  )

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading graph...</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-destructive">
          <p className="text-sm">Failed to load graph</p>
          <p className="text-xs text-muted-foreground">{error?.message}</p>
        </div>
      </div>
    )
  }

  if (noteCount === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Network className="h-12 w-12" />
          <p className="text-sm">No notes to visualize</p>
          <p className="text-xs">Create some notes to see your problem graph</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      {/* Stats badge */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <div className="rounded-md bg-background/80 backdrop-blur-sm border px-3 py-1.5 text-xs">
          <span className="font-medium">{noteCount}</span>
          <span className="text-muted-foreground ml-1">notes</span>
        </div>
        {conflictCount > 0 && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-1.5 text-xs">
            <span className="font-medium text-destructive">{conflictCount}</span>
            <span className="text-destructive/70 ml-1">conflicts</span>
          </div>
        )}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        className="bg-background"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          className="bg-muted/20"
        />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'problem') {
              return (node.data as { isOrphan?: boolean }).isOrphan ? '#a1a1aa' : '#3b82f6'
            }
            return (node.data as { hasConflicts?: boolean }).hasConflicts ? '#ef4444' : '#71717a'
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
          className="!bg-background/80 !backdrop-blur-sm !border rounded-lg"
        />
        <GraphControls />
      </ReactFlow>
    </div>
  )
}

export function ProblemGraphCanvas() {
  return (
    <ReactFlowProvider>
      <GraphCanvas />
    </ReactFlowProvider>
  )
}
