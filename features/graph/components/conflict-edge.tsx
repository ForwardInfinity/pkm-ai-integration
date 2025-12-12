'use client'

import { memo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type Position,
} from '@xyflow/react'
import { cn } from '@/lib/utils'
import { AlertTriangle } from 'lucide-react'
import type { ConflictEdgeData } from '../types'

type ConflictEdgeProps = {
  id: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition: Position
  targetPosition: Position
  data?: ConflictEdgeData
  selected?: boolean
}

function ConflictEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: ConflictEdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        className={cn(
          'transition-all duration-200',
          selected && '!stroke-destructive'
        )}
        style={{
          stroke: '#ef4444',
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: '8,4',
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          className={cn(
            'flex items-center justify-center',
            'w-5 h-5 rounded-full',
            'bg-destructive text-destructive-foreground',
            'shadow-sm'
          )}
          title={`Conflict: ${data?.conflictType || 'unknown'}`}
        >
          <AlertTriangle className="h-3 w-3" />
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export const ConflictEdge = memo(ConflictEdgeComponent)
