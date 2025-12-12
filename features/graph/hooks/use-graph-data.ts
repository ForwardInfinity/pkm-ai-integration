'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getGraphData } from '../actions'
import { transformToGraph, computeLayout } from '../lib'
import { graphKeys, type GraphData } from '../types'

interface UseGraphDataOptions {
  enabled?: boolean
}

export function useGraphData(options: UseGraphDataOptions = {}) {
  const { enabled = true } = options

  const query = useQuery({
    queryKey: graphKeys.data(),
    queryFn: async () => {
      const rawData = await getGraphData()
      return rawData
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  })

  const graphData: GraphData | null = useMemo(() => {
    if (!query.data) return null

    const { notes, conflicts } = query.data

    // Transform raw data to graph nodes and edges
    const { nodes, edges } = transformToGraph(notes, conflicts)

    // Compute layout positions using d3-force
    const layoutedNodes = computeLayout(nodes, edges)

    return { nodes: layoutedNodes, edges }
  }, [query.data])

  return {
    ...query,
    graphData,
    noteCount: query.data?.notes.length ?? 0,
    conflictCount: query.data?.conflicts.length ?? 0,
  }
}
