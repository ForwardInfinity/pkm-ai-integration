'use client'

import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { cn } from '@/lib/utils'
import type { ProblemNode as ProblemNodeType } from '../types'

type ProblemNodeProps = {
  data: ProblemNodeType['data']
  selected?: boolean
}

function ProblemNodeComponent({ data, selected }: ProblemNodeProps) {
  const { label, noteCount, isOrphan } = data

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center',
        'min-w-[120px] max-w-[200px] px-4 py-3 rounded-xl',
        'border-2 shadow-lg transition-all duration-200',
        isOrphan
          ? 'bg-muted/50 border-muted-foreground/30 text-muted-foreground'
          : 'bg-primary/10 border-primary text-primary-foreground',
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
    >
      <Handle
        type="source"
        position={Position.Top}
        className="!bg-primary !w-2 !h-2 !border-0"
      />

      <div className="text-center">
        <p
          className={cn(
            'text-sm font-semibold leading-tight line-clamp-3',
            isOrphan ? 'text-muted-foreground italic' : 'text-foreground'
          )}
          title={label}
        >
          {label}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {noteCount} {noteCount === 1 ? 'note' : 'notes'}
        </p>
      </div>

      <Handle
        type="target"
        position={Position.Bottom}
        className="!bg-primary !w-2 !h-2 !border-0"
      />
    </div>
  )
}

export const ProblemNode = memo(ProblemNodeComponent)
