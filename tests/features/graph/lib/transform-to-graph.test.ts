import { describe, it, expect } from 'vitest'
import {
  transformToGraph,
  buildClusters,
  getClusterIdForNote,
  ORPHAN_CLUSTER_ID,
  ORPHAN_CLUSTER_LABEL,
} from '@/features/graph/lib/transform-to-graph'
import type { GraphNoteData, GraphConflictData } from '@/features/graph/types'

describe('transform-to-graph', () => {
  const createNote = (
    id: string,
    title: string,
    problem: string | null = null
  ): GraphNoteData => ({
    id,
    title,
    problem,
    is_pinned: false,
    has_embedding: true,
  })

  const createConflict = (
    id: string,
    noteAId: string,
    noteBId: string
  ): GraphConflictData => ({
    id,
    note_a_id: noteAId,
    note_b_id: noteBId,
    conflict_type: 'contradiction',
  })

  describe('buildClusters', () => {
    it('should group notes by problem', () => {
      const notes: GraphNoteData[] = [
        createNote('1', 'Note 1', 'How to improve code quality?'),
        createNote('2', 'Note 2', 'How to improve code quality?'),
        createNote('3', 'Note 3', 'What is testing?'),
      ]

      const clusters = buildClusters(notes)

      expect(clusters.size).toBe(2)

      const codeQualityCluster = Array.from(clusters.values()).find(
        (c) => c.label === 'How to improve code quality?'
      )
      expect(codeQualityCluster?.noteIds).toHaveLength(2)
      expect(codeQualityCluster?.noteIds).toContain('1')
      expect(codeQualityCluster?.noteIds).toContain('2')
    })

    it('should create orphan cluster for notes without problems', () => {
      const notes: GraphNoteData[] = [
        createNote('1', 'Note 1', null),
        createNote('2', 'Note 2', null),
        createNote('3', 'Note 3', 'Some problem'),
      ]

      const clusters = buildClusters(notes)

      const orphanCluster = clusters.get(ORPHAN_CLUSTER_ID)
      expect(orphanCluster).toBeDefined()
      expect(orphanCluster?.label).toBe(ORPHAN_CLUSTER_LABEL)
      expect(orphanCluster?.noteIds).toHaveLength(2)
      expect(orphanCluster?.isOrphan).toBe(true)
    })

    it('should handle case-insensitive problem matching', () => {
      const notes: GraphNoteData[] = [
        createNote('1', 'Note 1', 'How to test?'),
        createNote('2', 'Note 2', 'how to test?'),
        createNote('3', 'Note 3', 'HOW TO TEST?'),
      ]

      const clusters = buildClusters(notes)

      // All should be in the same cluster due to case-insensitive matching
      expect(clusters.size).toBe(1)
      const cluster = Array.from(clusters.values())[0]
      expect(cluster.noteIds).toHaveLength(3)
    })
  })

  describe('getClusterIdForNote', () => {
    it('should return ORPHAN_CLUSTER_ID for null problem', () => {
      expect(getClusterIdForNote(null)).toBe(ORPHAN_CLUSTER_ID)
    })

    it('should return consistent cluster ID for same problem', () => {
      const problem = 'How to improve testing?'
      const id1 = getClusterIdForNote(problem)
      const id2 = getClusterIdForNote(problem)
      expect(id1).toBe(id2)
    })

    it('should return different cluster IDs for different problems', () => {
      const id1 = getClusterIdForNote('Problem A')
      const id2 = getClusterIdForNote('Problem B')
      expect(id1).not.toBe(id2)
    })
  })

  describe('transformToGraph', () => {
    it('should create problem nodes for each unique problem', () => {
      const notes: GraphNoteData[] = [
        createNote('1', 'Note 1', 'Problem A'),
        createNote('2', 'Note 2', 'Problem A'),
        createNote('3', 'Note 3', 'Problem B'),
      ]

      const { nodes } = transformToGraph(notes, [])

      const problemNodes = nodes.filter((n) => n.type === 'problem')
      expect(problemNodes).toHaveLength(2)
    })

    it('should create note nodes for each note', () => {
      const notes: GraphNoteData[] = [
        createNote('1', 'Note 1', 'Problem A'),
        createNote('2', 'Note 2', 'Problem B'),
      ]

      const { nodes } = transformToGraph(notes, [])

      const noteNodes = nodes.filter((n) => n.type === 'note')
      expect(noteNodes).toHaveLength(2)
    })

    it('should create conflict edges', () => {
      const notes: GraphNoteData[] = [
        createNote('1', 'Note 1', 'Problem'),
        createNote('2', 'Note 2', 'Problem'),
      ]
      const conflicts: GraphConflictData[] = [createConflict('c1', '1', '2')]

      const { edges } = transformToGraph(notes, conflicts)

      expect(edges).toHaveLength(1)
      expect(edges[0].type).toBe('conflict')
      expect(edges[0].source).toBe('1')
      expect(edges[0].target).toBe('2')
    })

    it('should mark notes with conflicts', () => {
      const notes: GraphNoteData[] = [
        createNote('1', 'Note 1', 'Problem'),
        createNote('2', 'Note 2', 'Problem'),
        createNote('3', 'Note 3', 'Problem'),
      ]
      const conflicts: GraphConflictData[] = [createConflict('c1', '1', '2')]

      const { nodes } = transformToGraph(notes, conflicts)

      const noteNodes = nodes.filter((n) => n.type === 'note')
      const note1 = noteNodes.find((n) => n.id === '1')
      const note2 = noteNodes.find((n) => n.id === '2')
      const note3 = noteNodes.find((n) => n.id === '3')

      expect(note1?.data.hasConflicts).toBe(true)
      expect(note2?.data.hasConflicts).toBe(true)
      expect(note3?.data.hasConflicts).toBe(false)
    })

    it('should handle empty input', () => {
      const { nodes, edges } = transformToGraph([], [])

      expect(nodes).toHaveLength(0)
      expect(edges).toHaveLength(0)
    })

    it('should assign correct cluster IDs to note nodes', () => {
      const notes: GraphNoteData[] = [
        createNote('1', 'Note 1', 'Problem A'),
        createNote('2', 'Note 2', 'Problem B'),
      ]

      const { nodes } = transformToGraph(notes, [])

      const noteNodes = nodes.filter((n) => n.type === 'note')
      const note1 = noteNodes.find((n) => n.id === '1')
      const note2 = noteNodes.find((n) => n.id === '2')

      expect(note1?.data.clusterId).toBe(getClusterIdForNote('Problem A'))
      expect(note2?.data.clusterId).toBe(getClusterIdForNote('Problem B'))
    })
  })
})
