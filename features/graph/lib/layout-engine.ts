import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
  forceX,
  forceY,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force'
import type { GraphNodeType, GraphEdgeType } from '../types'

interface LayoutNode extends SimulationNodeDatum {
  id: string
  type: 'note' | 'problem'
  clusterId: string
  x: number
  y: number
}

interface LayoutLink extends SimulationLinkDatum<LayoutNode> {
  source: string | LayoutNode
  target: string | LayoutNode
}

interface ClusterCenter {
  x: number
  y: number
}

const LAYOUT_CONFIG = {
  width: 1200,
  height: 800,
  problemNodeRadius: 40,
  noteNodeRadius: 20,
  clusterPadding: 100,
  noteSpacing: 60,
  chargeStrength: -150,
  linkDistance: 80,
  clusterStrength: 0.3,
  iterations: 300,
}

function calculateClusterCenters(
  clusters: Map<string, string[]>,
  width: number,
  height: number
): Map<string, ClusterCenter> {
  const centers = new Map<string, ClusterCenter>()
  const clusterIds = Array.from(clusters.keys())
  const count = clusterIds.length

  if (count === 0) return centers

  // Arrange clusters in a grid-like pattern
  const cols = Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / cols)
  const cellWidth = width / (cols + 1)
  const cellHeight = height / (rows + 1)

  clusterIds.forEach((clusterId, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    centers.set(clusterId, {
      x: (col + 1) * cellWidth,
      y: (row + 1) * cellHeight,
    })
  })

  return centers
}

function clusterForce(
  clusterCenters: Map<string, ClusterCenter>,
  strength: number
) {
  let nodes: LayoutNode[] = []

  function force(alpha: number) {
    for (const node of nodes) {
      if (node.type === 'problem') {
        // Problem nodes stay at their assigned cluster center
        const center = clusterCenters.get(node.id)
        if (center) {
          node.x += (center.x - node.x) * alpha * strength * 2
          node.y += (center.y - node.y) * alpha * strength * 2
        }
      } else {
        // Note nodes are pulled toward their cluster's problem node
        const center = clusterCenters.get(node.clusterId)
        if (center) {
          node.x += (center.x - node.x) * alpha * strength
          node.y += (center.y - node.y) * alpha * strength
        }
      }
    }
  }

  force.initialize = (n: LayoutNode[]) => {
    nodes = n
  }

  return force
}

export function computeLayout(
  nodes: GraphNodeType[],
  edges: GraphEdgeType[],
  options: Partial<typeof LAYOUT_CONFIG> = {}
): GraphNodeType[] {
  const config = { ...LAYOUT_CONFIG, ...options }

  // Group notes by cluster
  const clusters = new Map<string, string[]>()
  for (const node of nodes) {
    if (node.type === 'problem') {
      if (!clusters.has(node.id)) {
        clusters.set(node.id, [])
      }
    } else if (node.type === 'note') {
      const clusterId = node.data.clusterId
      if (!clusters.has(clusterId)) {
        clusters.set(clusterId, [])
      }
      clusters.get(clusterId)!.push(node.id)
    }
  }

  // Calculate cluster centers
  const clusterCenters = calculateClusterCenters(
    clusters,
    config.width,
    config.height
  )

  // Convert to layout nodes
  const layoutNodes: LayoutNode[] = nodes.map((node) => {
    const center = node.type === 'problem'
      ? clusterCenters.get(node.id)
      : clusterCenters.get(node.data.clusterId)

    return {
      id: node.id,
      type: node.type,
      clusterId: node.type === 'problem' ? node.id : node.data.clusterId,
      x: center?.x ?? config.width / 2,
      y: center?.y ?? config.height / 2,
    }
  })

  // Convert edges to links (only conflict edges)
  const layoutLinks: LayoutLink[] = edges
    .filter((edge) => edge.type === 'conflict')
    .map((edge) => ({
      source: edge.source,
      target: edge.target,
    }))

  // Create simulation
  const simulation: Simulation<LayoutNode, LayoutLink> = forceSimulation(layoutNodes)
    .force('cluster', clusterForce(clusterCenters, config.clusterStrength))
    .force(
      'charge',
      forceManyBody<LayoutNode>()
        .strength((d) => (d.type === 'problem' ? config.chargeStrength * 2 : config.chargeStrength))
    )
    .force(
      'collide',
      forceCollide<LayoutNode>()
        .radius((d) => (d.type === 'problem' ? config.problemNodeRadius : config.noteNodeRadius))
        .strength(0.8)
    )
    .force('centerX', forceX(config.width / 2).strength(0.02))
    .force('centerY', forceY(config.height / 2).strength(0.02))

  // Add link force only if there are links
  if (layoutLinks.length > 0) {
    simulation.force(
      'link',
      forceLink<LayoutNode, LayoutLink>(layoutLinks)
        .id((d) => d.id)
        .distance(config.linkDistance)
        .strength(0.3)
    )
  }

  // Run simulation synchronously
  simulation.stop()
  for (let i = 0; i < config.iterations; i++) {
    simulation.tick()
  }

  // Create node map for quick lookup
  const nodePositions = new Map<string, { x: number; y: number }>()
  for (const node of layoutNodes) {
    nodePositions.set(node.id, { x: node.x, y: node.y })
  }

  // Apply positions to original nodes
  return nodes.map((node) => {
    const pos = nodePositions.get(node.id)
    return {
      ...node,
      position: pos ? { x: pos.x, y: pos.y } : node.position,
    }
  })
}

export { LAYOUT_CONFIG }
