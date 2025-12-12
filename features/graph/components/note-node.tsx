'use client'

import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { Pin, AlertTriangle } from 'lucide-react'
import type { NoteNode as NoteNodeType } from '../types'

type NoteNodeProps = {
  data: NoteNodeType['data']
  selected?: boolean
}

function NoteNodeComponent({ data, selected }: NoteNodeProps) {
  const { title, isPinned, hasConflicts } = data

  return (
    <div
      className={cn(
        'relative flex items-center gap-2',
        'min-w-[100px] max-w-[180px] px-3 py-2 rounded-lg',
        'border bg-card shadow-sm transition-all duration-200',
        'hover:shadow-md hover:border-primary/50',
        hasConflicts && 'border-destructive/50',
        selected && 'ring-2 ring-primary ring-offset-1 ring-offset-background'
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-muted-foreground !w-1.5 !h-1.5 !border-0"
      />

      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {isPinned && (
          <Pin className="h-3 w-3 text-primary flex-shrink-0" />
        )}
        {hasConflicts && (
          <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />
        )}
        <p
          className="text-xs font-medium leading-tight truncate"
          title={title}
        >
          {title}
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-muted-foreground !w-1.5 !h-1.5 !border-0"
      />
    </div>
  )
}

export const NoteNode = memo(NoteNodeComponent)
